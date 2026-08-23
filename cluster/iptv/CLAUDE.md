# CLAUDE.md — Purple IPTV Player

Mémoire de travail de l'agent. À maintenir à jour à chaque décision architecturale.

Dernière mise à jour : 2026-08-22

> **Où est le détail.** Ce fichier ne garde que ce qu'il faut savoir *avant* de toucher au
> code : où est le vrai code, les règles d'architecture, la toolchain, ce qui reste à
> faire, et les pièges à ne pas refaire. Le diagnostic complet de chaque défaut — mesures,
> traces, corrections de correction — vit dans **[`docs/JOURNAL.md`](docs/JOURNAL.md)**,
> indexé en §9 ci-dessous. Les renvois « §N » désignent une section de ce journal.
> Ouvrir le journal **à la section concernée** avant de retoucher un sujet qui y figure ;
> ne pas le recharger en entier.
>
> **Chantier en cours.** `AUDIT_TV_UX.md` (28 défauts du D-pad, relevés à l'émulateur) est
> transformé en spécifications dans **[`docs/PLAN_CORRECTION_TV.md`](docs/PLAN_CORRECTION_TV.md)** :
> pour chaque défaut, cause racine, solution, extrait Kotlin et priorité, en sept lots.
> Ouvrir la fiche du défaut avant d'y toucher — trois causes y sont **différentes** de
> celles supposées par l'audit (B3, B4, G10), cf. §42.

---

## 1. Ce qu'est ce projet (et où est le vrai code)

`cluster/iptv/` contient **deux applications** dont une seule est vivante.

| Chemin | Stack | Statut | LOC |
|---|---|---|---|
| `native/` | Kotlin / Jetpack Compose / Gradle | ✅ **ACTIF — c'est l'app à finaliser** | ~15 650 |
| `client/` | Flutter / Dart | ⚠️ **LEGACY — ne pas développer** | ~9 570 |
| `backend/` | (vide en local, artefacts only) | — | — |
| `tools/` | `generate_icons.py` | utilitaire | — |

**Preuves de cette décision** (ne pas la refaire à chaque session) :
- `ROADMAP_TV.txt` : « L'application avait été migrée de Flutter vers Kotlin natif
  pour résoudre des problèmes de navigation D-pad sur Android TV. »
- Sur les 40 derniers commits : **3352** modifications de fichiers dans `native/`
  contre **115** dans `client/`.
- `raf.md` référence Flutter uniquement comme source d'inspiration
  (« regarde comment c'est fait dans l'appli en Flutter »).

➡️ **Règle : tout nouveau code, correctif et test va dans `native/`.**
`client/` n'est touché que si l'on doit y relire une implémentation de référence.

### Piège d'environnement : la branche

`cluster/iptv/` est **ignoré par `.gitignore` sur `dev` et `main`** (ligne
`cluster/iptv/` — « appartient uniquement à la branche iptv »). Depuis `dev`, le
répertoire de travail ne contient que des artefacts de build et **le code source
est invisible**.

```bash
git checkout iptv        # OBLIGATOIRE avant toute intervention sur ce projet
```

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

**Règles d'architecture déduites — à respecter :**

1. **`core` est le seul détenteur de la logique métier.** `app-mobile` et `app-tv`
   sont deux présentations d'un même `core`. Un correctif de logique se fait dans
   `core`, jamais dupliqué dans les deux UI.
2. **DI par Koin**, pas de Hilt. Les Repositories sont injectés, pas instanciés.
3. **Persistance : DataStore Preferences** pour les préférences, `EncryptedSharedPreferences`
   comme couche de secours anti-fraude pour l'essai/abonnement, fichiers JSON
   (Moshi) dans `cacheDir` pour le catalogue.
4. **Toute lecture de données persistées doit être défensive.** `CacheRepository`
   applique déjà `runCatching { … }.getOrNull()` partout : c'est la norme du projet.
   `ProgressRepository` ne le fait pas — c'est un bug, pas un style alternatif (cf. §5 P2).
5. **Les `Flow` exposés publiquement ne doivent jamais pouvoir émettre une exception.**
   Une exception dans un `.map{}` de `Flow` remonte à tous les collecteurs et crashe
   l'écran Compose de façon définitive.
6. **Media3/ExoPlayer** côté natif (l'équivalent Flutter `media_kit` est legacy).

---

## 3. Toolchain — commandes vérifiées

Le projet a été travaillé sur **deux machines**. Ne pas confondre leurs chemins.

### Machine « rigolo » — celle qui détient la clé de signature (2026-08-19)

C'est la seule des deux qui peut produire un AAB signé (`upload-keystore.jks` présent).

```bash
export JAVA_HOME=<scratchpad>/jdk-17.0.20+8      # cf. ci-dessous, aucun JDK système
export PATH="$JAVA_HOME/bin:$PATH:/home/rigolo/Android/Sdk/platform-tools"
cd /home/rigolo/Documents/woc/cluster/iptv/native
```

| Point | État sur cette machine |
|---|---|
| `native/local.properties` | ✅ **déjà correct** (`sdk.dir=/home/rigolo/Android/Sdk`) — rien à ajuster ; c'est la version du dépôt, la machine « hjouini » n'avait pas committé sa correction |
| JDK | ⚠️ **absent** — seul `openjdk-17-jre-headless` est installé, **pas de `javac`**, et pas d'Android Studio. Gradle ne démarre pas. Résolu **sans sudo** en dépliant un Temurin 17 dans le scratchpad (`api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse`) |
| Android SDK | ✅ complet — build-tools 34/35/36.1/37, platforms 34→36.1, emulator, image `google_apis_playstore` android-37 |
| `adb` | ✅ sur le `PATH`, aucune règle udev à corriger |
| Appareil | ✅ **Pixel 7 (`panther`, Android 17) connecté et autorisé** |
| `upload-keystore.jks` | ✅ présent en `client/android/`, **vérifié** : alias `upload`, le mot de passe de `keystore.properties` l'ouvre, `PrivateKeyEntry` valide jusqu'en 2053, SHA1 `F6:0C:72:9C:…` |

### Machine « hjouini » — sans clé de signature

```bash
export JAVA_HOME=/home/hjouini/Downloads/android-studio-panda4-patch1-linux/android-studio/jbr
export PATH="$PATH:/home/hjouini/Android/Sdk/platform-tools"   # pour adb
cd /home/hjouini/Documents/ETNA/woc/cluster/iptv/native
```

| Besoin | Commande | Vérifié |
|---|---|---|
| Compiler la logique métier | `./gradlew :core:compileDebugKotlin` | ✅ BUILD SUCCESSFUL (2 m 21 s) |
| **Tests unitaires JVM (boucle de travail)** | `./gradlew :core:testDebugUnitTest` | ✅ **73 tests, 0 échec** (rejoué le 2026-08-19 sur « rigolo ») |
| Bundle de release signé | `./gradlew :app-mobile:bundleRelease` | ✅ (machine « rigolo » uniquement, 4 m 25 s) |
| Un seul test | `./gradlew :core:testDebugUnitTest --tests "*TrialPolicyTest*"` | ✅ |
| Build APK mobile | `./gradlew :app-mobile:assembleDebug` | ✅ |
| Build APK TV | `./gradlew :app-tv:assembleDebug` | ✅ |

Rapport HTML après échec : `core/build/reports/tests/testDebugUnitTest/index.html`.

Environnement constaté : Gradle 8.9, JBR 21.0.10, Android SDK 36.1.0
(`/home/hjouini/Android/Sdk`), `adb` présent mais **hors PATH**.

### Piloter un appareil réel

```bash
export PATH="$PATH:/home/hjouini/Android/Sdk/platform-tools"
adb devices -l
```

Deux obstacles rencontrés, tous deux résolus :

1. `no permissions (missing udev rules)` → nécessite un `sudo adb kill-server && sudo adb start-server`,
   à lancer par l'utilisateur.
2. `unauthorized` → la boîte « Autoriser le débogage USB ? » doit être validée sur le téléphone.

**L'app de production ne peut pas être écrasée par une build de debug** (signatures
différentes) et le keystore de release est absent de cette machine (cf. S2). Solution
retenue : `applicationIdSuffix = ".debug"` dans `app-mobile/build.gradle.kts`, ce qui
installe `com.purple.iptvplayer.debug` **à côté** de la production, dont les données
restent intactes. Contrepartie : Play Billing ne fonctionne pas sur cette variante.

**Simuler un état d'essai** — la variante debug est `debuggable`, donc `run-as` fonctionne.
DataStore stocke un protobuf trivial ; le script de génération est dans le scratchpad.
Piège : la redirection doit être **à l'intérieur** de `run-as`, sinon c'est le shell de
l'appareil (uid `shell`) qui tente l'écriture et échoue en `Permission denied` :

```bash
adb shell "run-as $P sh -c 'echo <base64> | base64 -d > /data/user/0/$P/files/datastore/trial_prefs.preferences_pb'"
```

C'est ce mécanisme qui a permis le test différentiel de P6. Il répond aussi à la demande
de `raf.md` (« un bouton qui simule la fin des trois jours ») — reste à l'exposer dans
l'UI derrière `BuildConfig.DEBUG`, ce qui n'est pas fait.

### Correctif d'environnement déjà appliqué

`native/local.properties` pointait vers `sdk.dir=/home/rigolo/Android/Sdk`
(chemin d'une autre machine) → Gradle échouait. Corrigé en
`sdk.dir=/home/hjouini/Android/Sdk` **dans le répertoire de travail uniquement**.

⚠️ **Ce fichier est versionné, et il ne devrait pas l'être** (commit `6b9c219b`).
`local.properties` est généré par Android Studio et propre à chaque machine : le
committer fait que le dépôt ne peut builder que chez un seul développeur à la fois.
**Ne pas committer la correction telle quelle** — elle casserait la machine
« rigolo » exactement comme l'originale cassait celle-ci. Le geste correct est de
le sortir du suivi :

```bash
git rm --cached cluster/iptv/native/local.properties
echo 'cluster/iptv/native/local.properties' >> .gitignore
```

---

## 4. Stratégie de test retenue

### État initial : **rien**

Aucun source set `src/test/` ni `src/androidTest/` dans les trois modules, aucune
dépendance de test dans `gradle/libs.versions.toml`. Seul vestige :
`app-mobile/src/test.kt`, un `DummyTest` placé **hors de tout source set** (donc
jamais compilé ni exécuté) — supprimé.

### Outillage retenu

| Outil | Rôle |
|---|---|
| **JUnit 4** | runner, standard AGP |
| **kotlinx-coroutines-test** | `runTest` pour les API `suspend` |
| **org.json:json** | implémentation réelle d'`org.json` sur le classpath de test |

Plus `testOptions { unitTests { isReturnDefaultValues = true } }` dans
`core/build.gradle.kts`.

Le point sensible est `org.json` : dans un test JVM nu, `JSONArray`/`JSONObject`
ne sont que des *stubs* d'`android.jar` qui lèvent « not mocked », ce qui rend
`ProgressRepository` intestable. Placer l'implémentation Maven réelle sur le
classpath de test suffit à lever le blocage — vérifié par
`ToolchainSmokeTest.orgJsonIsAvailable`, qui existe précisément pour empêcher
qu'on retire cette dépendance par mégarde.

### Robolectric : évalué puis écarté

Robolectric était le choix initial pour obtenir `org.json` et un `Context` réels.
Il s'est avéré **inutile** : en extrayant la logique métier en objets purs
([TrialPolicy], [RecentItemsCodec]), plus aucun test ne touche à Android. La suite
tourne en ~3 s au lieu de plusieurs dizaines de secondes, et on évite les
problèmes de compatibilité de Robolectric avec `compileSdk 36` ainsi que
l'`AndroidKeyStore` requis par `EncryptedSharedPreferences`.

➡️ **Règle qui en découle : on ne teste pas un Repository à travers Android ; on
extrait sa décision en objet pur et on teste celui-ci.** Robolectric n'est à
réintroduire que si l'on doit un jour tester DataStore ou les `Flow` d'un
Repository de bout en bout (ajouter alors Turbine et MockK).

### Outils écartés — et pourquoi

- **Espresso / `androidTest` / Maestro** : écartés pour l'instant. `adb devices`
  ne retourne **aucun appareil** et `flutter emulators` → *No emulators available*.
  Aucun test instrumenté ne peut s'exécuter dans cet environnement. Les rebrancher
  le jour où un appareil ou un AVD est disponible.
- **Compose UI Test** : reporté. Les 3 bugs critiques sont tous dans `core`
  (logique pure), pas dans l'UI. On teste d'abord là où est le risque.

➡️ **Boucle de travail = `./gradlew :core:testDebugUnitTest`** : rapide, sans
appareil, et couvre exactement la couche où se trouvent les défauts.

### Convention

Tests dans `core/src/test/kotlin/com/purple/iptvplayer/core/…`, miroir de
l'arborescence `main`. Un fichier `XxxTest.kt` par classe testée.

### Testabilité — décision architecturale

`TrialRepository` lit l'heure via `System.currentTimeMillis()` en dur, ce qui rend
la logique d'essai/abonnement **non testable de façon déterministe**. Décision :
**injecter une source de temps** (paramètre `now: () -> Long = System::currentTimeMillis`)
plutôt que de manipuler l'horloge système dans les tests. Même principe pour toute
future logique dépendant du temps.

---

## 5. Défauts identifiés — index

Détail complet : `docs/JOURNAL.md` §5. Tous identifiés par **lecture du code**, pas par
reprise des notes existantes, et traités en Test-First : test écrit d'abord, échec
constaté, puis correction.

| # | Défaut | Provenance |
|---|---|---|
| P1 | abonné payant éjecté le dernier jour | lecture de `TrialRepository` |
| P2 | crash définitif de « Reprendre la lecture » | comparaison de posture défensive avec `CacheRepository` |
| P3 | nom de chaîne tronqué à la virgule | lecture de la regex + exécution sur le jumeau Flutter |
| P3 bis | épisodes de séries classés en films | **tombé sur un test de non-régression** |
| P4 | identifiants non encodés dans les URL | lecture de `XtreamApiClient` |
| P5 | titres EPG en clair détruits | lecture de `parseEpg` |
| P6 | **l'app mobile ne bloque jamais un utilisateur expiré** | **observé sur appareil**, cause trouvée dans `NavGraph` |
| P7 | décorations `●` conservées dans les noms de chaînes | **observé sur appareil**, prouvé sur les chaînes réelles |
| P8 | le catalogue en cache n'expire jamais | lecture de `CacheRepository` vs son jumeau Flutter |
| P9 | « Maybe later » sur l'écran de blocage | **observé sur appareil** |
| P10 | carte EPG jamais masquée, et horloge figée | **observé sur appareil** + `raf.md` |
| P11 | horaires EPG décalés d'une heure, barre d'avancement figée | **observé sur appareil**, 20:28 local affiché « 19:00 – 19:45 » |
| S1 | validation TLS entièrement désactivée | lecture de `buildTrustAllClient` — **non corrigé, décision produit** |
| S2 | mot de passe de signature commité en clair | `native/keystore.properties` suivi par git — **corrigé, cf. §31** |
| S3 | **le `signingConfig` ne trouvait jamais le keystore** | `bundleRelease` en échec sur la machine qui détient la clé — **corrigé** |
| B1 | facturation : six défauts, dont l'abonné bloqué au 30ᵉ jour | lecture de `BillingRepository`, paramétrage confirmé par l'utilisateur |
| B2 | un achat remboursé/révoqué ne retire jamais l'accès | lecture de `syncEntitlements` — **corrigé, cf. §32** |
| B3 | prix des abonnements affiché « N/A » sur le paywall | **observé sur appareil** — **non corrigé** |

Corrigés depuis : **B3** (prix des abonnements, §10), **B1** les six défauts (§9, §12),
**B2** (révocation, §32), **S2/S3** (signature, §31). Restent ouverts : **S1** (TLS) et
les trois points de facturation listés en §6.

**État de la suite : 244 tests, 0 échec** — 186 dans `core`
(`./gradlew :core:testDebugUnitTest`) + 58 dans `app-tv`
(`./gradlew :app-tv:testDebugUnitTest`, source set créé au §43).

Contrôle des libellés avant toute publication : `python3 tools/check_strings.py`
(parité `<string>` **et** `<plurals>`, plus détection des littéraux — cf. §48).

⚠️ **Avant toute vérification à l'émulateur, lire les pièges d'outillage du §44** : instantané
d'AVD qui corrompt `screencap`, et `compileDebugKotlin UP-TO-DATE` sur une source modifiée.

---

## 6. Reste à faire

Tout ce qui est fait est consigné dans le journal ; seuls les points **ouverts** figurent
ici.

### Facturation

- [ ] Décider si l'on monte en `billing:9.x` — exige `minSdk 23` côté mobile (`app-mobile`
      est en 21, `app-tv` déjà en 23). La 8.0.0 en place satisfait l'échéance Play du
      31 août 2026 ; la prochaine migration sera exigée vers mi-2027. Cf. §12.
- [ ] **B1.5 non observé** : impossible de provoquer un échec de facturation, Play Billing
      sert son cache local. À retenter autrement. Cf. §9.
- [ ] `deliverProduct()` code 30 et 365 jours en dur ; l'échéance réelle exige la Play
      Developer API, donc un serveur. Un abonnement résilié reste donc ouvert jusqu'à
      30 jours. Cf. §5 B1 et §32.

### Dette et sécurité

- [ ] Trancher **S1** (validation TLS entièrement désactivée dans `buildTrustAllClient`) —
      décision produit, cf. §5 S1.
- [ ] Décider si l'on réécrit l'historique pour purger l'ancien mot de passe de signature
      (§31) — il est désormais **sans valeur**, et la réécriture impose un `push --force`
      sur un dépôt partagé.
- [ ] ⚠️ **Sauvegarder `upload-keystore.jks` hors machine** : il n'existe que sur la
      machine « rigolo ». Le perdre rend toute mise à jour impossible sans reset de clé
      auprès de Google. Plus urgent que la réécriture d'historique (§31).
- [ ] Trancher le sort du parc TV resté sur l'ancienne fiche `com.purple.iptvplayer`
      (build Flutter) : il ne recevra plus aucune mise à jour et ne migrera pas seul vers
      `com.purple.iptvplayer.tv`. Cf. §9.

### Couverture

- [ ] `DownloadRepository` et `PlayerService` : aucune couverture.
- [ ] Tests instrumentés (Compose UI) : désormais possibles, un émulateur TV existe (§11).

### Publication

- [ ] **`app-tv` n'est pas publiée sur le Play Store** : la build 10 / 1.2.1 n'existe qu'en
      chargement latéral. Tout le travail TV (deux panneaux, carte EPG, VF/VOSTFR, les
      quatre correctifs de focus, conservation d'état) n'est donc pas distribué. Cf. §41.
- [ ] Réactiver `NullSafeMutableLiveData` dans `app-tv/build.gradle.kts` le jour où les
      versions de lint s'alignent (désactivé pour débloquer la release, §31).

### Sorti de la liste — ne pas reproposer

- ~~Bouton de simulation de fin d'essai derrière `BuildConfig.DEBUG`~~ — **annulé par
  l'utilisateur le 2026-08-20.** Le besoin reste couvert hors UI par `mkprefs.py` +
  `run-as` (§3).
- ~~Cast d'une chaîne TV : son sans image~~ — **sorti par l'utilisateur le 2026-08-20.**
  Le récepteur est seul juge du format, la compatibilité n'est pas connaissable côté
  client (§34, §36).

---

## 7. Dette connue, non bloquante

- ⚠️ **Les artefacts de build sont suivis par git** : `native/.gradle/`,
  `native/*/build/`, `native/.kotlin/`. Une simple exécution de `./gradlew` salit **279
  fichiers** (verrous, caches binaires, `classes.jar`), qui noient les vraies
  modifications dans `git status` et provoquent des conflits à chaque `pull`. Toute
  commande de commit doit viser les fichiers explicitement — **jamais `git add -A`**.
  À sortir du suivi (`git rm -r --cached`) et à ajouter au `.gitignore`.
- `client/current_build.dart` (Flutter, legacy) : fragment de code orphelin de
  733 lignes, non rattaché à `lib/`, qui produit à lui seul **611 des 717 erreurs**
  de `flutter analyze`. Rend toute barrière qualité impossible côté Flutter.
  À supprimer si l'on décide de maintenir `client/`.
- `client/lib/utils/text_utils.dart` · `decodeIfNeeded()` : détection base64 par
  heuristique, avec repli `latin1` qui n'échoue jamais. Corrompt des noms courants —
  vérifié : `"SPORTSHD"` → `"HóM!Ã"`, `"KIDSZONE"` → `"(ÒdãD"`, `"Aventure"` → `"÷§¶êÞ"`.
  Le `decodeIfNeeded` de `M3uParserService` (Kotlin) est sain, lui — pas de devinette
  base64 : ne pas « réaligner » le natif sur le Flutter. ⚠️ Attention à ne pas étendre
  ce constat à tout le natif : `XtreamApiClient.decodeBase64OrSelf` portait exactement
  le même défaut sur les libellés EPG (cf. §5 P5, corrigé).
- `BillingRepository.kt:50,53` : warnings d'opt-in `@ExperimentalCoroutinesApi`.
- `MainScreen.kt:163-181` : le bandeau n'est masqué que si `isPro`, c'est-à-dire pour le
  seul achat « à vie ». Un abonné **mensuel ou annuel** — donc payant — se voit annoncer
  « **Essai gratuit** : 30 jours restants. » avec un bouton « ACTIVER ». Formulation
  fausse pour un client à jour de paiement. Le correctif naturel est de tester
  `isPremium()` plutôt que `isPro`, mais **ne pas y toucher avant la vérification B1** :
  c'est précisément ce bandeau qui sert d'instrument de mesure pour B1.4 (cf. §9).

---

## 8. Règles de méthode — ce que ce chantier a coûté pour apprendre

Chacune vient d'une erreur réellement commise, référencée dans le journal. Les relire
évite de la refaire ; le détail est à la section citée.

1. **Ne pas durcir un comportement qui fonctionne quand on ne peut pas le vérifier en
   conditions réelles.** L'encodage de la query était un vrai correctif, vérifiable ;
   l'étendre aux segments de chemin était gratuit et risquait 11 889 URL de flux
   (§5 P4). Rencontré une seconde fois sur le type MIME du cast (§36).
2. **Une décision écrite deux fois, une par UI, finit toujours par diverger** — les
   correctifs ne sont appliqués qu'à une copie. Constaté sur l'EPG (§28), le nettoyage
   des titres d'épisodes (§33.1), la sélection de pistes (§29). ➡️ extraire la décision
   dans `core` et la tester là.
3. **Un test qui ne peut pas échouer ne prouve rien.** « L'accès revient après
   `pm clear` » était vrai quoi qu'il arrive, l'essai neuf le rendant. Chercher le
   **signal discriminant** — ici le *nombre de jours* affiché (§9 B1.4, §32).
4. **Compter et reproduire avant de conclure à un défaut de focus.** Le « défaut 11 »
   n'existait pas : il n'y avait qu'un seul résultat, donc rien à droite (§24). Le
   « focus qui s'échappe en fin de liste » ne se produit pas au cas décrit, mais sur une
   liste plus courte que l'écran (§30).
5. **Un raisonnement différentiel ne vaut que si *chaque* terme est mesuré.** Un seul
   fait non vérifié — le conteneur du témoin positif — a inversé la conclusion sur le
   cast, et le reste de la chaîne, correct, lui a donné l'apparence de la rigueur (§36).
6. **Supprimer un élément d'interface mal libellé supprime aussi la fonction qu'il
   portait.** Retirer « ACTIVER » à l'abonné a supprimé le seul chemin vers l'écran
   d'achat (§10). Vérifier ce qu'on retire, pas seulement ce qu'on ajoute — de même,
   ajouter `FLAG_KEEP_SCREEN_ON` impose de le retirer à la sortie (§18).
7. **« Déclaré mais jamais branché » est le motif récurrent de ce code** — sept
   occurrences : `onPurchase` (§10 UX-2), `onFav` (§13), `TvToggleOption` (§19), le
   `modifier` de `MiniBar` (§33), `lastInteractionMs` (§29), les `FocusRequester` du
   rail (§40), l'`onClose` de `TvRecentCard` (§49). Devant un contrôle inerte, chercher
   d'abord s'il est câblé.
8. **Compose** : modifier l'état qui sert de clé à un `LaunchedEffect` l'annule et le
   relance (§23) ; un `LaunchedEffect` s'exécute **aussi à la première composition**
   (§40) ; `produceState` sans clé capture la valeur initiale (§5 P6) ;
   `rememberSaveable` ne survit pas à un `when (index)` qui retire l'onglet de la
   composition — il faut `SaveableStateProvider` (§38).
9. **Un format de ressource mal typé ne se voit pas à la compilation** : `%d` recevant
   une `String` fait tomber l'écran à l'exécution. Toute extraction de libellés exige un
   contrôle type-par-type de chaque argument (§20).
10. **Sur télécommande, le nombre d'appuis compte plus que le nombre de lignes
    visibles.** Une optimisation de densité qui allonge un chemin D-pad est un mauvais
    échange (§25). Et un focalisable de plus a un coût : ne l'ajouter que s'il sert (§29).
11. **Avaler une exception peut supprimer un repli utile.** Rendre une liste vide au lieu
    de lever aurait empêché le repli hors-ligne *et* écrasé le cache pour 24 h : une
    panne bruyante vaut mieux qu'une panne silencieuse et destructrice (§27).
12. **Le clavier virtuel TV avale les touches directionnelles** — piège de test *et*
    défaut réel pour l'utilisateur (§22, §26). Contrôler
    `dumpsys input_method | grep mInputShown` avant de conclure à un défaut de focus.
13. **Ne jamais committer un secret ni un lien d'abonnement** : le dépôt est partagé. Le
    lien M3U par défaut passe par `local.properties` (ignoré) et `BuildConfig`, vide par
    défaut (§41) ; `keystore.properties` a été sorti du suivi (§31).
14. **Toute modification de la gestion du focus TV se vérifie à l'émulateur** (§11) —
    c'est précisément le sujet qui a fait quitter Flutter. Une correction trop large
    piège le focus, défaut pire que celui corrigé (§23, §30).
15. **Une boucle de fond qui survit à son écran réécrit ce que l'utilisateur vient
    d'effacer.** « Impossible de retirer » se lisait comme un défaut de l'interface ; la
    cause était un `while (true)` jamais annulé qui réinsérait l'entrée dix secondes plus
    tard. Devant une suppression qui « ne prend pas », chercher qui écrit encore (§49).
16. **Play ne fait autorité que sur ce qu'il a lui-même installé.** Sur une variante à
    `applicationId` suffixé il répond « OK, liste vide » : en conclure une révocation met
    dehors un utilisateur légitime (§32). Toute observation de facturation faite hors
    d'une build installée par `com.android.vending` est ininterprétable (§9).

---

## 9. Index du journal (`docs/JOURNAL.md`)

| § | Sujet | À ouvrir quand… |
|---|---|---|
| 5 | Les 19 défauts P1–P11, S1–S3, B1–B3, en détail | on retouche `TrialRepository`, `M3uParserService`, `XtreamApiClient`, `CacheRepository`, `NavGraph` |
| 8 | Panne fournisseur du 2026-08-18 — **l'IP du fournisseur est bloquée en Wi-Fi** | un test réseau échoue depuis le poste ⇒ passer en données mobiles ou VPN |
| 9 | Procédure de vérification de la facturation, et pourquoi un APK signé localement ne suffit pas | on touche à Play Billing ou à une publication |
| 10 | UX-1 — les quatre états d'accès (`Pro`/`Subscribed`/`Trial`/`Expired`) ; UX-2 — achat sur TV | on touche au bandeau premium ou au paywall |
| 11 | Émulateur Android TV : création, lancement (`-gpu host`), pièges (`LEANBACK_LAUNCHER`, focus sans libellé) | on doit vérifier `app-tv` |
| 12 | Migration Play Billing 7 → 8 ; pourquoi pas 9.x (`minSdk`) | on envisage `billing:9.x` |
| 13 | Refonte de la navigation live (liste dense mobile) ; les favoris de chaînes n'étaient lus par personne | on touche à `HomeScreen` ou `LayoutMode` |
| 14 | Favoris de chaînes sur TV — le retrait n'était pas cassé, il était introuvable | on touche à `TvMyListScreen` / `TvHomeScreen` (deux panneaux) |
| 15 | Ordre des favoris : passage du `Set` à une liste ordonnée, migration paresseuse | on touche à `FavoritesRepository` / `FavoritesCodec` |
| 16 | Le rail TV qui s'ouvre après une mutation de liste (`refocusAfterEdit`) | défaut de focus après retrait/déplacement |
| 17 | Localisation : le défaut allait dans les deux sens + **contrôle de parité des `strings.xml`** | on ajoute un libellé (rejouer le script de parité) |
| 18 | Plein écran immersif et `FLAG_KEEP_SCREEN_ON` | on touche aux écrans de lecture |
| 19 | Paramètres TV alignés sur le mobile ; fiche film TV (piège de la largeur d'affiche) | on retouche `TvSettings` ou `TvMovieScreen` |
| 20 | La fiche série plantait — `%d` recevant une `String` | on extrait des libellés en ressources |
| 21 | Fiche série TV : `stripSeriesName`, densité, 37 saisons | on retouche `TvSeriesScreen` |
| 22 | Recherche TV inatteignable au D-pad — le champ de texte consomme les directions | on touche à `TvSearchBar` |
| 23 | Focus TV : liseré d'onglet actif indépendant du focus ; piège du `LaunchedEffect` | avant toute correction de focus |
| 24 | Le « défaut 11 » n'existait pas ; séries à 37 saisons vérifiées | — (leçon de méthode, cf. §8.4) |
| 25 | Fiche série : focus d'arrivée sur le premier épisode, bouton de téléchargement accessible | on redispose une fiche TV |
| 26 | Clavier virtuel à la demande (`canFocus = editing`) | on touche à la saisie sur TV |
| 27 | Parseurs de catalogue : la tolérance ne doit pas être uniforme (lever / dégrader / écarter) | on touche à `parseChannels`/`parseMovies`/`parseSeries` |
| 28 | Carte EPG TV — P10/P11 n'avaient jamais été portés ; `core/epg/EpgTimeline` | on touche à l'EPG |
| 29 | VF / VOSTFR — la première piste est une piste **forcée** ; `VersionPolicy` | on touche à la sélection de pistes |
| 30 | Focus qui s'échappe vers le rail : garde-fou posé **côté rail** (`enter`) | défaut de focus en fin de liste |
| 31 | Secret de signature : mot de passe changé, 3121 artefacts sortis du suivi, lint TV débloqué | on touche à la signature ou au `.gitignore` |
| 32 | B2 — réconcilier les droits sans déconnecter les abonnés légitimes | on touche à `syncEntitlements` |
| 33 | Quatre défauts de la fiche série mobile + télécommande de cast | on retouche la fiche série mobile ou le cast |
| 34 | Cast : type MIME, suivi de progression depuis le récepteur | on touche à `CastRepository` |
| 35 | `rememberSaveable` sur les écrans de recherche ; synopsis dépliable | on ajoute un état d'écran |
| 36 | Régression du cast — le fait décisif n'avait pas été vérifié | avant de bloquer un contenu sur son format |
| 37 | Grille irrégulière (`minLines = 2`) — défaut ancien, pas une régression | on touche aux cartes de grille |
| 38 | Pourquoi il n'y a pas de « partie commune » d'UI entre mobile et TV | on croit pouvoir corriger les deux UI d'un geste |
| 39 | Le sélecteur de disposition n'agissait pas sur Films et Séries | on touche à `layoutMode` |
| 40 | Le rail TV happait le focus — un correctif du §23 devenu la cause | défaut de focus au lancement ou au changement d'onglet |
| 41 | Première build de release TV (10 / 1.2.1) ; lien M3U pré-rempli sans le committer | on publie `app-tv` |
| 42 | **Audit UX du D-pad : 28 défauts** → plan d'implémentation ; 3 causes racines révisées, `androidx.tv.foundation` déprécié | on corrige un défaut de `AUDIT_TV_UX.md` |
| 43 | **Lots 0 et 1 livrés** (B1–B4) ; `TvFocusKit`, `TvNavPolicy` ; pièges `uiautomator`/`screencap` de l'émulateur | on corrige un bloquant TV ou on vérifie à l'émulateur |
| 44 | **Lot 2 livré** (G2–G7, G9) ; **l'ordre `focusProperties`/`focusGroup` décide de tout** ; instantané d'AVD corrompu, Gradle `UP-TO-DATE` menteur | on touche au focus TV, ou avant une session émulateur |
| 45 | **Lot 3 livré** (G1, G13, M1, M9) ; **G1 venait de `core`** — `STATE_IDLE` écrasait `ERROR`, le bloc d'erreur du **mobile** n'avait jamais marché non plus | on touche à `PlayerService`, au lecteur, ou à un état d'erreur |
| 46 | **Lot 4 livré** (G10, M3, M6) ; **le contenu suit la clarté du fond** — le jeton sombre vaut 6,00 sur l'accent focalisé mais 3,68 sur l'accent pressé | on touche à une couleur de focus ou à une taille de police |
| 47 | **Lot 5 livré** (G8, G11, G12, G15) ; **une boucle synchrone de `moveFocus` ne marche pas dans une liste paresseuse** ; `bounds` ne mesure pas un saut de liste | on touche à un saut de page ou au panneau des genres |
| 48 | **Lot 6 livré** (M2, M5, M7, M8) ; `tools/check_strings.py` — parité `<plurals>` + littéraux **non accentués** ; il a trouvé **5 libellés français en dur dans `app-mobile`** | on ajoute un libellé, ou avant une publication |
| 49 | **Trois défauts remontés à l'usage** : la reprise de lecture se réinsérait toute seule (boucle jamais annulée) ; le sélecteur de pistes proposait des pistes que le décodeur refuse, sans issue ; `▼` depuis un genre tombait au milieu de la rangée | on touche à `ProgressRepository`/`PlayerViewModel`, au sélecteur de pistes, ou à l'entrée d'une rangée TV |
| 50 | **L'app mobile réorganisée autour des thèmes** : `LayoutMode` supprimé, tiroir et burger retirés ; le tiroir portait **quatre** fonctions, trois replacées, une perdue sciemment ; « Tout » → « Thèmes » dans « Ma liste » | on touche à la navigation mobile, à un mode d'affichage, ou aux favoris de thème |
