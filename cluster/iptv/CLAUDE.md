# CLAUDE.md — Purple IPTV Player

Mémoire de travail de l'agent. À maintenir à jour à chaque décision architecturale.

Dernière mise à jour : 2026-08-28

> **Ce fichier ne garde que ce qu'il faut savoir *avant* de toucher au code.** Tout le
> reste — le détail de l'outillage, la procédure de test, les défauts déjà corrigés, les
> règles apprises à la dure — est sorti dans `docs/`, et **rien de tout cela n'est chargé
> automatiquement** : on ouvre le fichier concerné au moment où l'on en a besoin.
>
> | Besoin | Fichier |
> |---|---|
> | **Que corriger ensuite** — 100 défauts sourcés à la ligne, triés par gravité | [`docs/audit.md`](docs/audit.md) |
> | **Builder, installer, piloter un appareil** — JDK, SDK, `adb`, émulateur, build d'auteur | [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md) |
> | **Comment valider** — les trois niveaux en détail, l'outillage, les conventions | [`docs/TESTS.md`](docs/TESTS.md) |
> | **Ce qu'un geste a déjà coûté** — 19 règles, chacune tirée d'une vraie erreur | [`docs/METHODE.md`](docs/METHODE.md) |
> | **Le diagnostic d'un sujet déjà traité** — mesures, traces, corrections de correction | [`docs/JOURNAL.md`](docs/JOURNAL.md) (index en tête) |
> | **Facturation, sécurité, publication, dette** | [`docs/RESTE_A_FAIRE.md`](docs/RESTE_A_FAIRE.md) |
> | **Les 28 défauts du D-pad, en spécifications** | [`docs/PLAN_CORRECTION_TV.md`](docs/PLAN_CORRECTION_TV.md) |
>
> Les renvois « §N » désignent une section de `docs/JOURNAL.md`. L'ouvrir **à la section
> concernée**, jamais en entier.

---

## 1. Ce qu'est ce projet (et où est le vrai code)

`cluster/iptv/` contient **deux applications** dont une seule est vivante.

| Chemin | Stack | Statut | LOC |
|---|---|---|---|
| `native/` | Kotlin / Jetpack Compose / Gradle | ✅ **ACTIF — c'est l'app à finaliser** | ~15 650 |
| `client/` | Flutter / Dart | ⚠️ **LEGACY — ne pas développer** | ~9 570 |
| `tools/` | `generate_icons.py` | utilitaire | — |

➡️ **Tout nouveau code, correctif et test va dans `native/`.** `client/` n'est touché que
pour y relire une implémentation de référence — et pas pour s'aligner dessus : son
`decodeIfNeeded` corrompt des noms de chaînes là où le Kotlin est sain (cf.
`docs/RESTE_A_FAIRE.md`).

### Piège d'environnement : la branche

`cluster/iptv/` est **ignoré par `.gitignore` sur `dev` et `main`**. Depuis `dev`, le
répertoire ne contient que des artefacts de build et **le code source est invisible**.

```bash
git checkout iptv        # OBLIGATOIRE avant toute intervention sur ce projet
```

⚠️ **Jamais `git add -A`** : les artefacts de build salissent le dépôt par centaines de
fichiers. Viser les fichiers explicitement.

---

## 2. Architecture de `native/`

Multi-module Gradle (`rootProject.name = "PurpleIPTV"`), Kotlin 2.0, AGP 8.7, JVM 17.

```
native/
├── core/         → module partagé (android-library) : TOUTE la logique métier
│   └── src/main/kotlin/com/purple/iptvplayer/core/
│       ├── data/       9 Repositories (Trial, Billing, Progress, Cache,
│       │               Credentials, Download, Favorites, Iptv, Settings)
│       ├── model/      7 modèles (Channel, Movie, SeriesItem, EpgProgram, …)
│       ├── network/    XtreamApiClient, M3uParserService
│       ├── player/     PlayerService (Media3/ExoPlayer)
│       ├── viewmodel/  6 ViewModels (Content, Player, Purchase, Setup, Trial, Download)
│       └── di/         module Koin
├── app-mobile/   → UI Compose Material3 (téléphone/tablette)
└── app-tv/       → UI Compose TV (Android TV, navigation D-pad)
```

**Règles d'architecture — à respecter :**

1. **`core` est le seul détenteur de la logique métier.** `app-mobile` et `app-tv` sont
   deux présentations d'un même `core`. Un correctif de logique se fait dans `core`,
   jamais dupliqué dans les deux UI — c'est le défaut le plus fréquent du projet, et il se
   solde toujours par une divergence (§28, §33.1, §53).
2. **Une décision se sort en objet pur** (`TrialPolicy`, `RecentPolicy`, `ProgressPolicy`,
   `VersionPolicy`, `TrackPolicy`…) et se teste là, sans Android. On ne teste pas un
   Repository à travers Android.
3. **DI par Koin**, pas de Hilt. Les Repositories sont injectés, pas instanciés.
4. **Persistance : DataStore Preferences** pour les préférences,
   `EncryptedSharedPreferences` comme couche de secours anti-fraude pour
   l'essai/abonnement, fichiers JSON (Moshi) dans `cacheDir` pour le catalogue.
5. **Toute lecture de données persistées doit être défensive** — `runCatching { … }
   .getOrNull()`, comme `CacheRepository` et `RecentItemsCodec`.
6. **Les `Flow` exposés publiquement ne doivent jamais pouvoir émettre une exception.**
   Une exception dans un `.map{}` remonte à tous les collecteurs et crashe l'écran Compose
   de façon définitive.
7. **Media3/ExoPlayer** côté natif (l'équivalent Flutter `media_kit` est legacy).

---

## 3. Builder et tester — le minimum

```bash
export JAVA_HOME=$HOME/.local/share/jdk-17          # aucun JDK système : le paquet est un JRE
export PATH="$JAVA_HOME/bin:$PATH:/home/rigolo/Android/Sdk/platform-tools"
cd /home/rigolo/Documents/woc/cluster/iptv/native

./gradlew :core:testDebugUnitTest    # 219 tests
./gradlew :app-tv:testDebugUnitTest  #  73 tests
./gradlew :app-tv:assembleDebug      # ou :app-mobile:installDebug
```

**État de la suite : 292 tests, 0 échec.** Rapport HTML après échec :
`core/build/reports/tests/testDebugUnitTest/index.html`.

Contrôle des libellés avant toute publication : `python3 tools/check_strings.py`.

Le reste — deuxième machine, keystore, `purple.unlock`, simulation d'un essai expiré,
lancement de l'émulateur — est dans [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md).

> **Lien de test M3U** (credentials utilisateur) : **`~/.purple_iptv/test_credentials`**
> (créé le 2026-08-28, `chmod 600`). Ce fichier est **hors du repo** — jamais le committer
> ni recopier son contenu dans un fichier suivi par git. Il expose `PURPLE_M3U_URL` ;
> `. ~/.purple_iptv/test_credentials` le charge dans le shell. Le même lien est la valeur
> de `purple.defaultM3u` dans `native/local.properties` (ignoré par git), qui pré-remplit
> le champ de l'écran de connexion TV.
>
> ⚠️ Ne pas essayer de télécharger la playlist par `get.php` : ce fournisseur le **refuse**
> (HTTP 885, corps vide — mesuré, indépendamment du `User-Agent`). Ce n'est pas un
> incident : `Credentials.parseUrl` repère `username`/`password` dans l'URL et la convertit
> en identifiants **Xtream**, si bien que l'application n'appelle jamais `get.php` — tout
> passe par `player_api.php`, qui répond. Détail dans
> [`docs/ENVIRONNEMENT.md`](docs/ENVIRONNEMENT.md).

---

## 4. Valider sur les supports, pas seulement dans la suite

**Les tests unitaires prouvent la logique ; ils ne prouvent rien de ce qui s'affiche.**

| Ce qui a changé | Niveaux à passer |
|---|---|
| Logique dans `core` | 1 |
| UI de l'app TV | 1 **et 2** (émulateur `purple_tv`) |
| UI de l'app mobile | 1 **et 3** (Pixel 7) |
| Logique partagée touchant les deux UI | 1, **2 et 3** |

- **Niveau 2 — émulateur : y aller sans demander.** C'est une machine jetable.
- **Niveau 3 — le Pixel 7 est l'appareil *personnel* de l'utilisateur.** S'il est branché,
  installer l'app **mobile** et vérifier ; sinon **s'arrêter et le demander**. Jamais de
  build TV dessus, et **éviter les captures d'écran** : une notification privée est déjà
  apparue deux fois dans une capture (§52, §53).
- **Ce qui n'a pas été vérifié doit être dit, jamais supposé.**

⚠️ L'émulateur ne se lance **que** comme ceci — et `-no-snapshot` dès qu'une capture
revient vide ou noire (l'instantané d'AVD corrompt `screencap`, §44, §53) :

```bash
emulator -avd purple_tv -no-window -gpu swiftshader_indirect -accel on -no-snapshot -no-boot-anim -no-audio
```

⚠️ Pour l'arrêter : `pkill -f "[q]emu-system"`. Sans la classe de caractères, le motif tue
son propre shell.

⚠️ `uiautomator dump` ne rend rien d'exploitable sur du Compose : passer par
`adb exec-out screencap -p > /tmp/ecran.png` et regarder l'image.

Procédure complète des trois niveaux, outillage, conventions de nommage, et pourquoi
Robolectric a été écarté : [`docs/TESTS.md`](docs/TESTS.md).

---

## 5. Où en est le chantier

**La file de travail est [`docs/audit.md`](docs/audit.md)** : 100 défauts relevés par
lecture systématique, sourcés `fichier:ligne`, plus 2 relevés à l'usage — 6 critiques /
43 majeurs / 53 mineurs. Chaque entrée corrigée y est marquée « ✅ Corrigé », avec un
renvoi vers la section du journal qui porte le diagnostic.

⚠️ **`✅ Corrigé` ne veut pas dire vérifié.** Une entrée dont la preuve se limite à
« compile ✓ / tests ✓ / l'APK démarre » n'a pas été vue sur un support. La campagne du
2026-08-28 (§56) l'a montré : sur six lots ainsi marqués, deux scénarios sur onze ont
échoué — **#R1**, une régression critique qui faisait accepter n'importe quel serveur
injoignable, et **#R2**, la fiche série TV sans aucun focus. Les deux sont corrigés et
revérifiés à l'écran (§56, §57).

Le lot TV-2 et la moitié « accessibilité » de TV-3 ont été vérifiés à leur tour (§58) :
#76 et #79 tiennent, **#77 avait été répondu à côté** — un garde de borne inerte au lieu du
garde de focus demandé — et un **#R4** en est sorti : le ✕ de la barre de recherche TV
n'est atteignable par aucune touche. **#R4 est corrigé à son tour (§59) ; le coût de 3 appuis de #77 reste ouvert**, c'est une décision de conception. Les six défauts CRITIQUES de l'audit sont désormais corrigés **et** vérifiés sur un support.

**Reste non vérifié sur les supports** : la remise à zéro du défilement au changement de
genre et le bouton « Retour » qui efface la recherche (TV-3), faute d'avoir su atteindre
ces états de façon fiable.

Ce qui ne relève pas de l'audit — facturation (trois points ouverts), TLS non validé
(**S1**, décision produit), sauvegarde du keystore, publication de `app-mobile` 15 / 1.2.0
et de `app-tv` (jamais publiée), dette connue — est dans
[`docs/RESTE_A_FAIRE.md`](docs/RESTE_A_FAIRE.md).

---

## 6. Les cinq pièges qui ont coûté le plus cher

Les 19 règles complètes sont dans [`docs/METHODE.md`](docs/METHODE.md) ; celles-ci se
paient à chaque fois qu'on les oublie.

1. **Une décision écrite deux fois, une par UI, finit toujours par diverger** — seule une
   des deux copies reçoit le correctif. L'extraire dans `core` et la tester là.
2. **Un test qui ne peut pas échouer ne prouve rien.** Chercher le signal *discriminant*,
   et sur un correctif d'affichage, mesurer les deux termes — build d'avant, build d'après,
   mêmes données (§32, §53).
3. **« Déclaré mais jamais branché » est le motif récurrent de ce code** — huit
   occurrences. Devant un contrôle inerte, chercher d'abord s'il est câblé.
4. **Une boucle de fond qui survit à son écran réécrit ce que l'utilisateur vient
   d'effacer.** Devant une suppression qui « ne prend pas », chercher qui écrit encore.
5. **Ne pas durcir un comportement qui marche quand on ne peut pas le vérifier en
   conditions réelles**, et ne jamais conclure d'un raisonnement différentiel dont un terme
   n'a pas été mesuré.
