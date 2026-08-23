# Notes de version — textes prêts à publier

Un bloc par version. Le texte « Play Console » est celui à coller dans **Nouveautés**
(*What's new*), limité par Play à **500 caractères par langue** — le compte est vérifié à
chaque ajout, cf. la commande en fin de fichier.

---

## `app-mobile` 1.2.0 — versionCode 15 *(préparée le 2026-08-23)*

Depuis la **1.1.6 / versionCode 14**, la seule version publiée (§32, mesurée sur une build
installée par Play).

### Play Console — Nouveautés (fr-FR)

```
• Navigation repensée : Direct TV, Films et Séries s'ouvrent sur leurs thèmes. Un thème se met en favori d'un geste, remonte en tête de liste et rejoint « Ma liste ».
• Pistes audio et sous-titres : celles que votre appareil ne sait pas lire sont signalées au lieu d'échouer.
• Lecture : les erreurs sont enfin affichées, et « Réessayer » fonctionne.
• « Reprendre la lecture » : un titre supprimé ne réapparaît plus.
• Cast, fiches séries et recherche : nombreuses corrections.
```

### Play Console — What's new (en-US)

```
• Redesigned browsing: Live TV, Movies and Series now open on their themes. Bookmark a theme to pin it to the top of the list and to My list.
• Audio and subtitle tracks: those your device cannot decode are flagged instead of failing.
• Playback: errors are finally shown, and Retry works.
• Continue watching: a removed title no longer comes back.
• Cast, series pages and search: many fixes.
```

### Changelog complet (interne)

| Sujet | Renvoi |
|---|---|
| L'app est réorganisée autour des thèmes ; tiroir latéral et sélecteur de disposition retirés ; filtre « Thèmes » dans « Ma liste », « Tout » supprimé | §50 |
| Sélecteur de pistes : une piste que le décodeur refuse est signalée et non focalisable ; « Réessayer » efface les surcharges au lieu de rejouer l'échec | §49 |
| « Reprendre la lecture » : la boucle d'écriture survivait à son écran et réinsérait l'entrée effacée dix secondes plus tard | §49 |
| Bloc d'erreur du lecteur : `STATE_IDLE` écrasait `ERROR` — il n'avait **jamais** fonctionné sur mobile non plus | §45 |
| Cast : formats non diffusables annoncés, progression suivie depuis le récepteur, télécommande qui se ferme | §33, §34, §36 |
| Fiche série : quatre défauts corrigés sur l'écran réel | §33 |
| Recherche conservée au retour d'une fiche ; synopsis dépliable | §35 |
| État de chaque onglet conservé (`SaveableStateProvider`) | §38 |
| Grille : hauteur des cartes alignée (`minLines = 2`) | §37 |
| Libellés : pluriels résolus, littéraux français sortis du code (dont cinq que le contrôle ne voyait pas, faute d'accents) | §48, §50 |

### Contrôles passés

- `:core:testDebugUnitTest` + `:app-tv:testDebugUnitTest` → **244 cas, 0 échec**
- `python3 tools/check_strings.py native` → parité 116/116 (`app-tv`), 113/113 + 7/7 pluriels (`app-mobile`)
- `:app-mobile:bundleRelease` → `app-mobile-release.aab`, 12,0 Mo, signé (certificat valide jusqu'en 2053)
- Identité de l'artefact : `com.purple.iptvplayer`, versionCode **15**, versionName **1.2.0**
- Parcours vérifié sur Pixel 7 (build **debug**) : six gestes de la nouvelle navigation, cf. §50

### Reste à faire avant publication

1. ⚠️ **Aucune vérification de la build minifiée.** Tout ce qui est observé l'a été sur la
   variante debug, non minifiée. R8 est actif en release (`isMinifyEnabled = true`) ; les
   règles `-keep` couvrent Moshi et `core.model`, mais cela n'a pas été exercé. La piste de
   **test interne** est l'endroit prévu pour ça (§9), avant la promotion en production.
2. Téléverser l'AAB **à la main** dans la Play Console : le dépôt n'a pas d'accès à la Play
   Developer API (§9).
3. Coller les deux textes ci-dessus dans **Nouveautés**, fr-FR et en-US.

---

## `app-tv` 1.3.0 — versionCode 11 *(chargement latéral, 2026-08-23)*

**Non publiée sur le Play Store** : `com.purple.iptvplayer.tv` n'a pas de fiche active,
l'APK est distribuée à la main (§41). Contenu : les 28 défauts du D-pad (§43–§48), les trois
défauts remontés à l'usage (§49) et le retrait du filtre « Tout » de « Ma liste » (§50).

---

## Vérifier la longueur d'un texte avant de le coller

```bash
python3 - <<'PY'
import re, sys
blocs = re.findall(r"```\n(.*?)```", open("docs/RELEASE_NOTES.md", encoding="utf-8").read(), re.S)
for i, b in enumerate(blocs, 1):
    print(f"bloc {i}: {len(b.rstrip())} caractères", "OK" if len(b.rstrip()) <= 500 else "⚠️ > 500")
PY
```
