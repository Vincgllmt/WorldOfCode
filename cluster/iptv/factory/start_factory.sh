#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Étape 2 — L'orchestrateur.
#
#  Boucle : prend la première tâche de USER_PRIORITIES.md, prépare une branche,
#  lance une sous-session `claude -p` bornée, VÉRIFIE elle-même par Gradle, puis
#  livre (branche + MR + commentaire) ou met en quarantaine.
#
#  Trois principes structurent tout le fichier :
#
#  1. **On ne croit jamais le worker sur parole.** Il annonce « VERT » ; c'est
#     l'orchestrateur qui relance Gradle, et c'est ce verdict-là qui décide.
#     Un test qui ne peut pas échouer ne prouve rien (CLAUDE.md §8.3).
#  2. **Le rattrapage se fait en REPRENANT la session** (`--resume`), pas en
#     repartant à froid. L'agent sait déjà ce qu'il a essayé ; le lui refaire
#     découvrir coûte du quota pour rien.
#  3. **L'échec est un état de sortie, pas une boucle.** Après N tentatives on
#     met en quarantaine : la branche est poussée, une MR brouillon est ouverte,
#     la tâche sort de la file. Rien n'est perdu, rien n'est répété à l'infini.
#
#  Usage :
#    ./start_factory.sh                # tourne jusqu'à vider la file
#    ./start_factory.sh --once         # une seule tâche
#    ./start_factory.sh --dry-run      # tout sauf push / MR / commentaire
#    touch state/STOP                  # arrêt propre en fin de tâche courante
# ---------------------------------------------------------------------------
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
source "$FACTORY_DIR/lib/queue.sh"
source "$FACTORY_DIR/lib/gitops.sh"

UNE_SEULE=0; DRY_RUN=0
for a in "$@"; do
  case "$a" in
    --once)    UNE_SEULE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '/^#  Usage :/,/^# ---/p' "$0" | sed 's/^#\s\?//; $d'; exit 0 ;;
    *) die "Option inconnue : $a" ;;
  esac
done

RUN_ID="$(date '+%Y%m%d-%H%M%S')"
exec > >(tee -a "$LOG_DIR/factory-$RUN_ID.log") 2>&1

acquire_lock
trap 'log_warn "Interruption — retour sur '"$FACTORY_BRANCH"'."; gitops_abandon "${BRANCHE:-}"; exit 130' INT TERM

log_step "Usine logicielle Purple IPTV — run $RUN_ID"
preflight
[ "$DRY_RUN" = 1 ] && log_warn "--dry-run : ni push, ni MR, ni commentaire."

# ---------------------------------------------------------------------------
#  Quota Pro : attendre, jamais abandonner
# ---------------------------------------------------------------------------
# Une limite d'usage n'est pas un échec de la tâche : c'est une pause. On dort
# par tranches, en journalisant chacune — dans un log, un processus muet et un
# processus planté se ressemblent trop.
est_limite_quota() {
  grep -qiE 'usage limit|rate.?limit|quota|too many requests|resets? at' <<< "$1"
}

dormir_par_tranches() {
  local total="$1" reste="$total"
  while [ "$reste" -gt 0 ]; do
    local part=$(( reste < FACTORY_QUOTA_SLICE ? reste : FACTORY_QUOTA_SLICE ))
    log_warn "Quota atteint — pause de $((part / 60)) min (reste $((reste / 60)) min)."
    sleep "$part"
    reste=$(( reste - part ))
  done
}

# ---------------------------------------------------------------------------
#  Le worker éphémère
# ---------------------------------------------------------------------------
# `claude` 2.1.241 n'a pas de --max-turns : la seule borne disponible est
# murale, d'où le `timeout`. `--output-format json` donne is_error et surtout
# session_id, qui permet la reprise.
#
# Écrit le session_id dans $SESSION_FILE. Rend 0 si la session s'est terminée
# proprement (ce qui ne dit RIEN de la qualité du code : c'est Gradle qui juge).
SESSION_FILE="$STATE_DIR/session_id"

lancer_worker() {
  local prompt="$1" reprise="${2:-}"
  local json="$STATE_DIR/worker.json"

  # `bypassPermissions` et non `acceptEdits`.
  #
  # Appris au premier vrai run : `acceptEdits` n'auto-approuve que les ÉDITIONS.
  # Bash restait soumis à approbation — impossible dans une session `-p` non
  # interactive, donc refusé. Le worker n'a jamais pu lancer `./gradlew`, et
  # toute la boucle « corrige-toi jusqu'au vert » était inopérante : il ne
  # pouvait que lire et écrire, jamais mesurer.
  #
  # Le garde-fou n'est PAS le mode de permission, c'est la liste de refus
  # ci-dessous — elle reste prioritaire sur `bypassPermissions`. Le worker peut
  # compiler et tester ; il ne peut toujours pas toucher à git ni à glab, et
  # l'orchestrateur revérifie tout derrière lui.
  local args=(-p "$prompt"
    --output-format json
    --permission-mode bypassPermissions
    --add-dir "$PROJECT_DIR"
    --disallowedTools "Bash(git commit*)" "Bash(git push*)" "Bash(git checkout*)"
                      "Bash(git branch*)" "Bash(git add*)" "Bash(git reset*)"
                      "Bash(glab *)")
  [ -n "$FACTORY_MODEL" ]  && args+=(--model "$FACTORY_MODEL")
  [ -n "$FACTORY_EFFORT" ] && args+=(--effort "$FACTORY_EFFORT")
  [ -n "$reprise" ] && args+=(--resume "$reprise")

  local code=0
  ( cd "$PROJECT_DIR" && timeout --signal=TERM --kill-after=60 \
      "$FACTORY_WORKER_TIMEOUT" claude "${args[@]}" ) > "$json" 2>"$STATE_DIR/worker.err" || code=$?

  if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then
    log_err "Worker dépassé (${FACTORY_WORKER_TIMEOUT}s) — tué."
    return 124
  fi

  # Limite d'usage : on attend et on redemande, ce n'est pas un échec.
  local texte; texte="$(cat "$json" "$STATE_DIR/worker.err" 2>/dev/null)"
  if [ "$code" -ne 0 ] && est_limite_quota "$texte"; then
    dormir_par_tranches "$FACTORY_QUOTA_SLICE"
    return 75          # EX_TEMPFAIL : à retenter sans consommer de tentative
  fi

  if ! jq -e . "$json" >/dev/null 2>&1; then
    log_err "Sortie du worker illisible :"; head -c 500 "$json" >&2; echo >&2
    return 1
  fi

  jq -r '.session_id // empty' "$json" > "$SESSION_FILE"
  jq -r '.result // ""' "$json" > "$STATE_DIR/worker_report.txt"

  local cout tours
  cout="$(jq -r '.total_cost_usd // 0' "$json")"
  tours="$(jq -r '.num_turns // 0' "$json")"
  log "Worker terminé — $tours tour(s), \$$cout, session $(cat "$SESSION_FILE")"

  [ "$(jq -r '.is_error' "$json")" = "false" ]
}

# Rend un fichier de consigne en substituant {{CLE}} par sa valeur.
#
# ⚠️ L'échappement de « & » n'est pas facultatif. Dans `${var//motif/valeur}`,
# **bash 5.2 traite `&` comme sed** : il le remplace par le texte trouvé. Un
# titre d'issue tout à fait ordinaire — « Basculer VF & VOSTFR » — produirait
# donc « Basculer VF {{TITRE}} VOSTFR » dans le prompt du worker. Silencieux,
# et découvert en testant un titre piégé plutôt qu'un titre poli.
# (Vérifié sur bash 5.2.21 ; `sed` a exactement le même piège, changer d'outil
# ne l'évite pas.)
rendre_prompt() {
  local fichier="$1"; shift
  local rendu; rendu="$(cat "$fichier")"
  while [ $# -ge 2 ]; do
    local cle="$1" val="$2"; shift 2
    rendu="${rendu//\{\{$cle\}\}/${val//&/\\&}}"
  done
  printf '%s' "$rendu"
}

# Extrait un champ du bloc <<<RAPPORT … RAPPORT>>>.
rapport_champ() {
  awk -v cle="$1:" '
    /<<<RAPPORT/ { dans = 1; next }
    /RAPPORT>>>/ { dans = 0 }
    dans && index($0, cle) == 1 { sub(/^[^:]*:[[:space:]]*/, ""); print; exit }
  ' "$STATE_DIR/worker_report.txt" 2>/dev/null
}

rapport_liste() {
  awk -v cle="$1:" '
    /<<<RAPPORT/ { dans = 1; next }
    /RAPPORT>>>/ { dans = 0 }
    dans && index($0, cle) == 1 { collecte = 1; next }
    dans && collecte && /^[[:space:]]+-[[:space:]]/ { sub(/^[[:space:]]*-[[:space:]]*/, ""); print; next }
    dans && collecte && /^[a-z]+:/ { collecte = 0 }
  ' "$STATE_DIR/worker_report.txt" 2>/dev/null
}

# ---------------------------------------------------------------------------
#  Garde-fou anti-triche
# ---------------------------------------------------------------------------
# Le risque le plus sérieux de ce dispositif : un agent coincé qui obtient du
# vert en affaiblissant un test. Le build passe, l'usine ouvre une MR, et la
# couverture recule sans que personne ne le voie. On mesure donc l'empreinte de
# la suite avant et après.
#
# Une baisse n'est PAS un échec à réessayer : c'est une régression déguisée en
# succès. On annule, et on passe à autre chose.
verifier_integrite() {
  local avant="$1" apres="$2"
  local n_avant n_apres
  n_avant="$(awk -F: '{s+=$2} END {print s+0}' "$avant")"
  n_apres="$(awk -F: '{s+=$2} END {print s+0}' "$apres")"

  local supprimes
  supprimes="$(comm -23 <(cut -d: -f1 "$avant" | sort) <(cut -d: -f1 "$apres" | sort))"
  if [ -n "$supprimes" ]; then
    log_err "Fichier(s) de test SUPPRIMÉ(S) :"; sed 's/^/    /' <<< "$supprimes" >&2
    return 1
  fi
  if [ "$n_apres" -lt "$n_avant" ]; then
    log_err "Le nombre de @Test a BAISSÉ : $n_avant → $n_apres."
    diff <(sort "$avant") <(sort "$apres") | grep '^[<>]' | head -10 >&2
    return 1
  fi

  # `@Ignore` fraîchement ajouté : même intention, autre moyen.
  local ignores
  ignores="$(git -C "$REPO_DIR" diff -- "$NATIVE_DIR" | grep -E '^\+.*@Ignore' || true)"
  if [ -n "$ignores" ]; then
    log_err "@Ignore ajouté sur un test :"; sed 's/^/    /' <<< "$ignores" >&2
    return 1
  fi

  log_ok "Intégrité de la suite : $n_avant → $n_apres @Test, aucun fichier perdu."
}

# ---------------------------------------------------------------------------
#  Traitement d'une tâche
# ---------------------------------------------------------------------------
traiter_tache() {
  local iid="$1"
  local titre corps
  titre="$(queue_title_of "$iid")"
  corps="$(queue_body_of "$iid")"

  log_step "Issue #$iid — $titre"

  BRANCHE="$(branch_name "$iid" "$titre")"
  gitops_prepare_branch "$BRANCHE"

  local avant="$STATE_DIR/tests_avant.txt" apres="$STATE_DIR/tests_apres.txt"
  fingerprint_tests > "$avant"
  log "Empreinte de départ : $(wc -l < "$avant") fichier(s) de test, $(awk -F: '{s+=$2} END {print s+0}' "$avant") @Test."

  local prompt
  prompt="$(rendre_prompt "$FACTORY_DIR/prompts/worker.md" \
              IID "$iid" TITRE "$titre" PROJET "$PROJECT_DIR" CORPS "$corps")"

  local tentative=1 reprise="" vert=0
  local gradle_out="$STATE_DIR/gradle.log" instr_out="$STATE_DIR/instrumented.log"
  ECRAN="non exécutés"

  # Prépare la tentative suivante : deux reprises de session, puis une session
  # NEUVE. Si l'agent s'est enfermé dans une impasse, lui redonner son propre
  # contexte l'y maintient — d'où la coupure au troisième essai.
  preparer_relance() {
    local trace="$1"
    if [ "$tentative" -le 3 ]; then
      reprise="$(cat "$SESSION_FILE" 2>/dev/null || true)"
    else
      reprise=""
      log_warn "Session neuve — les reprises n'ont pas abouti."
    fi
    prompt="$(rendre_prompt "$FACTORY_DIR/prompts/retry.md" \
                TENTATIVE "$tentative" MAX "$FACTORY_MAX_ATTEMPTS" \
                GRADLE "$(condense_gradle "$trace")")"
    # Une session neuve n'a aucun contexte : il lui faut la consigne complète.
    if [ -z "$reprise" ]; then
      prompt="$(rendre_prompt "$FACTORY_DIR/prompts/worker.md" \
                  IID "$iid" TITRE "$titre" PROJET "$PROJECT_DIR" CORPS "$corps")

$prompt"
    fi
  }

  while [ "$tentative" -le "$FACTORY_MAX_ATTEMPTS" ]; do
    log "Tentative $tentative/$FACTORY_MAX_ATTEMPTS${reprise:+ (reprise de session)}"

    local code=0
    lancer_worker "$prompt" "$reprise" || code=$?
    if [ "$code" -eq 75 ]; then
      log "Quota réarmé — on reprend sans consommer de tentative."
      continue
    fi

    # --- LE juge de paix : l'orchestrateur relance Gradle lui-même -----------
    log "Vérification indépendante par Gradle (JVM)…"
    if ! run_gradle "$gradle_out"; then
      log_err "Build rouge."
      condense_gradle "$gradle_out" | sed 's/^/    /'
      tentative=$((tentative + 1))
      [ "$tentative" -gt "$FACTORY_MAX_ATTEMPTS" ] && break
      preparer_relance "$gradle_out"; continue
    fi

    # --- Seconde preuve : ce qui se voit à l'écran --------------------------
    # Les tests JVM ne rendent aucun Compose et ne voient aucun focus (§8.14).
    # Quand un appareil répond, on va donc chercher la preuve là où elle est.
    # Quand il n'y en a pas, on le DIT — sauter en silence ferait croire qu'un
    # défaut d'UI a été vérifié alors qu'aucun pixel n'a été rendu.
    ECRAN="non exécutés (aucun appareil)"
    local code_ecran=0
    run_instrumented ":app-tv" "$(tv_device)" "$instr_out" || code_ecran=$?
    case "$code_ecran" in
      0) ECRAN="✅ app-tv vérifiée à l'écran"; vert=1; break ;;
      2) ECRAN="⚠️ non vérifié à l'écran — aucun appareil"; vert=1; break ;;
      *) log_err "Tests instrumentés ROUGES — le défaut se voit à l'écran."
         condense_gradle "$instr_out" | sed 's/^/    /'
         ECRAN="❌ app-tv rouge à l'écran" ;;
    esac

    tentative=$((tentative + 1))
    [ "$tentative" -gt "$FACTORY_MAX_ATTEMPTS" ] && break
    preparer_relance "$instr_out"
  done

  fingerprint_tests > "$apres"

  # --- Triche : on annule, sans réessayer -----------------------------------
  if ! verifier_integrite "$avant" "$apres"; then
    log_err "#$iid abandonnée : la suite de tests a été affaiblie."
    [ "$DRY_RUN" = 0 ] && gitops_comment_issue "$iid" \
      "🤖 **Usine locale — travail annulé**

Un build vert a été obtenu au prix d'une suite de tests affaiblie (test supprimé, \`@Ignore\` ajouté, ou nombre de \`@Test\` en baisse). Les modifications ont été **annulées** et le ticket reste ouvert.

Il faut probablement redécouper cette tâche." ""
    queue_mark_blocked "$iid" "suite de tests affaiblie — travail annulé"
    gitops_abandon "$BRANCHE"
    return 1
  fi

  # --- Rien n'a bougé --------------------------------------------------------
  local fichiers=(); mapfile -t fichiers < <(gitops_changed_files)
  if [ ${#fichiers[@]} -eq 0 ]; then
    log_err "#$iid : aucun fichier modifié."
    queue_mark_blocked "$iid" "aucune modification produite"
    gitops_abandon "$BRANCHE"
    return 1
  fi
  log "Fichiers retenus (artefacts de build exclus) :"; printf '    %s\n' "${fichiers[@]}"

  # --- Livraison -------------------------------------------------------------
  local resume commit
  resume="$(rapport_champ resume)"; : "${resume:=Résout #$iid}"
  commit="$(rapport_champ commit)"; : "${commit:=fix(iptv): resout #$iid}"

  local titre_mr="$resume" brouillon=0
  if [ "$vert" -eq 0 ]; then
    brouillon=1; titre_mr="Draft: $resume"; commit="[WIP] $commit"
    log_warn "Livraison en QUARANTAINE : build rouge après $FACTORY_MAX_ATTEMPTS tentatives."
  fi

  local corps_mr
  corps_mr="$(cat <<FIN
$(sed -n '/<<<RAPPORT/,/RAPPORT>>>/p' "$STATE_DIR/worker_report.txt" | sed '1d;$d')

---
**Ticket** : #$iid — $titre
**Vérification (JVM)** : $( [ "$vert" -eq 1 ] && echo "✅ \`$FACTORY_GRADLE_TASKS\` au vert (relancé par l'orchestrateur)" || echo "❌ rouge après $FACTORY_MAX_ATTEMPTS tentatives" )
**Vérification (écran)** : $ECRAN
**Intégrité de la suite** : $(awk -F: '{s+=$2} END {print s+0}' "$avant") → $(awk -F: '{s+=$2} END {print s+0}' "$apres") @Test

\`\`\`
$(condense_gradle "$STATE_DIR/gradle.log" | head -25)
\`\`\`

_Produite par l'usine logicielle locale. **À relire avant fusion.**_
FIN
)"

  if [ "$DRY_RUN" = 1 ]; then
    log_warn "--dry-run : commit/push/MR sautés. Diff conservé sur $BRANCHE."
    return 0
  fi

  gitops_commit_push "$BRANCHE" "$commit" "${fichiers[@]}" || {
    queue_mark_blocked "$iid" "commit ou push refusé"; gitops_abandon "$BRANCHE"; return 1
  }

  local mr; mr="$(gitops_open_mr "$BRANCHE" "$titre_mr" "$corps_mr" "$brouillon")" || mr=""
  [ -n "$mr" ] && log_ok "MR : $mr"

  gitops_comment_issue "$iid" \
    "🤖 **Usine locale**

$( [ "$vert" -eq 1 ] \
     && echo "✅ Correctif proposé, \`$FACTORY_GRADLE_TASKS\` au vert." \
     || echo "⚠️ **Build rouge** après $FACTORY_MAX_ATTEMPTS tentatives — MR en brouillon, à reprendre à la main." )

$(rapport_champ limites | head -3)" "$mr"

  # Le ticket n'est PAS clôturé : c'est la fusion qui ferme, pas la proposition.
  if [ "$vert" -eq 1 ]; then
    queue_mark_done "$iid"
    log_ok "#$iid livrée."
  else
    queue_mark_blocked "$iid" "build rouge — MR brouillon $mr"
  fi

  git -C "$REPO_DIR" checkout --quiet "$FACTORY_BRANCH"
  [ "$vert" -eq 1 ]
}

# ---------------------------------------------------------------------------
#  Boucle principale
# ---------------------------------------------------------------------------
livrees=0; bloquees=0

while true; do
  if [ -f "$STATE_DIR/STOP" ]; then
    rm -f "$STATE_DIR/STOP"; log_warn "Sentinelle STOP — arrêt propre."; break
  fi

  iid="$(queue_next_iid || true)"
  if [ -z "$iid" ]; then
    log "File vide — synchronisation."
    "$FACTORY_DIR/sync_gitlab.sh" || log_warn "Synchronisation en échec."
    iid="$(queue_next_iid || true)"
    [ -z "$iid" ] && { log_ok "Plus rien à faire."; break; }
  fi

  if traiter_tache "$iid"; then livrees=$((livrees + 1)); else bloquees=$((bloquees + 1)); fi

  [ "$UNE_SEULE" = 1 ] && break
  log "Pause de ${FACTORY_COOLDOWN}s."
  sleep "$FACTORY_COOLDOWN"
done

log_step "Fin du run $RUN_ID — $livrees livrée(s), $bloquees bloquée(s)"
[ "$bloquees" -eq 0 ]
