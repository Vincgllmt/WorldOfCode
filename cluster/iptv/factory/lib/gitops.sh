#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Étape 4 — Clôture du cycle : branche, commit, push, Merge Request.
#
#  Tout ce qui touche à git vit ICI, et nulle part ailleurs. Le worker éphémère
#  n'a pas le droit d'y toucher : c'est ce qui garantit que le lien de MR posté
#  sur le ticket désigne le travail réellement validé par Gradle, et non celui
#  qu'un agent croit avoir fait.
# ---------------------------------------------------------------------------

# Nom de branche à partir d'un iid et d'un titre.
branch_name() {
  local iid="$1" titre="$2" slug
  slug="$(printf '%s' "$titre" \
    | iconv -f utf8 -t ascii//TRANSLIT 2>/dev/null || printf '%s' "$titre")"
  slug="$(printf '%s' "$slug" | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-40)"
  printf 'ai/issue-%s-%s' "$iid" "${slug:-sans-titre}"
}

# Prépare la branche AVANT de lancer le worker.
#
# L'ordre compte : si le worker plante ou dépasse son temps, le travail partiel
# reste sur une branche nommée, inspectable, au lieu de polluer la branche de
# travail.
#
# ⚠️ On branche depuis le **HEAD LOCAL**, jamais depuis `origin/`. Sur ce dépôt,
# la branche locale était 3 commits en avance sur origin (préparation des
# releases 1.2.0 / 1.3.0, non poussée). Brancher sur origin ferait travailler
# l'usine sur du code périmé, et sa MR aurait l'air d'annuler ces trois commits.
#
# Le cas inverse — origin en avance sur le local — est en revanche bloquant :
# l'usine produirait une MR en conflit. On s'arrête et on laisse l'utilisateur
# décider comment intégrer, plutôt que de fusionner à sa place.
gitops_prepare_branch() {
  local branche="$1"
  git -C "$REPO_DIR" fetch --quiet origin "$FACTORY_BRANCH" 2>/dev/null || \
    log_warn "fetch impossible — on part de l'état local."

  local retard=0
  if git -C "$REPO_DIR" rev-parse --verify --quiet "origin/$FACTORY_BRANCH" >/dev/null; then
    retard="$(git -C "$REPO_DIR" rev-list --count "$FACTORY_BRANCH..origin/$FACTORY_BRANCH")"
    local avance
    avance="$(git -C "$REPO_DIR" rev-list --count "origin/$FACTORY_BRANCH..$FACTORY_BRANCH")"
    [ "$avance" -gt 0 ] && log "Local en avance de $avance commit(s) sur origin — c'est cette base qui est utilisée."
  fi
  if [ "$retard" -gt 0 ]; then
    log_err "origin/$FACTORY_BRANCH est en avance de $retard commit(s) sur le local."
    die "Intégrer d'abord (« git pull --rebase origin $FACTORY_BRANCH »)."
  fi

  git -C "$REPO_DIR" checkout --quiet -B "$branche" "$FACTORY_BRANCH"
  log "Branche préparée : $branche (depuis $FACTORY_BRANCH local, $(git -C "$REPO_DIR" rev-parse --short "$FACTORY_BRANCH"))"
}

# Retour à la branche de travail, en abandonnant tout ce qui traîne.
gitops_abandon() {
  local branche="$1"
  git -C "$REPO_DIR" checkout --quiet -- "$PROJECT_DIR/native" 2>/dev/null || true
  git -C "$REPO_DIR" clean -qfd -- "$PROJECT_DIR/native" 2>/dev/null || true
  git -C "$REPO_DIR" checkout --quiet "$FACTORY_BRANCH" 2>/dev/null || true
  [ -n "${branche:-}" ] && git -C "$REPO_DIR" branch -qD "$branche" 2>/dev/null || true
}

# Liste les fichiers réellement modifiés sous native/, artefacts EXCLUS.
#
# ⚠️ Ce dépôt SUIT ses propres artefacts de build (`native/.gradle/`,
# `native/*/build/`, `native/.kotlin/`) — CLAUDE.md §7. Une simple exécution de
# ./gradlew en salit 279. Un `git add -A` transformerait donc une correction de
# trois lignes en diff de plusieurs milliers de fichiers binaires : illisible en
# revue, et source de conflits à chaque pull. D'où le filtre, et d'où le fait
# qu'on ne fasse JAMAIS d'ajout global.
gitops_changed_files() {
  # Portée : `native/` UNIQUEMENT, jamais `$PROJECT_DIR`.
  #
  # Bug trouvé au premier vrai run. Avec `$PROJECT_DIR` (= cluster/iptv/), la
  # liste ramenait CLAUDE.md, docs/JOURNAL.md, USER_PRIORITIES.md, ai_factory/
  # et… factory/ lui-même. Hors `--dry-run`, l'usine se serait committée
  # elle-même dans la MR du ticket, avec le fichier de priorités et des
  # modifications de documentation sans rapport.
  #
  # La portée doit coïncider avec ce que le worker a le droit d'écrire — et la
  # consigne lui interdit tout ce qui est hors de native/.
  git -C "$REPO_DIR" status --porcelain -- "$NATIVE_DIR" \
    | sed -E 's/^.{3}//' \
    | grep -vE '(/build/|/\.gradle/|/\.kotlin/|local\.properties|keystore\.properties)' \
    || true
}

# Commit + push. Rend 0 si quelque chose a été poussé.
gitops_commit_push() {
  local branche="$1" message="$2"; shift 2
  local fichiers=("$@")

  [ ${#fichiers[@]} -gt 0 ] || { log_err "Aucun fichier à committer."; return 1; }

  ( cd "$REPO_DIR" && git add -- "${fichiers[@]}" ) || return 1

  if git -C "$REPO_DIR" diff --cached --quiet; then
    log_err "Rien à committer : les fichiers sont identiques à HEAD."
    return 1
  fi

  git -C "$REPO_DIR" -c user.name='AI Factory' -c user.email='ai-factory@woc.local' \
      commit --quiet -m "$message" || return 1

  if ! git -C "$REPO_DIR" push --quiet --set-upstream origin "$branche" 2>"$STATE_DIR/push.err"; then
    log_err "Push refusé :"; sed 's/^/    /' "$STATE_DIR/push.err" >&2
    return 1
  fi

  log_ok "Poussé $branche ($(git -C "$REPO_DIR" rev-parse --short HEAD)), ${#fichiers[@]} fichier(s)."
}

# Ouvre la Merge Request. Écrit son URL sur la sortie standard.
#
# `--draft` quand le build n'est pas vert : la MR existe (le travail n'est pas
# perdu) mais elle annonce elle-même qu'elle n'est pas prête.
gitops_open_mr() {
  local branche="$1" titre="$2" corps="$3" brouillon="$4"

  # Réutiliser une MR déjà ouverte sur la même branche plutôt que d'échouer :
  # une usine relancée après un incident ne doit pas se casser là-dessus.
  local existante
  existante="$(glab mr list --source-branch "$branche" --opened --output json 2>/dev/null \
               | jq -r '.[0].web_url // empty')"
  if [ -n "$existante" ]; then
    log "MR déjà ouverte sur $branche — réutilisée."
    printf '%s\n' "$existante"; return 0
  fi

  local args=(mr create
    --source-branch "$branche"
    --target-branch "$FACTORY_BRANCH"
    --title "$titre"
    --description "$corps"
    --remove-source-branch
    --yes)
  [ "$brouillon" = "1" ] && args+=(--draft)

  local sortie
  if ! sortie="$(glab "${args[@]}" 2>&1)"; then
    log_err "glab mr create a échoué :"; sed 's/^/    /' <<< "$sortie" >&2
    return 1
  fi
  # glab imprime l'URL ; on la récupère où qu'elle soit dans sa sortie.
  grep -oE 'https?://[^[:space:]]+/merge_requests/[0-9]+' <<< "$sortie" | head -1
}

# Commente l'issue. Le lien de MR est ajouté PAR LE CODE, jamais laissé à la
# rédaction d'un agent : un compte rendu sans lien vers le travail produit est
# un compte rendu invérifiable.
gitops_comment_issue() {
  local iid="$1" corps="$2" mr="$3"
  local texte="$corps"
  [ -n "$mr" ] && texte="$texte

---
🔗 **Merge Request** : $mr

_Ouverte automatiquement par l'usine logicielle locale. **À relire avant fusion.**_"
  glab issue note "$iid" -m "$texte" >/dev/null 2>&1 \
    && log_ok "Commentaire posté sur #$iid." \
    || log_warn "Impossible de commenter #$iid."
}
