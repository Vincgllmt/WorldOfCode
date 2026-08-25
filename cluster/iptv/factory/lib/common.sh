#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Socle commun : journalisation, verrou, environnement, garde-fous.
#
#  Sourcé par tous les scripts de l'usine. Ne fait rien tout seul.
# ---------------------------------------------------------------------------

# Racine de l'usine, quel que soit l'endroit d'où l'on appelle le script.
FACTORY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(cd "$FACTORY_DIR/.." && pwd)"          # cluster/iptv
REPO_DIR="$(cd "$PROJECT_DIR/../.." && pwd)"          # racine du dépôt woc
NATIVE_DIR="$PROJECT_DIR/native"
STATE_DIR="$FACTORY_DIR/state"
LOG_DIR="$STATE_DIR/logs"
PRIORITIES_FILE="$PROJECT_DIR/USER_PRIORITIES.md"

mkdir -p "$STATE_DIR" "$LOG_DIR"

# Identifiants locaux, s'ils existent. `set -a` exporte tout ce qui est défini
# dans le fichier — `glab` lit GITLAB_TOKEN et GITLAB_HOST dans l'environnement,
# et cela prime sur sa configuration.
if [ -f "$FACTORY_DIR/.env" ]; then
  set -a; . "$FACTORY_DIR/.env"; set +a
fi

# --- Réglages, tous surchargeables par l'environnement ---------------------

# Branche de travail. Ce n'est PAS `main` : `cluster/iptv/` est dans le
# .gitignore de `dev` et de `main`, le code source n'y est pas visible
# (CLAUDE.md §1).
: "${FACTORY_BRANCH:=iptv}"
# Ne traiter que les issues portant ce label. Vide = toutes celles qui me sont
# assignées.
: "${FACTORY_LABEL:=}"
# Qui doit être l'assigné des issues traitées. `@me` fonctionne avec un jeton
# personnel ; avec un jeton de PROJET, `@me` est le bot et ne trouve rien —
# d'où la possibilité de nommer quelqu'un.
: "${FACTORY_ASSIGNEE:=@me}"
# Bornes du worker éphémère. `claude` 2.1.241 n'a pas de --max-turns : la seule
# borne disponible est murale.
: "${FACTORY_WORKER_TIMEOUT:=3600}"
: "${FACTORY_MAX_ATTEMPTS:=4}"
# Pause entre deux tâches, pour laisser la main et ne pas saturer le quota.
: "${FACTORY_COOLDOWN:=60}"
# Sommeil d'attente de quota, par tranches (secondes).
: "${FACTORY_QUOTA_SLICE:=1800}"
: "${FACTORY_MODEL:=}"
# Profondeur de raisonnement du worker : low / medium / high / xhigh / max.
# Vide = défaut de la CLI. Baisser réduit le coût ET la qualité — c'est une
# décision de produit, pas une optimisation gratuite : laissé au réglage.
: "${FACTORY_EFFORT:=}"

# --- Journalisation --------------------------------------------------------

# Couleurs seulement si l'on parle à un terminal : dans un fichier de log, les
# séquences ANSI ne font que du bruit.
if [ -t 1 ]; then
  C_RST=$'\033[0m'; C_DIM=$'\033[2m'; C_RED=$'\033[31m'
  C_GRN=$'\033[32m'; C_YEL=$'\033[33m'; C_BLU=$'\033[34m'
else
  C_RST=; C_DIM=; C_RED=; C_GRN=; C_YEL=; C_BLU=
fi

_ts() { date '+%Y-%m-%d %H:%M:%S'; }

log()      { printf '%s %s[usine]%s %s\n'  "$(_ts)" "$C_BLU" "$C_RST" "$*"; }
log_ok()   { printf '%s %s[ ok  ]%s %s\n'  "$(_ts)" "$C_GRN" "$C_RST" "$*"; }
log_warn() { printf '%s %s[ ! ]%s %s\n'    "$(_ts)" "$C_YEL" "$C_RST" "$*" >&2; }
log_err()  { printf '%s %s[echec]%s %s\n'  "$(_ts)" "$C_RED" "$C_RST" "$*" >&2; }
log_step() { printf '\n%s%s── %s ──%s\n'   "$C_DIM" "$(_ts)" "$*" "$C_RST"; }

die() { log_err "$*"; exit 1; }

# --- Verrou : une seule usine à la fois -----------------------------------

# Deux orchestrateurs partageraient le même arbre de travail git et les mêmes
# issues. Le second corromprait le travail du premier sans que rien ne le
# signale : `flock` rend la situation impossible plutôt que rare.
acquire_lock() {
  exec 9>"$STATE_DIR/factory.lock"
  if ! flock -n 9; then
    die "Une autre usine tourne déjà (verrou $STATE_DIR/factory.lock)."
  fi
  echo "$$" >&9
}

# --- Environnement ---------------------------------------------------------

# JDK durable. Le scratchpad de session ne convient pas : il disparaît entre
# deux sessions, et Gradle échoue alors sur « JAVA_HOME points to invalid
# directory » (CLAUDE.md §3). Cet emplacement-ci survit.
: "${FACTORY_JDK:=$HOME/.local/share/purple-factory/jdk-17}"

ensure_jdk() {
  if [ -x "$FACTORY_JDK/bin/javac" ]; then
    export JAVA_HOME="$FACTORY_JDK"
  elif command -v javac >/dev/null 2>&1; then
    # Un JDK système fait tout aussi bien l'affaire.
    export JAVA_HOME="${JAVA_HOME:-$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")}"
  else
    die "Aucun JDK avec javac. Attendu en $FACTORY_JDK — relancer factory/install_jdk.sh."
  fi
  export PATH="$JAVA_HOME/bin:$PATH"
  log "JAVA_HOME = $JAVA_HOME ($("$JAVA_HOME/bin/javac" -version 2>&1))"
}

# Contrôles à passer AVANT de dépenser le moindre jeton. Une usine qui démarre
# sur un arbre sale ou une branche fausse produit un diff inexploitable.
preflight() {
  command -v claude >/dev/null 2>&1 || die "La CLI « claude » est introuvable."
  command -v glab   >/dev/null 2>&1 || die "La CLI « glab » est introuvable — installer glab puis « glab auth login »."
  command -v jq     >/dev/null 2>&1 || die "« jq » est requis."

  # Vaut aussi pour un jeton EXPIRÉ, pas seulement absent : `glab auth status`
  # fait un vrai appel API et sort en 1 sur un 401. Le jeton OAuth posé par
  # `glab auth login` expire — constaté après quelques heures.
  glab auth status >/dev/null 2>&1 || \
    die "glab n'est pas utilisable (jeton absent ou expiré) — vérifier factory/.env, ou relancer « glab auth login »."

  # Avertir AVANT la panne : un jeton qui expire pendant la nuit fait échouer
  # l'usine au moment de publier, après avoir dépensé le travail.
  local reste
  reste="$(glab api personal_access_tokens/self 2>/dev/null \
    | python3 -c "
import json,sys,datetime
try:
    d=json.load(sys.stdin); e=d.get('expires_at')
    print((datetime.date.fromisoformat(e)-datetime.date.today()).days if e else 9999)
except Exception: print(9999)" 2>/dev/null || echo 9999)"
  if [ "${reste:-9999}" -lt 30 ]; then
    log_warn "Le jeton GitLab expire dans $reste jour(s) — le renouveler avant qu'il ne lâche en pleine exécution."
  fi

  [ -x "$NATIVE_DIR/gradlew" ] || die "gradlew introuvable dans $NATIVE_DIR. Mauvaise branche ? Le code IPTV n'existe que sur « $FACTORY_BRANCH » (CLAUDE.md §1)."

  local branche
  branche="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)"
  [ "$branche" = "$FACTORY_BRANCH" ] || die "Branche courante « $branche », attendue « $FACTORY_BRANCH »."

  # L'arbre de travail doit être PROPRE sous native/.
  #
  # Ce n'est pas une coquetterie : l'usine prend le contrôle de l'arbre, et son
  # `git add` porte sur « ce qui a changé sous native/ ». Du travail humain en
  # cours serait donc happé dans la MR de l'usine, mélangé à son propre diff, et
  # attribué à un agent. Constaté sur cet arbre même : 16 modifications non
  # committées, dont des fichiers non suivis (RecentPolicy.kt, TvScrollableBlock.kt).
  #
  # Partager l'arbre entre l'usine et l'utilisateur n'a pas de version sûre :
  # on refuse de démarrer plutôt que de proposer une option dangereuse.
  local sale
  sale="$(git -C "$REPO_DIR" status --porcelain -- "$NATIVE_DIR" \
          | grep -vE '(/build/|/\.gradle/|/\.kotlin/|local\.properties|keystore\.properties)' || true)"
  if [ -n "$sale" ]; then
    log_err "L'arbre n'est pas propre sous native/ :"
    sed 's/^/    /' <<< "$sale" >&2
    die "Committer ou remiser ce travail avant de lancer l'usine (« git stash -u -- $NATIVE_DIR »)."
  fi

  ensure_jdk
  log_ok "Pré-vol : environnement conforme, arbre propre."
}

# --- Gradle ----------------------------------------------------------------

# La boucle de travail du projet (CLAUDE.md §4). C'est le SEUL juge de paix :
# l'orchestrateur la relance lui-même et ne croit jamais le worker sur parole.
: "${FACTORY_GRADLE_TASKS:=:core:testDebugUnitTest :app-tv:testDebugUnitTest}"

# Lance Gradle. Écrit la sortie dans le fichier donné, rend le code de Gradle.
run_gradle() {
  local sortie="$1"; shift
  local taches=("$@")
  [ ${#taches[@]} -gt 0 ] || read -r -a taches <<< "$FACTORY_GRADLE_TASKS"
  ( cd "$NATIVE_DIR" && ./gradlew --no-daemon --console=plain "${taches[@]}" ) \
    >"$sortie" 2>&1
}

# Ne garde d'une sortie Gradle que ce qui aide à corriger. Un échec brut fait
# des milliers de lignes ; les rendre à un agent coûte plus cher que ce
# qu'elles rapportent.
condense_gradle() {
  local f="$1"
  grep -E '^(e:|w: .*error|FAILURE:|BUILD (SUCCESSFUL|FAILED))|Task .* FAILED|Execution failed for task|^\s+> |tests? completed|FAILED$|expected:.*but was:|^\s+at com\.purple\.' "$f" \
    | grep -vE 'Download|Daemon|Deprecated Gradle|is never used' \
    | head -80
}

# --- Tests instrumentés : la seule preuve qui voit un écran ---------------
#
# Les tests JVM ne rendent aucun Compose et ne voient aucun focus (§8.14). Les
# tests instrumentés, eux, tournent sur un vrai Android — AVD `purple_tv` pour
# la TV, Pixel 7 branché pour le mobile.
#
# Règle : on ne les lance QUE si l'appareil correspondant répond, et on le DIT.
# Sauter la vérification en silence ferait croire qu'un défaut d'UI a été
# prouvé alors qu'aucun pixel n'a été rendu — c'est précisément le mensonge que
# l'usine est censée rendre impossible.

# Le premier appareil correspondant au motif, ou vide.
device_matching() {
    local motif="$1"
    command -v adb >/dev/null 2>&1 || return 0
    adb devices 2>/dev/null | awk '$2 == "device" {print $1}' | grep -E "$motif" | head -1
}

# Émulateur TV : nom `emulator-*`. Appareil physique : tout le reste.
tv_device()     { device_matching '^emulator-'; }
mobile_device() { device_matching '^[^e]|^e[^m]'; }

# Lance les tests instrumentés d'un module sur un appareil donné.
# Rend 0 si vert, 1 si rouge, 2 si aucun appareil (donc NON vérifié).
run_instrumented() {
    local module="$1" serial="$2" sortie="$3"
    if [ -z "$serial" ]; then
        log_warn "$module : aucun appareil — tests instrumentés NON exécutés."
        return 2
    fi
    log "$module : tests instrumentés sur $serial…"
    ( cd "$NATIVE_DIR" && ANDROID_SERIAL="$serial" \
        ./gradlew --no-daemon --console=plain "$module:connectedDebugAndroidTest" ) \
        >"$sortie" 2>&1
}

# Compte les tests exécutés, d'après les rapports XML de Gradle.
# Sert de garde-fou anti-triche : ce nombre ne doit jamais baisser.
count_tests() {
  find "$NATIVE_DIR" -path '*/test-results/*' -name 'TEST-*.xml' 2>/dev/null \
    | xargs -r grep -ho 'tests="[0-9]*"' 2>/dev/null \
    | grep -o '[0-9]*' | awk '{s+=$1} END {print s+0}'
}

# Empreinte de la suite de tests : quels fichiers, et combien de @Test.
# Comparée avant/après le worker.
fingerprint_tests() {
  find "$NATIVE_DIR" -path '*/src/test/*' -name '*Test.kt' 2>/dev/null | sort \
    | while read -r f; do
        printf '%s:%s\n' "${f#"$REPO_DIR"/}" "$(grep -c '@Test' "$f" 2>/dev/null || echo 0)"
      done
}
