#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  USER_PRIORITIES.md — lecture et écriture.
#
#  Ce fichier appartient à l'utilisateur, pas à l'usine. D'où une grammaire
#  volontairement minimale :
#
#      - [ ] #12 — Titre de l'issue
#      - [x] #7 — Une tâche déjà livrée
#
#  Une seule ligne par tâche, l'ordre du fichier EST l'ordre de traitement.
#  Réordonner les lignes à la main est donc l'acte de repriorisation — c'est
#  tout l'intérêt du nom du fichier. Le détail de chaque issue vit sous la
#  ligne, en retrait, et n'est jamais interprété.
#
#  La synchronisation FUSIONNE au lieu d'écraser : sans cela, chaque `sync`
#  détruirait l'ordre choisi par l'utilisateur, et le fichier ne serait qu'un
#  miroir de GitLab — donc inutile.
# ---------------------------------------------------------------------------

# Motif d'une tâche à faire. `[[:space:]]*` en tête : l'utilisateur peut
# indenter sans rien casser.
QUEUE_TODO_RE='^[[:space:]]*-[[:space:]]*\[[[:space:]]\][[:space:]]*#([0-9]+)[[:space:]]*—[[:space:]]*(.*)$'

# Numéro (iid) de la première tâche non cochée, hors section « Bloqué ».
queue_next_iid() {
  awk '
    /^##[[:space:]]*Bloqu/  { bloque=1; next }
    /^##[[:space:]]/        { bloque=0 }
    bloque                  { next }
    match($0, /^[[:space:]]*-[[:space:]]*\[[[:space:]]\][[:space:]]*#[0-9]+/) {
      s = substr($0, RSTART, RLENGTH); sub(/^.*#/, "", s); print s; exit
    }
  ' "$PRIORITIES_FILE" 2>/dev/null
}

# Titre d'une tâche donnée.
queue_title_of() {
  local iid="$1"
  awk -v iid="#$iid" '
    /^[[:space:]]*-[[:space:]]*\[[[:space:]x]\][[:space:]]*#[0-9]+/ {
      n = $0; sub(/^[^#]*#/, "", n); sub(/[^0-9].*$/, "", n)
      if ("#" n == iid) { sub(/^[^—]*—[[:space:]]*/, ""); print; exit }
    }
  ' "$PRIORITIES_FILE" 2>/dev/null
}

# Corps (les lignes indentées sous la tâche) — c'est la description GitLab.
#
# ⚠️ La frontière entre deux tâches exige `#<chiffres>`, pas seulement `- [ ]`.
# Une description GitLab contient très souvent ses propres cases à cocher — les
# critères d'acceptation en sont faits. Avec un motif large, le corps est tronqué
# au premier critère, et le worker reçoit une issue amputée de la partie qui
# compte le plus. Constaté sur la première issue réelle synchronisée.
queue_body_of() {
  local iid="$1"
  awk -v iid="#$iid" '
    /^[[:space:]]*-[[:space:]]*\[[[:space:]x]\][[:space:]]*#[0-9]+/ {
      if (dans) exit
      n = $0; sub(/^[^#]*#/, "", n); sub(/[^0-9].*$/, "", n)
      dans = ("#" n == iid) ? 1 : 0
      next
    }
    dans && /^##[[:space:]]/ { exit }
    dans { print }
  ' "$PRIORITIES_FILE" 2>/dev/null | sed 's/^      //'
}

# Coche une tâche : `[ ]` -> `[x]`.
queue_mark_done() {
  local iid="$1"
  local tmp; tmp="$(mktemp)"
  # Même précaution que queue_body_of : `#<chiffres>` obligatoire, sinon une
  # case à cocher de la description pourrait être cochée à la place de la tâche.
  awk -v iid="#$iid" '
    /^[[:space:]]*-[[:space:]]*\[[[:space:]]\][[:space:]]*#[0-9]+/ {
      n = $0; sub(/^[^#]*#/, "", n); sub(/[^0-9].*$/, "", n)
      if ("#" n == iid) sub(/\[[[:space:]]\]/, "[x]")
    }
    { print }
  ' "$PRIORITIES_FILE" > "$tmp" && mv "$tmp" "$PRIORITIES_FILE"
}

# Déplace une tâche vers la section « Bloqué », avec le motif.
#
# Elle sort ainsi de la file sans disparaître : `queue_next_iid` ignore cette
# section, donc l'usine ne la reprend pas en boucle, mais elle reste visible.
#
# ⚠️ Le déplacement emporte la ligne de tâche ET son bloc de description
# indenté. Ne retirer que la ligne laisse la description orpheline sous la
# tâche précédente, où un lecteur l'attribue au mauvais ticket — constaté.
queue_mark_blocked() {
  local iid="$1" motif="$2"
  grep -qE "^[[:space:]]*-[[:space:]]*\[[[:space:]x]\][[:space:]]*#$iid[[:space:]]" "$PRIORITIES_FILE" || return 0

  local tmp; tmp="$(mktemp)"

  # Une seule passe : on retire le bloc de la file, et on le réémet sous
  # « Bloqué ». `emporte` reste vrai tant que les lignes sont indentées.
  awk -v iid="#$iid" -v motif="$motif" -v horodatage="$(date '+%Y-%m-%d %H:%M')" '
    # Ligne de tâche : est-ce la nôtre ?
    match($0, /^[[:space:]]*-[[:space:]]*\[[[:space:] x]\][[:space:]]*#[0-9]+/) {
      n = $0; sub(/^[^#]*#/, "", n); sub(/[^0-9].*$/, "", n)
      if ("#" n == iid) {
        emporte = 1
        # Réécrite décochée : une tâche bloquée reste à faire.
        ligne = $0; sub(/\[x\]/, "[ ]", ligne)
        bloc = ligne "\n      ⛔ " motif " (" horodatage ")\n"
        next
      }
      emporte = 0; print; next
    }
    # Description indentée : suit le sort de sa tâche.
    /^[[:space:]]+[^[:space:]]/ {
      if (emporte) { next }
      print; next
    }
    # En-tete de section : fin du bloc emporte.
    /^##[[:space:]]/ {
      emporte = 0
      if ($0 ~ /^##[[:space:]]*Bloqu/) { bloque_vue = 1; print; print ""; printf "%s", (bloc != "" ? bloc : ""); bloc = ""; next }
      print; next
    }
    { emporte = 0; print }
    END {
      # Pas de section « Bloqué » dans le fichier : on la crée.
      if (!bloque_vue && bloc != "") { print ""; print "## Bloqué"; print ""; printf "%s", bloc }
    }
  ' "$PRIORITIES_FILE" > "$tmp" && mv "$tmp" "$PRIORITIES_FILE"
}

# Nombre de tâches encore à traiter.
queue_pending_count() {
  queue_next_iid >/dev/null 2>&1 || return 0
  awk '
    /^##[[:space:]]*Bloqu/ { bloque=1; next }
    /^##[[:space:]]/       { bloque=0 }
    !bloque && /^[[:space:]]*-[[:space:]]*\[[[:space:]]\][[:space:]]*#[0-9]+/ { n++ }
    END { print n+0 }
  ' "$PRIORITIES_FILE" 2>/dev/null
}
