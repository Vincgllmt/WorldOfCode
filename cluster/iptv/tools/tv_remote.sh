#!/usr/bin/env bash
# Télécommande clavier pour l'émulateur Android TV.
#
#   ./tools/tv_remote.sh
#
# Envoie les touches à l'appareil via adb : utile quand la fenêtre de l'émulateur
# n'a pas le focus, ou pour piloter l'app depuis le terminal.
#
#   flèches      D-pad haut/bas/gauche/droite
#   Entrée       OK (DPAD_CENTER)
#   Retour arr.  RETOUR          Échap  ACCUEIL
#   m            MENU            i      INFO
#   p            LECTURE/PAUSE   s      capture d'écran (/tmp/tv_shot.png)
#   q            quitter
set -u

ADB=${ADB:-/home/rigolo/Android/Sdk/platform-tools/adb}
SERIAL=${SERIAL:-}
[ -n "$SERIAL" ] && ADB="$ADB -s $SERIAL"

key() { $ADB shell input keyevent "$1" </dev/null >/dev/null 2>&1; }

$ADB wait-for-device </dev/null || exit 1
printf 'Télécommande prête (q pour quitter).\n'

while IFS= read -rsn1 c; do
  case $c in
    $'\e')
      # séquence d'échappement : flèche, ou Échap seul
      if IFS= read -rsn2 -t 0.02 rest; then
        case $rest in
          '[A') key 19; printf '↑\n' ;;
          '[B') key 20; printf '↓\n' ;;
          '[D') key 21; printf '←\n' ;;
          '[C') key 22; printf '→\n' ;;
        esac
      else
        key 3; printf 'ACCUEIL\n'
      fi
      ;;
    '')        key 23;  printf 'OK\n' ;;
    $'\x7f')   key 4;   printf 'RETOUR\n' ;;
    m|M)       key 82;  printf 'MENU\n' ;;
    i|I)       key 165; printf 'INFO\n' ;;
    p|P)       key 85;  printf 'LECTURE/PAUSE\n' ;;
    s|S)       $ADB exec-out screencap -p </dev/null > /tmp/tv_shot.png; printf 'capture → /tmp/tv_shot.png\n' ;;
    q|Q)       printf 'fin\n'; break ;;
  esac
done
