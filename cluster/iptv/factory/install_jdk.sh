#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Installe un JDK 17 durable, sans sudo.
#
#  Pourquoi ce script existe : cette machine n'a que `openjdk-17-jre-headless`,
#  donc PAS de `javac` (CLAUDE.md §3). Le contournement documenté — déplier un
#  Temurin dans le scratchpad — ne convient pas à une usine sans surveillance :
#  le scratchpad est propre à une session, et Gradle échoue ensuite sur
#  « JAVA_HOME points to invalid directory ».
#
#  Idempotent : ne retélécharge rien si le JDK est déjà en place.
# ---------------------------------------------------------------------------
set -euo pipefail

DEST="${FACTORY_JDK:-$HOME/.local/share/purple-factory/jdk-17}"
URL="https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"

if [ -x "$DEST/bin/javac" ]; then
  echo "JDK déjà présent : $DEST ($("$DEST/bin/javac" -version 2>&1))"
  exit 0
fi

echo "Téléchargement de Temurin 17 (~185 Mo)…"
parent="$(dirname "$DEST")"
mkdir -p "$parent"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL -o "$tmp/jdk.tgz" "$URL"
tar -xzf "$tmp/jdk.tgz" -C "$tmp"
extrait="$(find "$tmp" -maxdepth 1 -name 'jdk-17*' -type d | head -1)"
[ -n "$extrait" ] || { echo "Archive inattendue." >&2; exit 1; }
rm -rf "$DEST"
mv "$extrait" "$DEST"

"$DEST/bin/javac" -version
echo "JDK installé : $DEST"
