#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Étape 1 — Le pont GitOps.
#
#  Récupère par `glab` les issues ouvertes qui me sont assignées et les écrit
#  dans USER_PRIORITIES.md.
#
#  Le point important est la FUSION. Un `sync` qui écrase détruirait l'ordre
#  choisi à la main, et le fichier ne serait plus qu'un miroir de GitLab — donc
#  sans intérêt. Ici :
#
#    * les tâches déjà présentes gardent leur position ET leur case ;
#    * les nouvelles issues sont ajoutées à la fin de la file active ;
#    * les issues fermées côté GitLab sont retirées (sauf si déjà cochées :
#      c'est justement le travail livré, on n'efface pas la trace) ;
#    * la section « Bloqué » n'est jamais touchée.
#
#  Usage :  ./sync_gitlab.sh [--dry-run]
# ---------------------------------------------------------------------------
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
source "$FACTORY_DIR/lib/queue.sh"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

command -v glab >/dev/null 2>&1 || die "glab est introuvable. Installer glab puis « glab auth login »."
command -v jq   >/dev/null 2>&1 || die "jq est requis."
glab auth status >/dev/null 2>&1 || die "glab n'est pas authentifié — lancer « glab auth login »."

log_step "Synchronisation GitLab"

# --- Récupération ----------------------------------------------------------
# L'assigné est nommé (FACTORY_ASSIGNEE) plutôt que figé à `@me` : avec un
# jeton de PROJET, `@me` désigne le bot du projet et ne trouve aucun ticket.
# `-P 100` : une page suffit très largement ; au-delà, le problème n'est plus
# la synchronisation mais la priorisation.
args=(issue list --assignee="$FACTORY_ASSIGNEE" --opened -P 100 --output json)
[ -n "$FACTORY_LABEL" ] && args+=(--label "$FACTORY_LABEL")

brut="$STATE_DIR/issues.json"
if ! glab "${args[@]}" > "$brut" 2>"$STATE_DIR/glab.err"; then
  log_err "glab a échoué :"; sed 's/^/    /' "$STATE_DIR/glab.err" >&2
  exit 1
fi

# glab rend soit un tableau, soit `null` quand il n'y a rien.
if ! jq -e 'type == "array"' "$brut" >/dev/null 2>&1; then
  echo '[]' > "$brut"
fi

total="$(jq 'length' "$brut")"
log "$total issue(s) ouverte(s) assignée(s)."

# --- Fichier neuf si absent ------------------------------------------------
if [ ! -f "$PRIORITIES_FILE" ]; then
  cat > "$PRIORITIES_FILE" <<'ENTETE'
# Priorités — Purple IPTV

> **Ce fichier vous appartient.** L'usine (`factory/start_factory.sh`) traite les
> tâches **dans l'ordre où elles apparaissent ici** : réordonner les lignes est
> l'acte de repriorisation. Une ligne cochée `[x]` est livrée et ignorée.
>
> `factory/sync_gitlab.sh` fusionne — il ajoute et retire, il ne réordonne
> jamais. Vous pouvez donc éditer librement.

## File active

## Bloqué
ENTETE
  log "USER_PRIORITIES.md créé."
fi

# --- Fusion ----------------------------------------------------------------
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT

# 1. iids encore ouverts côté GitLab
ouverts="$(jq -r '.[].iid' "$brut" | sort -n)"

# 2. On rejoue le fichier ligne à ligne :
#    - dans la section « Bloqué » : recopie telle quelle, sans réfléchir ;
#    - une tâche cochée : conservée (c'est un historique de livraison) ;
#    - une tâche à faire dont l'issue est fermée : retirée, avec sa description ;
#    - sinon : conservée en place.
awk -v ouverts="$ouverts" '
  BEGIN { split(ouverts, t, "\n"); for (i in t) if (t[i] != "") vivant[t[i]] = 1 }
  /^##[[:space:]]*Bloqu/ { bloque = 1 }
  /^##[[:space:]]*File/  { bloque = 0 }
  bloque { print; next }

  # Ligne de tâche : décider de son sort, et mémoriser la décision pour les
  # lignes de description qui suivent.
  match($0, /^[[:space:]]*-[[:space:]]*\[[[:space:] x]\][[:space:]]*#[0-9]+/) {
    ligne = $0
    n = ligne; sub(/^[^#]*#/, "", n); sub(/[^0-9].*$/, "", n)
    cochee = (ligne ~ /\[x\]/)
    garder = (cochee || (n in vivant))
    vu[n] = 1
    if (garder) print
    next
  }
  # Description indentée : suit le sort de sa tâche.
  /^[[:space:]]+[^[:space:]-]/ { if (garder) print; next }
  { print }
  END { for (n in vu) printf "__VU__%s\n", n > "/dev/stderr" }
' "$PRIORITIES_FILE" > "$tmp" 2>"$STATE_DIR/vus.txt"

deja="$(sed -n 's/^__VU__//p' "$STATE_DIR/vus.txt" | sort -n)"

# 3. Ajouter les issues nouvelles, à la fin de la file active (donc en bas de
#    priorité : c'est à l'utilisateur de les remonter s'il le souhaite).
nouvelles=0
while read -r iid; do
  [ -n "$iid" ] || continue
  grep -qx "$iid" <<< "$deja" && continue
  bloc="$(jq -r --argjson i "$iid" '
    .[] | select(.iid == $i)
    | "- [ ] #\(.iid) — \(.title)\n      \(.web_url)\n      labels: \((.labels // []) | if length == 0 then "aucun" else join(", ") end)\n"
      + ((.description // "" | split("\n") | map("      " + .) | join("\n")))
  ' "$brut")"
  # Insérer juste avant la section « Bloqué », c'est-à-dire en fin de file.
  awk -v bloc="$bloc" '
    /^##[[:space:]]*Bloqu/ && !fait { print bloc; print ""; fait = 1 }
    { print }
    END { if (!fait) { print bloc } }
  ' "$tmp" > "$tmp.2" && mv "$tmp.2" "$tmp"
  nouvelles=$((nouvelles + 1))
  log "  + #$iid $(jq -r --argjson i "$iid" '.[] | select(.iid==$i) | .title' "$brut")"
done <<< "$ouverts"

if [ "$DRY_RUN" = 1 ]; then
  log_warn "--dry-run : rien n'est écrit. Aperçu :"
  diff -u "$PRIORITIES_FILE" "$tmp" || true
  exit 0
fi

mv "$tmp" "$PRIORITIES_FILE"
trap - EXIT

restantes="$(queue_pending_count)"
log_ok "USER_PRIORITIES.md à jour — $nouvelles nouvelle(s), $restantes tâche(s) en file."
