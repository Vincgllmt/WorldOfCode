#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Étage d'audit — l'amont de l'usine.
#
#  Un agent lit un périmètre du code, y cherche des défauts, et **ouvre des
#  tickets GitLab**. Il ne corrige rien : c'est l'usine qui traitera ensuite les
#  tickets qu'il aura posés.
#
#  Pourquoi cet étage existe : sans lui, la file de l'usine se remplit à la main,
#  ticket par ticket. C'est le goulot. Un audit découpé en périmètres permet de
#  couvrir l'app entière sans qu'aucune session n'ait à tout tenir en contexte.
#
#  Le découpage n'est pas cosmétique : demander « audite l'app TV » à un seul
#  agent produit des généralités. Demander « audite ces trois écrans » produit
#  des `fichier:ligne`.
#
#  Usage :
#    ./audit.sh                    # tous les périmètres définis ci-dessous
#    ./audit.sh app-tv/downloads   # un seul
#    ./audit.sh --dry-run          # audite, n'ouvre aucun ticket
#    ./audit.sh --list             # liste les périmètres
# ---------------------------------------------------------------------------
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

DRY_RUN=0; CIBLES=()
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    --list)    LISTER=1 ;;
    -h|--help) sed -n '/^#  Usage :/,/^# ---/p' "$0" | sed 's/^#\s\?//; $d'; exit 0 ;;
    *)         CIBLES+=("$a") ;;
  esac
done

# --- Les périmètres -------------------------------------------------------
#
# Un périmètre = ce qu'un agent peut lire attentivement en une session. Trop
# large, il survole et rend des généralités ; trop étroit, il manque les
# duplications entre écrans. Un écran et ses voisins immédiats est la bonne
# maille sur ce projet.
declare -A PERIMETRES=(
  [app-tv/downloads]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/downloads"
  [app-tv/player]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/player"
  [app-tv/movies]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/movies"
  [app-tv/series]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series"
  [app-tv/home]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home"
  [app-tv/setup]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/setup"
  [app-tv/purchase]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/purchase"
  [app-tv/navigation]="app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/navigation app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/common"
  [app-mobile/player]="app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/player"
  [app-mobile/downloads]="app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/downloads app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/mylist"
  [app-mobile/detail]="app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/moviedetail app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/seriesdetail"
  [app-mobile/catalog]="app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/movies app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/series app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/home"
  [app-mobile/shell]="app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/main app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/common app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/navigation"
  [app-mobile/setup]="app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/setup app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/purchase"
  [core/data]="core/src/main/kotlin/com/purple/iptvplayer/core/data"
  [core/player]="core/src/main/kotlin/com/purple/iptvplayer/core/player core/src/main/kotlin/com/purple/iptvplayer/core/epg"
  [core/network]="core/src/main/kotlin/com/purple/iptvplayer/core/network"
  [core/viewmodel]="core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel"
)
# L'ordre compte : `core` d'abord, car un défaut de logique métier y touche les
# deux UI, et le savoir tôt évite d'ouvrir dans les UI des tickets qui n'en sont
# que le symptôme.
ORDRE=(core/data core/player core/network core/viewmodel
       app-tv/downloads app-tv/player app-tv/movies app-tv/series app-tv/home
       app-tv/setup app-tv/purchase app-tv/navigation
       app-mobile/player app-mobile/downloads app-mobile/detail
       app-mobile/catalog app-mobile/shell app-mobile/setup)

if [ "${LISTER:-0}" = 1 ]; then
  for p in "${ORDRE[@]}"; do printf '  %-22s %s\n' "$p" "${PERIMETRES[$p]}"; done
  exit 0
fi
[ ${#CIBLES[@]} -eq 0 ] && CIBLES=("${ORDRE[@]}")

acquire_lock
RUN_ID="$(date '+%Y%m%d-%H%M%S')"
exec > >(tee -a "$LOG_DIR/audit-$RUN_ID.log") 2>&1

command -v glab >/dev/null 2>&1 || die "glab introuvable."
glab auth status >/dev/null 2>&1 || die "glab non authentifié (voir factory/.env)."

log_step "Audit $RUN_ID — ${#CIBLES[@]} périmètre(s)"

# Les tickets déjà ouverts, pour que l'auditeur ne les redouble pas.
existants="$(glab issue list --opened -P 100 --output json 2>/dev/null \
  | jq -r '.[] | "- #\(.iid) \(.title)"' 2>/dev/null || echo "(aucun)")"
[ -z "$existants" ] && existants="(aucun ticket ouvert)"

total_defauts=0; total_tickets=0

# File de travail, et non `for` sur un tableau : bash fige la liste au démarrage
# d'un `for`, donc un `CIBLES+=(...)` en cours de boucle ne remet rien en file.
# C'est ce qui a fait passer 13 périmètres à la trappe le 2026-08-25 — ils
# auraient dû être rejoués après le réarmement du quota.
FILE=("${CIBLES[@]}")
while [ ${#FILE[@]} -gt 0 ]; do
  cible="${FILE[0]}"; FILE=("${FILE[@]:1}")
  chemins="${PERIMETRES[$cible]:-}"
  [ -n "$chemins" ] || { log_warn "Périmètre inconnu : $cible"; continue; }

  # Un périmètre sans code est un périmètre mal décrit — on le dit.
  reels=""
  for c in $chemins; do [ -d "$NATIVE_DIR/$c" ] && reels="$reels $NATIVE_DIR/$c"; done
  if [ -z "$reels" ]; then log_warn "$cible : aucun de ces chemins n'existe."; continue; fi

  log_step "Audit de $cible"
  log "$(find $reels -name '*.kt' 2>/dev/null | wc -l) fichier(s), $(cat $(find $reels -name '*.kt' 2>/dev/null) 2>/dev/null | wc -l) lignes"

  portee="Le périmètre est **$cible**, soit :
$(for c in $chemins; do echo "  - \`cluster/iptv/native/$c\`"; done)"

  prompt="$(rendre_prompt "$FACTORY_DIR/prompts/auditor.md" \
              PORTEE "$portee" PROJET "$PROJECT_DIR" EXISTANTS "$existants")"

  json="$STATE_DIR/audit-$(echo "$cible" | tr / -).json"
  args=(-p "$prompt" --output-format json --permission-mode bypassPermissions
        --add-dir "$PROJECT_DIR"
        # L'auditeur ne corrige RIEN : ni édition, ni git, ni glab. Le seul
        # moyen d'être sûr qu'il n'écrit pas, c'est de le lui interdire.
        --disallowedTools "Edit" "Write" "NotebookEdit" "Bash(git *)" "Bash(glab *)")
  [ -n "$FACTORY_MODEL" ]  && args+=(--model "$FACTORY_MODEL")
  [ -n "$FACTORY_EFFORT" ] && args+=(--effort "$FACTORY_EFFORT")

  code=0
  ( cd "$PROJECT_DIR" && timeout --signal=TERM --kill-after=60 "$FACTORY_WORKER_TIMEOUT" \
      claude "${args[@]}" ) > "$json" 2>"$STATE_DIR/audit.err" || code=$?

  sortie="$(cat "$json" "$STATE_DIR/audit.err" 2>/dev/null)"

  # Limite d'usage : on attend le réarmement ANNONCÉ, et on REMET le périmètre
  # en tête de file. Surtout pas « 0 défaut » : un quota rend un résultat vide
  # qui ressemble à un succès.
  if est_limite_quota "$sortie"; then
    attendre_reset "$sortie"
    FILE=("$cible" "${FILE[@]}")
    continue
  fi
  if ! jq -e . "$json" >/dev/null 2>&1; then
    log_err "$cible : sortie illisible — remis en file."
    FILE=("${FILE[@]}" "$cible"); continue
  fi
  # `is_error` vaut pour toute panne d'API : la traiter en « rien trouvé »
  # ferait silencieusement disparaître le périmètre de l'audit.
  if [ "$(jq -r '.is_error // false' "$json")" = "true" ]; then
    log_err "$cible : $(jq -r '.result // .terminal_reason // "erreur"' "$json" | head -c 200)"
    log_warn "  périmètre NON audité — remis en fin de file."
    FILE=("${FILE[@]}" "$cible"); continue
  fi

  cout="$(jq -r '.total_cost_usd // 0' "$json")"
  jq -r '.result // ""' "$json" > "$STATE_DIR/audit-rapport.txt"
  log "Audité — $(jq -r '.num_turns // 0' "$json") tours, \$$cout"

  # --- Découpage du rapport en tickets ------------------------------------
  python3 - "$STATE_DIR/audit-rapport.txt" "$STATE_DIR/audit-tickets.json" "$cible" <<'PY'
import json, re, sys
brut = open(sys.argv[1], encoding="utf-8", errors="replace").read()
m = re.search(r"<<<AUDIT(.*?)AUDIT>>>", brut, re.S)
corps = m.group(1) if m else ""
tickets = []
for bloc in re.split(r"^---\s*$", corps, flags=re.M):
    champs = {}
    cle = None
    for ligne in bloc.splitlines():
        s = re.match(r"^(titre|gravite|preuve|symptome|cause|piste|verifiable):\s*(.*)$", ligne.strip())
        if s:
            cle = s.group(1); champs[cle] = s.group(2)
        elif cle and ligne.strip():
            champs[cle] += " " + ligne.strip()
    # Un ticket sans titre ni preuve n'est pas un ticket : c'est une opinion.
    if champs.get("titre") and champs.get("preuve"):
        champs["perimetre"] = sys.argv[3]
        tickets.append(champs)
json.dump(tickets, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
print(len(tickets))
PY
  n="$(jq 'length' "$STATE_DIR/audit-tickets.json" 2>/dev/null || echo 0)"
  total_defauts=$((total_defauts + n))
  log "$n défaut(s) retenu(s)."
  [ "$n" -eq 0 ] && continue

  # --- Ouverture des tickets ----------------------------------------------
  for i in $(seq 0 $((n - 1))); do
    titre="$(jq -r ".[$i].titre" "$STATE_DIR/audit-tickets.json")"
    grav="$(jq -r ".[$i].gravite // \"MAJEUR\"" "$STATE_DIR/audit-tickets.json")"
    verif="$(jq -r ".[$i].verifiable // \"TEST_JVM\"" "$STATE_DIR/audit-tickets.json")"

    desc="$STATE_DIR/desc.md"
    {
      printf '## Symptôme\n\n%s\n\n' "$(jq -r ".[$i].symptome // \"(non décrit)\"" "$STATE_DIR/audit-tickets.json")"
      printf '## Preuve\n\n%s\n\n' "$(jq -r ".[$i].preuve" "$STATE_DIR/audit-tickets.json")"
      printf '## Cause\n\n%s\n\n' "$(jq -r ".[$i].cause // \"cause à établir\"" "$STATE_DIR/audit-tickets.json")"
      printf '## Piste de correction\n\n%s\n\n' "$(jq -r ".[$i].piste // \"(à définir)\"" "$STATE_DIR/audit-tickets.json")"
      printf '## Comment le prouver\n\n'
      case "$verif" in
        ECRAN)     printf 'Ce défaut est **invisible aux tests JVM**. Il exige un test instrumenté dans `app-tv/src/androidTest/` (ou `app-mobile`), exécuté sur appareil.\n\n⚠️ Émulateur : `-gpu swiftshader_indirect` (`-gpu host` est refusé sous Wayland).\n' ;;
        LES_DEUX)  printf 'Prouvable en partie par test JVM (la logique) et en partie par test instrumenté (le rendu).\n' ;;
        *)         printf 'Prouvable par test JVM dans `core/src/test/` ou `app-tv/src/test/`.\n' ;;
      esac
      printf '\n---\n_Relevé par l'"'"'étage d'"'"'audit sur le périmètre `%s`. Gravité annoncée : **%s**._\n' "$cible" "$grav"
    } > "$desc"

    if [ "$DRY_RUN" = 1 ]; then
      log "  [dry-run] $grav — $titre"
      continue
    fi
    url="$(glab issue create --title "$titre" --description "$(cat "$desc")" \
            --label ai-factory --assignee "$FACTORY_ASSIGNEE" --yes 2>&1 \
            | grep -oE 'https://\S+' | head -1)"
    if [ -n "$url" ]; then
      log_ok "  #$(basename "$url") $grav — $titre"
      total_tickets=$((total_tickets + 1))
    else
      log_err "  échec d'ouverture : $titre"
    fi
  done
done

log_step "Audit terminé — $total_defauts défaut(s), $total_tickets ticket(s) ouvert(s)"
[ "$DRY_RUN" = 1 ] && log_warn "--dry-run : aucun ticket n'a été créé."
