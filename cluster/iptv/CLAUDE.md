# CLAUDE.md — Purple IPTV Player

Mémoire de travail de l'agent. À maintenir à jour à chaque décision architecturale.

Dernière mise à jour : 2026-08-18

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

## 5. Défauts identifiés et corrigés

Tous identifiés par **lecture du code**, pas par reprise des notes existantes.
`raf.md` n'apporte, et seulement pour P1, qu'une question sans diagnostic ; P2 à P6
n'y figurent pas du tout. Chacun a été traité en Test-First : test écrit d'abord,
échec constaté, puis correction. **70 tests, 0 échec.**

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

### P1 — Un abonné payant est éjecté de l'app le dernier jour de son abonnement
`core/data/TrialRepository.kt` · `getRemainingDays()`

```kotlin
val diff = ((expiry - System.currentTimeMillis()) / 86_400_000L).toInt()
if (diff > 0) return diff        // ← abonnement valide 10 h ⇒ diff == 0 ⇒ ignoré
```

La division entière tronque : à moins de 24 h de l'échéance, `diff` vaut `0`, la
branche est ignorée, le code retombe sur le calcul d'essai (expiré) et renvoie `0`.
`hasAccess()` renvoie alors `false` **alors que `isPremium()` renvoie `true`** —
les deux méthodes de la même classe se contredisent. Un client qui a payé est
bloqué hors de l'application pendant sa dernière journée.

Effet de bord de la même chute : un abonnement expiré retombe sur l'essai ; si
`trial_start_date` est absent (restauration/réinstallation), `getTrialStartMs()`
renvoie `null` et la méthode **réoffre 3 jours gratuits**.

Recoupe `raf.md` : « La logique de blocage de l'appli est-elle respectée et
fonctionnelle ? Est-on certain qu'elle bloque vraiment l'appli pour le user ? »

**Sévérité : haute — impact revenu et support.**

### P2 — Crash définitif de « Reprendre la lecture » sur cache corrompu
`core/data/ProgressRepository.kt` · `parseRecentJson()`

```kotlin
val arr = JSONArray(json)                    // lève JSONException si malformé
… o.getString("id"), o.getLong("progress")   // lèvent si la clé manque
```

Aucune protection, alors que `CacheRepository` enveloppe systématiquement ses
lectures dans `runCatching`. Cette fonction est appelée depuis le `Flow`
`recentItems` : l'exception remonte à tous les collecteurs et crashe l'écran.
Pire, `updateRecentList()` et `removeFromRecent()` l'appellent aussi — l'utilisateur
ne peut donc **même pas réparer l'état en regardant autre chose**. Une seule
entrée corrompue (mise à jour ajoutant un champ, écriture interrompue) rend la
fonctionnalité définitivement inutilisable.

**Sévérité : haute — crash irrécupérable sans réinstallation.**

### P3 — Noms de chaînes tronqués à la virgule
`core/network/M3uParserService.kt` · `nameRegex = Regex(""",([^,]*)$""")`

L'ancre `$` capturait ce qui suit la **dernière** virgule, alors que le format M3U
place le nom après la **première** virgule suivant les attributs.
`#EXTINF:-1 group-title="FR",Canal+, Le Sport` → nom obtenu **`Le Sport`** :
la marque est perdue. Touche tout fournisseur dont les noms contiennent une virgule.

**Correction** : remplacement de la regex par un balayage `displayNamePart()` qui
retient la première virgule **hors guillemets**. Une simple « première virgule »
n'aurait pas suffi : un attribut du type `group-title="Sports, Live"` l'aurait
piégée. Nom vide ⇒ `"Unknown"`, ce que l'ancien `?: "Unknown"` ne faisait pas
(il ne couvrait que l'absence totale de correspondance).

**Sévérité : moyenne-haute — corruption de catalogue visible par l'utilisateur.**

### P3 bis — Épisodes de séries classés comme films *(découvert par les tests)*
`core/network/M3uParserService.kt` · détection du `ContentType`

Ce défaut n'était pas dans l'audit initial : le test de non-régression sur la
détection de type l'a fait tomber.

```kotlin
line.contains("/movie/") || line.endsWith(".mp4") || line.endsWith(".mkv") -> MOVIE
line.contains("/series/") -> SERIES        // ← jamais atteint pour un .mp4
```

L'ordre des branches condamnait la détection des séries : les fournisseurs Xtream
servent les épisodes sous `/series/….mp4`, donc la branche `MOVIE` gagnait
systématiquement. Les épisodes atterrissaient dans l'onglet **Films**.
Corrigé en testant `/series/` en premier.

**Sévérité : moyenne — mauvais rangement du catalogue sur les sources M3U.**

### P4 — Impossible de se connecter avec un mot de passe à caractères spéciaux
`core/network/XtreamApiClient.kt` · `playerApiUrl()` et URL de flux

```kotlin
"${c.host}/player_api.php?username=${c.user}&password=${c.pass}"   // aucun encodage
```

`playerApiUrl()` conditionne l'authentification **et** les onze appels catalogue.
Sans encodage :

- un `+` dans le mot de passe est décodé par PHP comme un **espace** → échec d'auth ;
- un `&` scinde la query et injecte un paramètre → échec d'auth ;
- un `#` transforme le reste de l'URL en fragment → le serveur ne le voit jamais ;
- `user`/`pass` étant `String?`, une valeur nulle produisait le littéral `"null"`.

L'aller-retour était rompu de façon structurelle : `Credentials.parseUrl()` extrait
les identifiants via `Uri.getQueryParameter()`, qui **décode** le pourcentage, et le
client les réémettait bruts.

**Correction** : `encodeQuery()` pour la query, `encodePathSegment()` pour les URL de
flux. Les quatre constructions d'URL de flux passent par un `streamUrl()` unique.

⚠️ **Correction de la correction — à lire avant de retoucher à ceci.**
La première version appliquait `URLEncoder.encode` **aussi** aux segments de chemin.
Sur un abonnement réel dont le mot de passe contient `@`, cela réécrivait les 11 889
URL de flux (`PASS` → `PASS%40`). Les panneaux Xtream comparent le chemin **brut** :
le risque de rupture était réel, et invérifiable depuis ce poste (le fournisseur n'est
pas joignable en TCP depuis le réseau de développement).

`encodePathSegment()` n'encode donc plus que `/ ? # espace` — ce qui casse
structurellement l'URL — et laisse tout le reste intact.

Asymétrie assumée entre les deux encodeurs :

| | query string | segment de chemin |
|---|---|---|
| encodage | complet (`URLEncoder`) | minimal (`/ ? # espace`) |
| statut | **prouvé** : catalogue de 11 889 chaînes chargé avec un mot de passe contenant `@` | conservateur, préserve le comportement historique |

**Leçon** : ne pas durcir un comportement qui fonctionne quand on ne peut pas le
vérifier en conditions réelles. L'encodage de la query était un vrai correctif,
vérifiable ; celui du chemin était une extension gratuite, et elle a introduit un
risque que rien ne justifiait.

**Sévérité : haute — l'utilisateur ne peut pas se connecter, sans message explicatif.**

### P5 — Tous les titres EPG en clair sont détruits
`core/network/XtreamApiClient.kt` · `parseEpg()` → `decodeBase64OrSelf()`

```kotlin
android.util.Base64.decode(this, DEFAULT).toString(Charsets.UTF_8).trim()
```

Les panneaux Xtream encodent *généralement* l'EPG en base64, mais pas tous. Le
décodage était inconditionnel, et `ByteArray.toString(UTF_8)` substitue des
caractères de remplacement **sans jamais lever** : le `runCatching` ne rattrapait
donc rien. Mesuré par les tests :

| Titre envoyé en clair | Titre affiché |
|---|---|
| `News` | `5�,` |
| `Football` | `?�-m�e` |
| `Cinema` | `)ޙ` |
| `Le Journal de 20h` | `-�h��ڕ׶�` |

**Correction** : `EpgTextDecoder` avec quatre garde-fous cumulés — base64 canonique,
**ré-encodage devant redonner l'entrée exacte** (le filtre décisif), UTF-8
strictement validé, absence de caractère de contrôle exotique. Passage à okio au
lieu d'`android.util.Base64`, qui n'est qu'un stub sur la JVM : un test écrit contre
lui passait sans rien vérifier.

**Sévérité : haute — EPG illisible sur tout fournisseur envoyant du texte en clair.**

### S1 — Validation TLS entièrement désactivée *(non corrigé — décision produit)*
`core/network/XtreamApiClient.kt` · `buildTrustAllClient()`

`checkServerTrusted` vide, `getAcceptedIssuers` vide, `hostnameVerifier { _, _ -> true }`.
Toute vérification de certificat est neutralisée, alors que `playerApiUrl()` fait
voyager `username` et `password` dans la query string : un attaquant sur le réseau
récupère les identifiants d'abonnement. C'est aussi un motif classique de rejet
Google Play (« unsafe TrustManager »).

**Volontairement non corrigé** : beaucoup de fournisseurs IPTV ont des certificats
invalides, et durcir la validation casserait leurs flux. Le compromis est un choix
produit. Piste raisonnable : conserver le repli permissif mais uniquement en HTTP
explicite, ou n'accepter les certificats douteux qu'après consentement de
l'utilisateur pour un hôte donné.

### B1 — Facturation : six défauts — ✅ corrigés
`core/data/BillingRepository.kt` · `core/viewmodel/PurchaseViewModel.kt` · `core/viewmodel/TrialViewModel.kt`

**Paramétrage Play Console confirmé par l'utilisateur** : `purple_monthly_099` et
`purple_yearly_499` sont des **abonnements**, `purple_lifetime_999` un **achat unique**.

1. **`queryProducts()` n'interrogeait que `INAPP`.** Les deux abonnements n'étaient
   donc jamais retournés et seul le produit « à vie » s'affichait — c'est exactement
   le symptôme de `raf.md`, « quand je clique sur ACTIVER, seul un abonnement est
   proposé ». Les deux catalogues sont désormais interrogés.
2. **`launchBillingFlow()` ne gérait pas les abonnements** : `oneTimePurchaseOfferDetails ?: return`
   sortait en silence, et le `setOfferToken` obligatoire manquait. Appuyer sur le
   bouton n'aurait rien produit, sans message.
3. **`restorePurchases()` n'interrogeait que `INAPP`** : un abonné réinstallant
   l'application ne récupérait jamais son accès.
4. **L'abonné était bloqué au 30ᵉ jour.** `deliverProduct()` pose une échéance locale
   de 30 jours, mais Play renouvelle sans réveiller l'application, et
   `restorePurchases()` n'était appelé **que** depuis le bouton « Restaurer » de
   l'écran d'achat — jamais au démarrage. Un client à jour de paiement perdait donc
   l'accès chaque mois, avec pour seul recours d'aller appuyer lui-même sur
   « Restaurer ». Même famille que P1, qu'il aggravait.

   `syncEntitlements()` réaligne l'accès sur ce que Play connaît, et `TrialViewModel`
   l'appelle **avant** de décider de l'accès. Sous `withTimeoutOrNull(4 s)` : l'écran
   de lancement attend cette résolution, un service de facturation lent ou injoignable
   ne doit pas figer le démarrage. Mesuré sur appareil, facturation indisponible :
   démarrage à ~900 ms, stable sur trois lancements.
5. **Les échecs étaient avalés.** `queryProducts()` ignorait un `responseCode != OK` et
   `loadProducts()` enveloppait tout dans un `runCatching` muet : l'écran affichait
   « No products available » aussi bien pour une Play Console mal configurée que pour
   une panne de service, sans moyen de distinguer les deux. Les codes de réponse sont
   désormais traduits en messages exploitables, et une restauration qui ne trouve rien
   le dit.
6. **Une annulation était présentée comme une erreur**, avec `debugMessage` — un texte
   technique jamais destiné à l'utilisateur. `PurchaseResult.Cancelled` ramène
   simplement à l'écran.

Défaut de tri corrigé au passage : le classement par prix lisait
`oneTimePurchaseOfferDetails`, `null` pour un abonnement, ce qui les plaçait tous en
tête à prix nul.

✅ **B1.4 est désormais prouvé sur appareil** (2026-08-19, build installée depuis Play — cf. §9).
Les quatre correctifs qui exigent l'écran d'achat restent non vérifiés, le compte de test
possédant déjà l'achat « à vie » qui masque le seul point d'entrée vers cet écran.

⚠️ **Historique — rien de tout ceci n'était vérifiable sur la machine « hjouini »** : la variante `.debug` a un
`applicationId` suffixé, donc étrangère à Play Billing, et un test réel exige un
compte testeur et une build publiée. Seul le non-blocage du démarrage a pu être
mesuré. À valider en piste fermée avant diffusion.

**Reste à traiter** : `deliverProduct()` code encore 30 et 365 jours en dur. Tant que
`syncEntitlements()` tourne à chaque démarrage, l'accès est continûment prolongé et le
comportement est correct ; mais un abonnement résilié reste ouvert jusqu'à 30 jours
après la fin réelle. Le corriger proprement demande l'échéance réelle, qui n'est pas
exposée côté client — il faut la Play Developer API, donc un serveur.

### B3 — Le prix des abonnements s'affiche « N/A » sur l'écran d'achat *(observé sur appareil, non corrigé)*
`app-mobile/…/ui/purchase/PurchaseScreen.kt:131`

```kotlin
val price = product.oneTimePurchaseOfferDetails?.formattedPrice ?: "N/A"
```

Un abonnement n'a pas d'`oneTimePurchaseOfferDetails` : les deux abonnements affichent
donc **« N/A »** là où « à vie » affiche « 9,99 € ». Mesuré sur l'écran réel :

```
Monthly   N/A  / month     SAVE 58%
Yearly    N/A  / year      BEST DEAL
Lifetime  9,99 €  one-time
```

Le prix **existe** pourtant : la feuille de paiement Google, ouverte depuis ce même bouton,
annonce « 0,99 €/5 min ». Seul le champ lu est le mauvais.

C'est **exactement le défaut déjà corrigé pour le tri** dans `BillingRepository.priceMicros()`
(cf. B1, « défaut de tri corrigé au passage ») : la correction a traité le classement et
**oublié l'affichage**. Le correctif symétrique est de lire
`subscriptionOfferDetails.first().pricingPhases.pricingPhaseList.first().formattedPrice`
en repli.

Défaut de paywall à fort impact : l'utilisateur ne peut pas connaître le prix de deux des
trois offres sans ouvrir la feuille de paiement, et « SAVE 58% » / « BEST DEAL » se
rapportent à des montants invisibles.

**Sévérité : haute — conversion. C'est l'écran qui vend.**

### B2 — Un achat remboursé ou révoqué ne retire jamais l'accès *(trouvé le 2026-08-19, non corrigé)*
`core/data/BillingRepository.kt` · `syncEntitlements()` / `deliverProduct()`

`syncEntitlements()` **n'ajoute** que des droits :

```kotlin
purchases?.forEach { if (handlePurchase(it)) restored++ }   // rien si la liste est vide
```

Si Play ne renvoie plus l'achat — remboursement, révocation, rétrofacturation — la boucle
ne fait rien et `setPro()` n'est **jamais** annulé. `is_pro_user` reste `true`
indéfiniment, dans DataStore **et** dans les `EncryptedSharedPreferences` (couche
anti-fraude, qui joue ici contre l'éditeur). L'utilisateur conserve l'accès à vie.

Même famille, moins grave, pour les abonnements : `activateSubscription()` pose une
échéance locale de 30 ou 365 jours qui survit à une résiliation, jusqu'à son terme.

**Correctif naturel** : faire de `syncEntitlements()` un *réconciliateur* — construire
l'état à partir de ce que Play renvoie, et **retirer** les droits absents — plutôt qu'un
applicateur additif. À ne pas écrire à l'aveugle : une panne de facturation renverrait une
liste vide et déconnecterait alors tous les abonnés légitimes. Il faut distinguer
« Play dit que tu n'as rien » de « Play n'a pas répondu », ce que le code ne fait pas
aujourd'hui (`queryPurchasesAsync` voit son `BillingResult` ignoré, cf. le `val (_, …)`).

**Conséquence pratique immédiate** : après une révocation en Play Console, l'application
garde `isPro` jusqu'à un `pm clear`. Ne pas conclure d'un accès persistant que la
révocation a échoué.

**Sévérité : moyenne-haute — perte de revenu, et contournement possible par remboursement.**

### P6 — L'application mobile ne bloque jamais un utilisateur expiré
`app-mobile/…/navigation/NavGraph.kt` · destination `SPLASH`

**Constaté sur appareil** (Pixel 7, build 1.1.0 installée) : bandeau « Trial expired. »
affiché, et pourtant l'intégralité du catalogue navigable.

```kotlin
val hasAccess by trialVm.hasAccess.collectAsState()
val startState = produceState<Pair<Boolean?, Boolean>?>(null) {
    val creds = credRepo.load()
    value = (hasAccess to (creds != null))   // hasAccess vaut null à cet instant
}
…
access == false -> navigate(PURCHASE)        // jamais vrai : access est null
```

`TrialViewModel._hasAccess` démarre à `null` et n'est résolu qu'en asynchrone par
`refresh()`. `produceState` **sans clé** n'exécute son bloc qu'une fois, à la première
composition : il capture `null`. `access == false` est donc faux, on tombe dans le
`else`, et l'utilisateur part sur `MAIN`. Aucune clé ⇒ le bloc ne se réexécute jamais
quand `hasAccess` devient `false`.

`TvNavGraph` fait la même chose **correctement** — `hasAccess.first { it != null }`,
avec un commentaire expliquant l'attente. Le défaut est propre au mobile.

Avec P1, la logique d'accès était exactement inversée : les abonnés qui paient étaient
bloqués, ceux qui ne paient pas ne l'étaient pas.

**Correction** : mobile aligné sur l'approche TV.

**✅ Vérifié sur appareil par test différentiel** (Pixel 7, Android 17). Même appareil,
même état d'essai expiré (octets protobuf identiques, contrôlés), deux builds :

| Build | Écran atteint | Blocage |
|---|---|---|
| code d'origine | Connexion, avec « Essai gratuit de 3 jours inclus » | contourné |
| avec correctif | « Purple IPTV Premium » | appliqué |

Le code d'origine proposait donc un essai gratuit à un utilisateur dont l'essai était
déjà expiré. Preuve causale : seul `NavGraph.kt` diffère entre les deux builds.

**Sévérité : critique — perte de revenu directe.**

### P9 — « Maybe later » sur l'écran de blocage — ✅ corrigé et vérifié
`app-mobile/…/ui/purchase/PurchaseScreen.kt`

L'écran d'achat, qui sert de **barrière** pour un utilisateur expiré, propose un lien
« Maybe later ». Testé sur appareil : il ne fait rien, car `popBackStack()` s'applique
à une pile vide (`SPLASH` ayant été retiré avec `inclusive = true`). Le blocage tient
donc — mais **par accident de pile de navigation, pas par intention**, et l'utilisateur
se voit offrir une action qui ne mène nulle part.

**Correction** (validée par l'utilisateur) : `Routes.purchase(blocking = true)` depuis le
splash, `onBack` nullable dans `PurchaseScreen`, lien masqué quand l'écran est une
barrière. Vérifié sur appareil : le lien a disparu de l'écran-barrière et reste présent
quand l'écran est ouvert depuis le menu.

Observé aussi : « No products available at the moment. » — attendu sur la variante
`.debug`, dont l'`applicationId` suffixé n'est pas rattaché à Play Billing. Ne permet
donc pas de conclure sur B1, mais montre que le mode dégradé est un cul-de-sac sans
diagnostic.

### P7 — Décorations `●` conservées dans les noms de chaînes
`core/network/XtreamApiClient.kt` · `specialCharsRe`

**Constaté sur appareil**, puis prouvé sur les chaînes réelles du catalogue :

```
"☆● FR | FRANCE SPORT | FR ●☆"  →  "● FR | FRANCE SPORT | FR ●"
```

`☆` était bien retiré, `●` non : les formes géométriques (`●○◉■□▪▫`) manquaient à la
classe de caractères, alors que `•` (U+2022) et `·` (U+00B7) y figuraient. `●` est
l'une des décorations les plus répandues chez les fournisseurs IPTV.

**Sévérité : moyenne — qualité d'affichage du catalogue.**

### P8 — Le catalogue en cache n'expire jamais
`core/data/CacheRepository.kt`

Le jumeau Flutter (`CacheService`) applique une durée de vie de 24 h explicite et la
vérifie. **Le portage Kotlin l'a perdue** : `read()` ne testait que l'existence du
fichier. Conséquences : chaînes supprimées par le fournisseur toujours affichées, noms
obsolètes figés, nouvelles chaînes jamais visibles — indéfiniment, faute de
déconnexion manuelle. C'est ce qui explique que les noms sales de P7 s'affichaient
encore alors que `cleanName` les traite.

**Correction** : `CachePolicy.isFresh()` (logique pure, source de temps injectée),
branché sur `File.lastModified()`. Un horodatage nul ou situé dans le futur est traité
comme périmé.

**Repli hors-ligne indispensable** : ajouter un TTL sans plus casserait l'usage sans
réseau, le cache périmé n'étant plus servi et l'appel réseau échouant. `IptvRepository`
retombe donc sur le cache périmé (`allowStale = true`) quand le réseau échoue, pour les
chaînes, films et séries. ⚠️ Ce chemin de repli n'est **pas** couvert par un test —
il faudrait MockK pour doubler `IptvRepository`.

### S2 — Mot de passe de signature commité en clair
`native/keystore.properties` est **suivi par git** et contient `storePassword` et
`keyPassword` en clair, alors que `.gitignore` porte une section « Secrets : ne jamais
committer (SEC-1) ». À sortir du suivi, et **faire tourner la clé** :

```bash
git rm --cached cluster/iptv/native/keystore.properties
echo 'cluster/iptv/native/keystore.properties' >> .gitignore
```

Le fichier référence `../client/android/upload-keystore.jks`, **absent de la machine
« hjouini »** : `assembleRelease` y est donc impossible. Le fichier **est présent sur
la machine « rigolo »** (cf. §3).

### S3 — Le `signingConfig` ne trouvait jamais le keystore — ✅ corrigé
`app-mobile/build.gradle.kts` · `app-tv/build.gradle.kts`

Découvert en lançant `bundleRelease` sur la machine qui détient la clé :

```
> Keystore file '…/native/client/android/upload-keystore.jks' not found
```

Le chemin de `keystore.properties` (`../client/android/upload-keystore.jks`) est
relatif à **`native/`**, mais était résolu par `file(it)`, c'est-à-dire relativement au
**module** : `native/app-mobile/../client/…` → `native/client/…`, un niveau trop bas.
Le fichier réel est en `cluster/iptv/client/…`.

**Correction** : `rootProject.file(it)` dans les deux modules — le chemin committé
devient correct et reste indépendant de la machine.

Ce défaut n'avait jamais pu être observé : la seule machine qui lançait des builds
n'avait pas le keystore, et échouait donc plus tôt, pour une autre raison.

**Sévérité : haute — aucune publication n'était possible, sur aucune machine.**

### P10 — La carte EPG ne disparaît jamais, et son horloge est figée
`app-mobile/…/ui/player/PlayerScreen.kt`

Répond directement à `raf.md` : « L'EPG ne disparaît jamais. » Ce n'était pas subtil,
le code l'assumait :

```kotlin
// EPG floating card — always visible for live channels, bottom-left
if (isLive && epgPrograms.isNotEmpty() && !isInPip) {
```

Tous les autres contrôles suivent `overlayVisible`, qui bascule à `false` après 4 s
d'inactivité. La carte EPG, non : elle restait affichée en permanence sur l'image.

Second défaut de la même fonction, non signalé mais réel :

```kotlin
val now = System.currentTimeMillis()   // lu une fois pendant la composition
```

Sans état qui progresse, la barre d'avancement restait figée et la carte continuait
d'annoncer un programme terminé pendant toute la session. Corrigé par un état
rafraîchi toutes les 30 s.

**✅ Vérifié sur appareil** : la carte s'affiche avec l'overlay et disparaît avec lui.

**Sévérité : moyenne — gêne permanente à l'image, information EPG périmée.**

### P11 — Horaires EPG décalés d'une heure, barre d'avancement figée
`core/model/EpgProgram.kt` · `core/network/XtreamApiClient.parseEpg()` · `PlayerScreen`

**Constaté sur appareil** : à 20:28 heure locale, le JT de 20h de TF1 s'affichait
« EN DIRECT · 19:00 – 19:45 », barre d'avancement vide.

Deux défauts de même racine — les horaires étaient manipulés sans fuseau défini :

1. l'UI affichait la **chaîne brute** du fournisseur (`current.start.take(16).takeLast(5)`),
   exprimée dans le fuseau du serveur — ici UTC+1, soit une heure de moins que l'heure
   locale ;
2. `parseEpgTime()` interprétait cette même chaîne comme de l'**UTC**, décalant la
   sélection du programme courant de deux heures. La branche
   `firstOrNull { start <= now && end > now }` échouait donc systématiquement et le
   code retombait sur `programs.firstOrNull()` — qui donnait le bon programme par
   chance, l'API renvoyant les diffusions à partir de maintenant. D'où la barre
   d'avancement à zéro.

**Correction** : `EpgProgram` porte désormais `startMs`/`endMs`, alimentés par
`start_timestamp`/`stop_timestamp` — des horodatages Unix, seules valeurs non
ambiguës. L'UI les formate dans le fuseau de l'appareil, avec repli sur la chaîne
d'horaire si les champs sont absents.

Ce repli rendait l'implémentation **auto-vérifiante** : l'affichage passant à
« 20:00 – 20:45 » avec une barre remplie aux deux tiers a prouvé du même coup que le
fournisseur renvoie bien ces champs.

**Sévérité : moyenne-haute — grille horaire fausse pour l'utilisateur.**

### P0 — prérequis transverse
Aucune infrastructure de test n'existait : dépendances de §4 + source set
`core/src/test/kotlin/` à créer **avant** P1, sinon la méthode Test-First est
impossible.

---

## 6. Plan d'action

### Fait

- [x] **P0** — JUnit + kotlinx-coroutines-test + `org.json:json` ajoutés au version
      catalog et à `core/build.gradle.kts` ; `testOptions.unitTests.isReturnDefaultValues`
      activé ; source set `core/src/test/kotlin/` créé ; `app-mobile/src/test.kt`,
      `test-pointer.txt` et `test-replace.txt` supprimés.
- [x] **P1** — `TrialPolicy` extrait en logique pure, source de temps injectée dans
      `TrialRepository`. 5 tests en échec constatés, puis verts. Abonnement arrondi
      au jour supérieur ; plus de réattribution d'essai après un abonnement.
- [x] **P2** — `RecentItemsCodec` extrait, décodage défensif à deux niveaux
      (document illisible ⇒ liste vide, entrée corrompue ⇒ entrée ignorée).
      7 tests en échec constatés, puis verts.
- [x] **P3** — Nom M3U extrait par balayage hors guillemets ; ordre des branches de
      `ContentType` corrigé. 5 tests en échec constatés, puis verts.
- [x] **P4** — `encodeQuery` / `encodePathSegment` ajoutés, quatre constructions d'URL
      de flux unifiées dans `streamUrl()`. 5 tests en échec constatés, puis verts.
- [x] **P5** — `EpgTextDecoder` extrait (okio au lieu d'`android.util.Base64`, seul
      moyen de rendre la décision testable). 4 tests en échec constatés, puis verts.
- [x] **P6** — `NavGraph` mobile aligné sur `TvNavGraph` (attente de la résolution de
      `hasAccess`). Non vérifié sur appareil, cf. S2.
- [x] **P7** — `●○◉■□▪▫` ajoutés à `specialCharsRe`. 3 tests en échec, puis verts.
- [x] **P8** — `CachePolicy` + TTL de 24 h branché, avec repli sur cache périmé quand
      le réseau échoue. 7 tests.
- [x] Non-régression : `:app-mobile:assembleDebug` et `:app-tv:assembleDebug` ✅.
- [x] **B3** — prix des abonnements (« N/A ») corrigé des deux côtés, prouvé sur build Play.
- [x] **UX-1** — quatre états d'accès distingués, vérifiés sur mobile **et** TV.
- [x] **UX-2** — chemin d'achat ouvert sur Android TV, vérifié au D-pad.
- [x] **P9** — tranché : lien masqué sur l'écran-barrière, présent sinon.

- [x] **S3** — `rootProject.file()` dans les deux `signingConfig` : le keystore était
      cherché un niveau trop bas et **aucune publication n'était possible**.
- [x] `:app-mobile:bundleRelease` produit et signé par la clé d'upload (versionCode 9).

**État : 120 tests, 0 échec.**

### À faire

Classé par ce qui contraint le reste, pas par difficulté.

#### Échéance dure — 31 août 2026

- [x] **Migrer Play Billing 7 → 8** — fait **et vérifié sur build Play** le 2026-08-19
      (version 13), cf. §12. `billing:8.0.0`, artefact Java, minSdk inchangé.
- [ ] Décider si l'on monte en `billing:9.x` — exige `minSdk 23` côté mobile (cf. §12).

#### Navigation des chaînes live — refonte demandée le 2026-08-19

- [x] **Mobile — liste des chaînes live** (§13). `LayoutMode.LIST`, défaut du live,
      vérifié sur appareil.
- [x] **Mobile — les favoris de chaînes sont enfin visibles** dans « Ma liste » (§13).
- [x] **TV — deux panneaux** (§13) — fait et vérifié au D-pad le 2026-08-19.
- [x] **TV — chaînes favorites dans « Ma liste »** — fait, cf. §14.
- [x] **Ordre des favoris, réglable par l'utilisateur** — fait et vérifié le 2026-08-19,
      cf. §15.

#### Lot demandé le 2026-08-19 — six correctifs

- [x] **1. TV — le panneau latéral qui s'ouvre tout seul** (§16) — corrigé et vérifié
      pour les mutations de liste. ⚠️ Le cas « fin de liste » reste ouvert.
- [x] **2. Localisation** — fait, cf. §17. Le défaut allait **dans les deux sens** :
      français en dur côté TV, **anglais** en dur sur le paywall et la fiche film du mobile.
- [x] **3. TV — écran Paramètres aligné sur le mobile** — fait, cf. §19.
- [x] **4. Bandeau premium** — fait et vérifié : « 30 jours restants. » sous le
      « PREMIUM » doré, sur mobile et sur TV.
- [x] **5. TV — logo du rail** — corrigé : `RailBrandLockup` dessinait le caractère
      **`"✦"`** dans un carré violet au lieu de `drawable/ic_logo`, déjà utilisé par les
      deux écrans de connexion et la barre du mobile. Le rail était le seul substitut.
- [x] **6. TV — fiche film retravaillée** — fait, cf. §19. ⚠️ La **fiche série** n'a pas
      reçu le même traitement.
- [x] **6 bis. TV — fiche série retravaillée** — cf. §21.
- [x] **10. TV — résultats de recherche inatteignables au D-pad** — corrigé, cf. §22.
- [x] ~~11. Le focus s'échappe des grilles vers la barre de recherche~~ — **mauvais
      diagnostic de ma part**, cf. §24. Il n'y avait qu'un seul résultat : rien à droite.
- [x] **12. TV — le clavier virtuel piégeait les touches directionnelles** — corrigé,
      cf. §26. Ancien texte : Dès que le focus
      revient sur la barre de recherche, l'IME s'affiche et avale haut/bas/droite/validation
      (« Simpson » devient « Simpsonp »). Gênant à la télécommande, où l'on traverse
      souvent la barre.
- [x] **9. TV — le rail met en avant le mauvais onglet** — corrigé, cf. §23. Ancien texte : Signalé et capturé par
      l'utilisateur : après avoir choisi « Series », le contenu affiche bien les séries
      (8 464 titres) mais **la pastille pleine reste sur « Live TV »**. Deux causes qui
      se cumulent :
      1. **le focus revient au premier élément du rail** après le changement d'onglet —
         même racine que §16, l'élément focalisé disparaît lors de la recomposition ;
      2. dans `RailItem`, l'état **focalisé écrase visuellement l'état actif**
         (`isFocused` est testé avant `isActive`, et remplit la pastille) : on ne peut
         donc plus voir quel onglet est réellement sélectionné.
      La seconde est peu coûteuse à corriger et suffirait à lever la confusion.
      Le lien M3U de l'utilisateur a été fourni — **il n'est pas consigné ici**, il contient
      ses identifiants et ce fichier est versionné sur un dépôt partagé (même faute que
      `keystore.properties`, cf. §5 S2). Il vit dans le scratchpad de session.
      ⚠️ Rappel §8 : ce fournisseur n'est joignable **qu'en données mobiles** — le poste de
      développement et donc l'émulateur TV ne l'atteignent pas.
- [x] **7. Mobile — vrai plein écran** — fait, cf. §18.
- [x] **8. Veille pendant la lecture** — fait, cf. §18. ⚠️ Le défaut touchait **aussi le
      mobile**, l'utilisateur ne l'avait remarqué que sur TV.

#### Demandes de `raf.md` encore ouvertes

- [x] **Retrait d'un favori impossible sur `app-tv`** — ✅ **corrigé et vérifié au D-pad**
      le 2026-08-19. Diagnostic initial faux, cf. §14.
- [x] **Carte EPG sur TV** — faite et vérifiée sur le vrai catalogue, cf. §28. La TV
      n'avait jamais reçu P10/P11 : horaires décalés et barre figée.
- [x] **Bouton VF / VOSTFR** — fait et vérifié sur le catalogue réel, cf. §29. La
      « première piste qui ne fonctionne jamais » est une piste **forcée** : cause
      identifiée et traitée.
- [~] ~~**Bouton de simulation de fin d'essai** derrière `BuildConfig.DEBUG`~~ —
      **annulé par l'utilisateur le 2026-08-20.** Ne pas le reproposer. Le besoin de
      poser un état d'essai reste couvert hors UI par `mkprefs.py` + `run-as` (§3).
- [ ] **Cast d'une chaîne TV : son sans image.** Exige un Chromecast sur le même réseau,
      impossible depuis ce poste.

#### Facturation

- [x] **B2 — un achat remboursé ne retire jamais l'accès** — corrigé **et prouvé sur
      build de Play** (versionCode 14), cf. §32.
- [ ] **B1.5 non observé** : impossible de provoquer un échec de facturation, Play Billing
      sert son cache local. À retenter autrement.
- [ ] `deliverProduct()` code 30 et 365 jours en dur ; l'échéance réelle exige la Play
      Developer API, donc un serveur.

#### Dette et sécurité

- [x] **`keystore.properties`, `local.properties` et 3121 artefacts de build sortis du
      suivi ; mot de passe de signature changé** — cf. §31.
- [ ] Décider si l'on réécrit l'historique pour purger l'ancien mot de passe (§31) —
      il est désormais **sans valeur**, et la réécriture impose un `push --force` sur un
      dépôt partagé.
- [ ] Trancher **S1** (TLS désactivé) — décision produit.

#### Couverture

- [ ] `app-tv` reste en **versionCode 8** : aucun correctif TV n'est distribué.
- [x] **Parseurs JSON de `XtreamApiClient` protégés** — cf. §27. 14 tests, dont 11 rouges
      constatés avant correction.
- [x] **Focus qui s'échappe vers le rail en fin de liste** — corrigé, cf. §30.
- [ ] `DownloadRepository` et `PlayerService` : aucune couverture.
- [ ] Tests instrumentés (Compose UI) : désormais possibles, un émulateur TV existe (§11).

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

## 8. Journal d'environnement — panne fournisseur du 2026-08-18

Vérifications restées en suspens faute de flux. À ne pas rechercher comme un bug de
l'application :

- 19:37 — catalogue chargé normalement depuis le téléphone : 11 889 chaînes, API
  `player_api.php` opérationnelle.
- 19:46 et après — plus aucune lecture live, **sans la moindre erreur HTTP** : la
  connexion reste simplement suspendue. Symptôme **identique sur la build de production
  intacte**, ce qui écarte toute cause applicative.
- 20:10 — depuis le téléphone : DNS `spacep2.com` → `192.142.27.93` résout, mais TCP
  filtré sur 8789, 80, 443 et 8080, alors que `1.1.1.1:443` répond. Serveur du
  fournisseur injoignable, pas l'application.

Le poste de développement, lui, n'a **jamais** joint ce fournisseur (TCP filtré) : tout
test réseau contre le panneau doit passer par l'appareil.

**Cause trouvée à 20:20** : ce n'était ni le fournisseur ni l'application, mais le
**réseau Wi-Fi qui bloque l'IP** `192.142.27.93`. Mesuré depuis le téléphone :

| Réseau | `spacep2.com:80` | `spacep2.com:8789` | contrôle `1.1.1.1:443` |
|---|---|---|---|
| Wi-Fi | filtré | filtré | ouvert |
| Données mobiles | ouvert | ouvert | ouvert |

Blocage au niveau IP, pas DNS (le nom résout correctement) : changer de résolveur ne
sert à rien. Le port 8789 n'a jamais cessé de fonctionner — la « nouvelle URL » sans
port fournie par le fournisseur était une fausse piste.

➡️ **Tout test réseau contre ce panneau doit se faire en données mobiles.** Le poste de
développement, lui, est sur le Wi-Fi bloqué et ne joindra jamais ce fournisseur.

En données mobiles, tout a été vérifié : lecture live (TF1 FHD), P5, P10 et P11.
Reste le Cast d'une chaîne TV, qui exige un Chromecast sur le même réseau.

---

## 9. Vérifier la facturation (B1) — procédure

Les six correctifs de facturation sont **écrits, compilés, mais non vérifiés**. Ils ne
peuvent pas l'être sur la machine de développement : la variante `.debug` a un
`applicationId` suffixé, donc étrangère à Play Billing.

### Prérequis, à réunir sur la machine qui détient la clé

1. **`upload-keystore.jks`** — absent de la machine « hjouini ». `keystore.properties`
   le référence en `../client/android/upload-keystore.jks` (alias `upload`). Sans lui,
   `bundleRelease` est impossible, et avec lui toute publication future sur le Play
   Store. **C'est le point bloquant.**
2. Piste de **test interne** active dans la Play Console.
3. Compte Google déclaré **testeur sous licence**.

### ⚠️ Un APK signé localement ne suffit pas

Avec Play App Signing (par défaut), l'application livrée aux utilisateurs est signée par
la **clé de Google**, pas par la clé d'upload. Un APK construit ici et installé à la main
porte donc une signature différente de celle que Play a enregistrée : la facturation
échoue, généralement en `BILLING_UNAVAILABLE` ou par un catalogue vide — soit exactement
le symptôme qu'on cherche à corriger, ce qui rendrait le test ininterprétable.

➡️ **La build de test doit être installée depuis Play** : piste de test interne, ou
partage interne d'applications (*internal app sharing*), qui accepte un AAB et fournit un
lien d'installation.

### Étapes

```bash
export JAVA_HOME=<jbr d'Android Studio>
cd cluster/iptv/native
# 1. versionCode doit dépasser celui déjà publié (actuellement 8 dans le dépôt)
#    → app-mobile/build.gradle.kts
# 2. produire le bundle
./gradlew :app-mobile:bundleRelease
#    → app-mobile/build/outputs/bundle/release/app-mobile-release.aab
# 3. téléverser sur la piste de test interne, installer depuis Play avec le compte testeur
```

### Ce qu'il faut observer

| Correctif | Observation attendue |
|---|---|
| B1.1 requête des deux catalogues | **les trois offres** s'affichent, pas seulement « à vie » |
| B1.2 `setOfferToken` | appuyer sur un abonnement **ouvre** la feuille de paiement |
| B1.5 remontée des échecs | un échec affiche un message explicite, plus « No products available » |
| B1.6 annulation | refermer la feuille ramène à l'écran **sans message d'erreur** |
| B1.3 restauration | après réinstallation, « Restaurer » rend l'accès |
| B1.4 synchro au démarrage | achat, `adb shell pm clear`, relance : **le bandeau annonce 30 jours (ou disparaît)** — ✅ **PROUVÉ le 2026-08-19**, cf. ci-dessous |

Le dernier point est le plus important : c'est lui qui empêchait un abonné à jour de
paiement d'être bloqué au 30ᵉ jour.

#### ⚠️ B1.4 : « l'accès revient » n'est PAS une observation valide

Formulé ainsi, ce test **ne peut pas échouer**, et ne prouve donc rien. Démonstration,
par lecture de `TrialRepository.initTrial()` et `TrialPolicy.remainingDays()` :

`pm clear` efface DataStore **et** les `EncryptedSharedPreferences` (toutes deux dans
les données de l'app). Au redémarrage, `initTrial()` ne trouve plus `trial_start_date`
et **réattribue un essai gratuit de 3 jours**. Or
`remainingDays = max(abonnement, essai)` : l'accès est donc rendu par l'essai neuf,
que `syncEntitlements()` ait fonctionné ou non.

Le signal discriminant est le **nombre de jours affiché** dans le bandeau de
`MainScreen`, et non la présence de l'accès :

| Produit acheté | `syncEntitlements()` a fonctionné | il n'a rien fait |
|---|---|---|
| `purple_monthly_099` | bandeau **« 30 jours restants »** | bandeau « 3 jours restants » |
| `purple_yearly_499` | bandeau **« 365 jours restants »** | bandeau « 3 jours restants » |
| `purple_lifetime_999` | `isPro` ⇒ **bandeau absent** | bandeau « 3 jours restants » |

L'achat **à vie** donne le signal le plus net (bandeau présent / absent) ; l'abonnement
mensuel donne le plus proche du bug réel. Les deux sont concluants.

Pourquoi cela suffit à couvrir le bug du 30ᵉ jour : lire 30 jours prouve que
`syncEntitlements()` a bien posé `subscription_expiry_date` depuis ce que Play sait.
Que cette échéance ouvre l'accès **alors que l'essai est expiré** est déjà prouvé par
`TrialPolicyTest` (logique pure). Il n'est donc pas nécessaire — ni possible — de
fabriquer un essai expiré sur la build de Play : elle n'est pas `debuggable`, donc
`run-as` n'y fonctionne pas et l'astuce de §3 ne s'applique plus.

Harnais de mesure prêt et **validé sur l'appareil** (il lit bien le texte Compose) :
`b1verify.sh {screen|launch|state|b14|log}` dans le scratchpad de la session.

### Sur la nouvelle machine

- `native/local.properties` : **rien à faire**, il pointe déjà vers `/home/rigolo/Android/Sdk`
  qui est le bon chemin ici (cf. §3). C'est la machine « hjouini » qui devait l'ajuster.
- `native/keystore.properties` est **versionné avec les mots de passe en clair**, et il
  se trouve désormais sur le dépôt distant partagé. À sortir du suivi et faire tourner
  la clé (cf. §5 S2).

### État de la vérification au 2026-08-19

Ce qui est **prouvé** sur la machine « rigolo » :

| Étape | Résultat |
|---|---|
| Suite de tests rejouée | ✅ 73 tests, 0 échec |
| Keystore `upload` ouvert par le mot de passe committé | ✅ SHA1 `F6:0C:72:9C:…`, valide jusqu'en 2053 |
| `signingConfig` réparé (S3) | ✅ sans quoi rien n'était publiable |
| `:app-mobile:bundleRelease` | ✅ `app-mobile-release.aab`, 11,98 Mo |
| AAB : identité et signature | ✅ `com.purple.iptvplayer`, versionCode **9**, versionName 1.1.1, signé par la clé d'upload |
| Pixel 7 connecté et autorisé | ✅ |

Ce qui **n'est pas** prouvé : **les six correctifs B1 eux-mêmes.** Ils restent au même
statut qu'avant — écrits, compilés, jamais exercés contre Play.

#### Découverte : la facturation n'a jamais pu fonctionner sur cet appareil

L'APK `com.purple.iptvplayer` installé sur le Pixel 7 (versionCode 8, « build de
production » des sessions précédentes) a été extrait et son certificat lu :

```
Owner: C=US, O=Android, CN=Android Debug
installerPackageName = com.google.android.packageinstaller
```

Ce n'est **pas** la build de production : c'est une build **signée par la clé de debug**
et **installée à la main**, jamais par Play. Play Billing ne pouvait donc rien retourner
d'autre qu'un catalogue vide — le symptôme même que B1 corrige. Toute observation de
facturation faite jusqu'ici sur cet appareil est **ininterprétable**, y compris le
« No products available » noté en P9.

Conséquence pratique : cet APK devra être **désinstallé** avant d'installer depuis Play
(signatures différentes, l'installation par-dessus sera refusée).

⚠️ **La désinstallation perd définitivement les identifiants Xtream enregistrés.**
Une sauvegarde de `files/` + `shared_prefs/` a été prise par `run-as` (l'app est
`debuggable`), mais elle est **inexploitable après réinstallation** : identifiants et
état d'abonnement sont dans des `EncryptedSharedPreferences`
(`purple_iptv_credentials.xml`, `purple_trial_secure.xml`) dont la clé maîtresse vit
dans l'AndroidKeyStore de l'appareil et **est détruite avec l'app**. Se munir des
identifiants du fournisseur avant de désinstaller.

#### Point bloquant restant : le téléversement sur la Play Console

L'AAB est prêt et signé, mais le faire parvenir à l'appareil **passe obligatoirement par
l'interface web de la Play Console** (piste de test interne ou *internal app sharing*) :
cette étape ne peut pas être automatisée depuis ce poste. C'est le seul geste manquant.

#### ✅ B1.4 — PROUVÉ sur appareil le 2026-08-19

Première vérification de facturation jamais réalisée dans des conditions valides.

**Conditions établies par la mesure, pas supposées** :

| Contrôle | Valeur lue |
|---|---|
| `installerPackageName` | `com.android.vending` — **installée par Play** |
| Signataire de l'APK livré | `O=Google Inc.` — clé de Play App Signing, **pas** la clé d'upload |
| Version | versionCode 10, versionName 1.1.2 |

La tentative de mise à jour par-dessus l'ancienne build a échoué en
`INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match` — ce qui confirme au passage
que l'APK précédent était bien étranger à Play, et que toute observation antérieure de
facturation était ininterprétable.

**Protocole exécuté** : `pm clear` (efface DataStore *et* les `EncryptedSharedPreferences`),
puis relance, **sans jamais toucher à « Restaurer »**, puis reconnexion à une playlist M3U
publique pour atteindre `MainScreen`.

**Résultat** : bandeau **absent**, bouton « ACTIVER » **absent** ⇒ `isPro == true`.

L'état local ayant été effacé, le seul chemin par lequel `isPro` a pu redevenir vrai est
`syncEntitlements()` au démarrage → `handlePurchase` → `deliverProduct` → `setPro()`.
Sans ce correctif, `initTrial()` aurait attribué un essai neuf et le bandeau afficherait
« Essai gratuit : 3 jours restants. » — c'est exactement la ligne « achat à vie » du tableau
discriminant ci-dessous.

**Contrôle positif de l'instrument** : sur la variante `.debug`, ce même bandeau est lu en
première position par `uiautomator` (« Essai gratuit : 3 jours restants. »). Son absence
ici est donc un fait, pas un défaut de lecture.

➡️ **Le bug du 30ᵉ jour est corrigé** : un droit d'accès détenu par Play est réappliqué au
démarrage sans action de l'utilisateur.

#### ✅ Vérification complète du 2026-08-19 — 5 correctifs sur 6 prouvés

Le compte possédait `purple_lifetime_999`, ce qui masquait le bandeau (`if (!isPro)`) et
donc l'unique accès à l'écran d'achat (`MainScreen.kt:183`). La commande a été
**remboursée avec « supprimer le droit »** depuis la Play Console : `isPro` est repassé à
faux et l'écran d'achat est redevenu atteignable. La propagation prend quelques minutes —
un `pm clear` immédiatement après le remboursement voyait encore l'achat.

| # | Observation mesurée | Verdict |
|---|---|---|
| **B1.1** | l'écran affiche **Monthly + Yearly + Lifetime** | ✅ prouvé — le symptôme de `raf.md` (« seul un abonnement est proposé ») est levé |
| **B1.2** | appui sur Monthly ⇒ feuille Google « Premium Mensuel, 0,99 €/5 min, carte test » | ✅ prouvé — avant, `oneTimePurchaseOfferDetails ?: return` sortait en silence |
| **B1.3** | les deux catalogues `INAPP` et `SUBS` sont interrogés et rendent leurs achats | ✅ prouvé (via B1.4) |
| **B1.4** | `pm clear` puis relance **sans « Restaurer »** ⇒ bandeau **« 30 jours restants »** | ✅ **prouvé, achat unique *et* abonnement** |
| **B1.5** | remontée d'un échec de facturation | ⚠️ **non observé** — impossible de provoquer la panne (cf. ci-dessous) |
| **B1.6** | fermeture de la feuille de paiement ⇒ retour à l'écran, **aucun message d'erreur** | ✅ prouvé |

**B1.4 en détail — le test décisif.** Souscription de l'abonnement mensuel de test à
11:20:57, puis `pm clear` (efface DataStore *et* `EncryptedSharedPreferences`), relance,
reconnexion, lecture à 11:23:13 : **« Essai gratuit : 30 jours restants. »**. Sans la
synchro au démarrage, `initTrial()` aurait rendu un essai neuf et le bandeau afficherait
**3**. Mesuré deux fois, sur les deux familles de produit :

| Produit | Après `pm clear` + relance | Ce que ça prouve |
|---|---|---|
| `purple_lifetime_999` (INAPP) | bandeau **absent** (`isPro`) | `queryPurchasesAsync(INAPP)` ✅ |
| `purple_monthly_099` (SUBS) | bandeau **« 30 jours »** | `queryPurchasesAsync(SUBS)` ✅ |

➡️ **Le blocage de l'abonné au 30ᵉ jour est corrigé, et c'est mesuré.**

**Pourquoi B1.5 n'a pas pu être observé.** Deux tentatives pour provoquer un échec de
facturation : mode avion, puis `am force-stop com.android.vending`. Dans les deux cas
l'écran a affiché les trois offres normalement — Play Billing sert les détails produits
depuis le cache local du Play Store et rebinde son service à la demande. Le chemin de code
existe (lu dans `queryProducts`/`loadProducts`) mais **n'est pas exercé** : ne pas le
compter comme vérifié.

Observation utile au passage : le catalogue IPTV s'est affiché en mode avion, ce qui
confirme sur appareil le repli hors-ligne de P8.

#### Note de méthode — les abonnements de test durent 5 minutes

Un abonnement souscrit par un testeur sous licence a une période **compressée** : le
mensuel facture « 0,99 €/5 min ». C'est ce qui explique que l'abonnement annuel acheté le
20 mai 2026 n'était plus actif. Conséquence pratique : entre l'achat et la lecture du
bandeau après `pm clear`, il faut aller vite — la séquence complète tient en ~90 s.

#### Les téléviseurs perdus au téléversement de la version 10 — expliqué, non corrigé

La Play Console avertit que la version 10 « ne prend plus en charge 3 022 appareils » :
téléphones 13 981 → 13 981, mais **téléviseurs 3 026 → 7**. Cause trouvée par lecture
des manifestes, pas par supposition :

| Build | `uses-feature` déclarés | Téléviseurs |
|---|---|---|
| `client/` (Flutter, versions ≤ 9) | `leanback` *required=false* + **`touchscreen` required=false** | compatibles |
| `app-mobile/` (Kotlin, version 10) | **aucun** ⇒ `touchscreen` requis par défaut | exclus |

Le Flutter portait `applicationId = "com.purple.iptvplayer"` — **le même paquet** — et un
`LEANBACK_LAUNCHER` : c'était une build unique qui servait le téléphone *et* la
télévision. La migration Kotlin a scindé en deux modules aux identifiants distincts,
`com.purple.iptvplayer` (mobile) et `com.purple.iptvplayer.tv` (TV). La fiche mobile perd
donc logiquement la TV.

⚠️ **Conséquence produit à trancher** : les utilisateurs TV installés depuis la fiche
`com.purple.iptvplayer` restent sur l'ancienne build Flutter et **ne recevront plus aucune
mise à jour** — Play le dit explicitement. Ils ne migreront pas tout seuls vers
`com.purple.iptvplayer.tv`, qui est une fiche séparée à installer à la main. Sans geste
délibéré (communication, ou déclaration `touchscreen required=false` sur `app-mobile`),
ce parc est abandonné en l'état.

Sans effet sur la vérification B1, qui se fait sur un téléphone.

Avertissement mineur du même téléversement : `WRITE_EXTERNAL_STORAGE`
(`maxSdkVersion=29`) est demandé par `app-mobile` et ne l'était pas par le Flutter.

#### ⏳ Échéance à surveiller : Play Billing 7.0.0

Le projet utilise `com.android.billingclient:billing-ktx:7.0.0`
(`gradle/libs.versions.toml`). **À partir du 31 août 2026, la Play Console n'accepte plus
que la version 8 ou ultérieure** pour toute nouvelle publication (extension possible
jusqu'au 1ᵉʳ novembre 2026 ; les apps déjà en ligne continuent de transiger).

Il reste donc une fenêtre courte pour téléverser cet AAB tel quel. La migration en v8
est un changement d'API à part entière : **ne pas l'entreprendre avant d'avoir vérifié
B1 en v7**, sous peine de mélanger deux causes de panne et de rendre le résultat
illisible (cf. la leçon de §5 P4).


---

## 10. UX-1 — Cohérence de l'état premium *(fait, 2026-08-19)*

### Le défaut de fond

`TrialRepository` distingue trois droits — `isPro()` (achat à vie, **permanent**),
`isPremium()` (tout droit payant en cours) et l'essai — mais **les deux UI ne consomment
que `isPro`** :

```kotlin
// MainScreen.kt:163 et TvMainScreen.kt:148 — même défaut des deux côtés
if (!isPro) { /* bandeau « Essai gratuit : %d jours restants » */ }
```

Conséquence mesurée sur appareil : un abonné mensuel — donc un client qui paie — se voit
annoncer « **Essai gratuit** : 30 jours restants. » avec un bouton « ACTIVER ». Et
l'écran de connexion affiche « Essai gratuit de 3 jours inclus » à tout le monde,
abonnés compris (`SetupScreen.kt:234`, `app-tv` ligne 210).

### Les quatre états à distinguer

L'erreur est de raisonner en binaire. Il y en a quatre, et ils n'appellent pas le même
traitement :

| État | Nature | Ce que l'utilisateur doit voir |
|---|---|---|
| **Pro** (à vie) | permanent | qu'il est premium. **Rien à décompter** — un bandeau permanent est du bruit |
| **Subscribed** (mensuel/annuel) | temporaire, reconductible | qu'il est premium **et** son temps restant : l'échéance le concerne |
| **Trial** | temporaire, expirant | son temps restant **et** un appel à l'action : c'est le seul état où « ACTIVER » a un sens |
| **Expired** | aucun accès | l'écran-barrière (déjà traité, cf. P6/P9) |

C'est la distinction **permanent / temporaire** qui manque au code : elle décide seule si
un décompte a du sens.

### Décision d'architecture

Conformément à la règle du §4 (« on extrait la décision en objet pur et on teste
celui-ci »), l'état est calculé dans `core` et non dans chaque UI :

- `AccessState` — type scellé `Pro` / `Subscribed(daysLeft)` / `Trial(daysLeft)` / `Expired`
- `TrialPolicy.accessState(now, trialStartMs, expiryMs, isPro)` — logique pure, testée
- `TrialViewModel` l'expose ; `MainScreen` et `TvMainScreen` ne font que le rendre

Aucune donnée persistée nouvelle : `expiryMs != null && > now` suffit à identifier un
abonnement, `setPro()` restant réservé à l'achat à vie.

### Traitement visuel retenu

- **Écran de connexion** : badge « PREMIUM » doré pour `Pro` et `Subscribed`, le texte
  d'essai n'apparaissant que pour `Trial`. Reprise du dégradé du jumeau Flutter
  (`client/lib/screens/setup_screen.dart:316`) : Goldenrod `#B8860B` → Gold `#FFD700` →
  Lemon Chiffon `#FFFACD`, `letterSpacing` large, ombre portée + halo doré.
- **Écran principal** : le bandeau violet pleine largeur est **réservé à `Trial`** — c'est
  un appel à l'action, il n'a lieu d'être que là où il y a quelque chose à convertir.
  `Subscribed` reçoit une pastille dorée discrète avec son décompte, sans bouton.
  `Pro` ne reçoit rien.

⚠️ **Parité mobile/TV obligatoire** : `TvMainScreen.kt:148` porte le même `if (!isPro)`.

### Ce qui a été écrit

| Élément | Rôle |
|---|---|
| `core/data/AccessState.kt` | type scellé `Pro` / `Subscribed(daysLeft)` / `Trial(daysLeft)` / `Expired`, avec `isPremium` et `hasAccess` |
| `TrialPolicy.accessState()` | logique pure, même ordre de priorité que `remainingDays` pour qu'elles ne puissent pas se contredire |
| `TrialRepository.getAccessState()` | lecture des valeurs persistées, source de temps injectée |
| `TrialViewModel.accessState` | `StateFlow<AccessState?>`, `null` tant que non résolu (même précaution que `hasAccess`, cf. P6) |
| `core/data/OfferPrice.kt` | B3 — prix affiché, achat unique **ou** abonnement |
| `mobile/ui/common/PremiumBadge.kt` · `tv/ui/common/TvPremiumBadge.kt` | badge doré, dégradé à 5 arrêts repris du Flutter |

`_isPro` et `_hasAccess` sont désormais **dérivés** de `accessState` dans `TrialViewModel` :
trois sources de vérité qui pouvaient diverger n'en font plus qu'une.

### Vérifié sur appareil (Pixel 7, variante `.debug`, états injectés par `run-as`)

| État injecté | Écran de connexion | Écran principal |
|---|---|---|
| `Pro` | **PREMIUM** doré + « Accès à vie. » | **aucun bandeau** |
| `Subscribed` | **PREMIUM** doré + « Premium : 30 jours restants. » | pastille discrète, **sans bouton ACTIVER** |
| `Trial` | « Essai gratuit de 3 jours inclus… » (inchangé) | bandeau violet + **ACTIVER** |
| `Expired` | — | écran-barrière d'achat (P6 toujours actif) |

Le dégradé doré a été contrôlé sur la capture d'écran, pas seulement sur le texte : les
teintes relevées couvrent les cinq arrêts (`#B09030`, `#E0C040`, `#F0D040`, `#F0E070`),
donc l'effet métallique est bien rendu et non aplati.

Script de génération des états : `mkprefs.py {pro|subscribed|trial|expired} <epoch_ms>`
dans le scratchpad — encode le protobuf DataStore Preferences à la main. Il remplace
celui perdu avec le scratchpad de la session précédente.

⚠️ **Côté TV, seule la compilation est vérifiée** : aucun appareil Android TV ni AVD
disponible. `TvMainScreen` et `TvSetupScreen` reçoivent le même traitement et le même
`AccessState`, mais leur rendu n'a pas été observé.

Défaut corrigé au passage : `RailTrialBadge` (TV) affichait ses libellés **codés en dur en
français** (« jour(s) restant(s) », « Essai expiré ») — désormais dans `strings.xml`, avec
la version anglaise qui manquait.

**État : 92 tests, 0 échec** (73 + 12 `AccessStateTest` + 7 `OfferPriceTest`).


### Vérifié sur la build de Play (version 11, 2026-08-19)

Installée par `com.android.vending`, signée par la clé de Google — conditions contrôlées
avant toute observation.

| Point | Version 10 | Version 11 |
|---|---|---|
| Prix `Monthly` | `N/A` | **0,99 €** |
| Prix `Yearly` | `N/A` | **4,99 €** |
| Prix `Lifetime` | 9,99 € | 9,99 € |

➡️ **B3 est corrigé et prouvé.** « SAVE 58% » devient d'ailleurs vérifiable :
0,99 × 12 = 11,88 € contre 4,99 €, l'économie annoncée est exacte.

L'état `Subscribed` a été observé sur cette même build (bandeau doré, échéance, pas de
bouton « ACTIVER ») : UX-1 est vérifié hors variante debug.

Observation annexe : l'abonnement de test avait expiré depuis longtemps (période de
5 minutes) et l'application affichait pourtant encore « 30 jours restants ». C'est le
comportement attendu de l'échéance locale posée par `deliverProduct()`, et la
démonstration sur appareil du reste-à-traiter de B1 — un abonnement résilié reste ouvert
jusqu'à 30 jours. Même famille que B2.

### ⚠️ Régression introduite par UX-1, puis corrigée

Retirer « ACTIVER » à l'abonné corrigeait le libellé mais supprimait le **seul** point
d'entrée vers l'écran d'achat (`MainScreen.kt:183`) : un abonné mensuel ne pouvait plus
passer à l'annuel ni au définitif. Le mot était faux, le chemin était utile.

**Correction** : l'état `Subscribed` porte un lien discret « Changer d'offre », vérifié
sur appareil — il ouvre bien l'écran d'achat, en mode non bloquant (« Maybe later »
présent, conformément à P9). L'état `Pro` n'en reçoit pas : il n'y a rien au-dessus.

**Leçon** : supprimer un élément d'interface mal libellé supprime aussi la fonction qu'il
portait. Vérifier ce qu'on retire, pas seulement ce qu'on ajoute.

### UX-2 — Sur Android TV, on ne peut pas acheter — ✅ corrigé et vérifié au D-pad
`app-tv/…/ui/main/TvMainScreen.kt`

`TvMainScreen` déclare un paramètre `onPurchase: () -> Unit` … **et ne s'en sert jamais**.
Aucun autre chemin n'existe : la page Réglages n'offre rien, et `TvNavGraph` ne route vers
`TvScreen.Purchase` que par la barrière (`access == false`).

Conséquence : un utilisateur Android TV **ne peut jamais acheter de son plein gré**. Il
doit attendre l'expiration de son essai pour que la barrière l'y contraigne. Le badge du
rail affiche son décompte sans qu'aucune action ne soit possible.

**Sévérité : haute — chemin de conversion inexistant sur toute une plateforme.**

**Correction** : les deux badges du rail (`RailTrialBadge`, `RailPremiumBadge`) sont
devenus des `Surface` cliquables suivant le motif exact de `RailItem` — mêmes
`ClickableSurfaceDefaults`, même `focusedScale`. `onPurchase` est enfin consommé.

**Vérifié au D-pad sur émulateur Android TV**, ce qui était impossible jusqu'ici. Trace
de navigation relevée, état abonné :

```
Films → Séries → Ma liste → Téléchargements → Paramètres → [PREMIUM · 30 day(s) remaining]
```

Le badge s'insère en fin de rail sans perturber l'accès aux éléments existants, et
DPAD_CENTER ouvre l'écran d'achat (« Unlock unlimited access… », « Maybe later »). Le
même chemin fonctionne pour l'état `Trial`.

⚠️ `app-tv` reste en **versionCode 8** : la fiche TV (`com.purple.iptvplayer.tv`) n'a pas
été republiée. À bumper le jour où l'on publie la TV.


---

## 11. Émulateur Android TV — enfin disponible (2026-08-19)

L'angle mort de tout le projet — « aucun appareil Android TV, donc `app-tv` n'est jamais
vérifié » — est levé.

```bash
export JAVA_HOME=<scratchpad>/jdk-17.0.20+8
SDK=/home/rigolo/Android/Sdk
yes | "$SDK"/cmdline-tools/*/bin/sdkmanager --install "system-images;android-33;android-tv;x86"
echo no | "$SDK"/cmdline-tools/*/bin/avdmanager create avd \
    --name purple_tv --device "tv_1080p" \
    --package "system-images;android-33;android-tv;x86" --force
"$SDK"/emulator/emulator -avd purple_tv -no-audio -no-snapshot -gpu swiftshader_indirect &
```

Démarrage complet en ~85 s (`getprop sys.boot_completed` == 1).

### Pièges rencontrés

1. **`monkey -c android.intent.category.LAUNCHER` ne lance rien** : l'app TV s'enregistre
   sous `LEANBACK_LAUNCHER`. Utiliser :
   ```bash
   adb shell am start -n com.purple.iptvplayer.tv/.TvActivity
   ```
2. **Le nœud focalisé ne porte pas de libellé** : sur Compose TV, `focused="true"` est sur
   le conteneur `Surface`, le texte est dans ses enfants. Détecter le focus en croisant
   les `bounds` — script `focus.py` dans le scratchpad. Sans cela, on croit à tort que la
   navigation D-pad ne fonctionne pas.
3. **`android-tv` n'a pas de Play Store** (contrairement à `google-tv`) : « No products
   available » y est normal et ne dit rien de la facturation.

➡️ **Ce qui devient possible** : vérifier `app-tv` au D-pad, et donc traiter l'audit en
attente de `FavoritesRepository.toggle()` côté TV (§6), jusqu'ici hors d'atteinte.


---

## 12. Migration Play Billing 7 → 8 *(2026-08-19)*

Imposée par l'échéance du 31 août 2026 : passé cette date la Play Console n'accepte plus
aucune publication en v7. Faite **après** la vérification de B1 en v7, pour ne pas
mélanger deux causes de panne possibles (leçon de §5 P4).

### Le vrai obstacle n'était pas l'API Billing

Monter la version fait d'abord échouer la compilation sur des centaines d'erreurs sans
rapport — jusqu'à `listOf` et `emptyList` « non résolus » :

```
billing-ktx-9.1.0 … Module was compiled with an incompatible version of Kotlin.
The binary version of its metadata is 2.3.0, expected version is 2.0.0.
kotlin-stdlib-2.2.10 … metadata is 2.2.0, expected 2.0.0
```

C'est **`billing-ktx`** qui dépend de `kotlin-stdlib` 2.2.10, illisible par le compilateur
Kotlin 2.0 du projet. L'API Billing elle-même n'y est pour rien.

**Solution retenue : abandonner `billing-ktx` pour `billing`**, l'artefact Java, qui n'a
aucune dépendance Kotlin. Le projet n'utilisait que **trois** extensions ktx —
`queryProductDetails`, `queryPurchasesAsync`, `acknowledgePurchase` — réécrites à la main
en `suspendCancellableCoroutine`, exactement comme `connect()` le faisait déjà.

➡️ **Aucune montée du toolchain Kotlin n'a été nécessaire.** L'autre voie (Kotlin 2.0 → 2.2)
aurait entraîné le compilateur Compose et AGP dans un chantier bien plus large.

### Le seul changement d'API réel

`onProductDetailsResponse` renvoie désormais un `QueryProductDetailsResult` au lieu d'une
`List<ProductDetails>` — d'où `queryResult.productDetailsList` dans l'enveloppe.

### Pourquoi 8.0.0 et pas 9.1.0 — contrainte de `minSdk`

Mesuré en lisant le manifeste de chaque AAR, pas supposé :

| Version | `minSdk` exigé |
|---|---|
| `billing:8.0.0` | **21** |
| `billing:8.1.0` → `9.1.0` | **23** |

`app-mobile` est en `minSdk 21`. Monter au-delà de 8.0.0 imposerait donc `minSdk 23` et
**la perte des appareils Android 5.0 / 5.1**. La 8.0.0 satisfait l'exigence de Play sans
coûter un seul appareil, et son API est **identique** à celle de la 9.x
(`QueryProductDetailsResult` y est déjà) : la montée ultérieure sera un changement de
numéro, plus une migration.

⚠️ Contrepartie à connaître : chaque version de Billing est dépréciée au bout de deux ans.
La 8.0.0 datant de juin 2025, une nouvelle migration sera exigée vers **mi-2027**. Passer
en 9.x repousserait l'échéance à 2028, au prix du `minSdk`. `app-tv` est déjà en
`minSdk 23` : la question ne se pose que pour le mobile.

### État de la vérification

### ✅ Vérifié sur la build de Play (version 13, 2026-08-19)

Installée par `com.android.vending`, signée `O=Google Inc.` — conditions contrôlées avant
toute observation.

| Chemin de code | Enveloppe concernée | Observation | Verdict |
|---|---|---|---|
| Synchro au démarrage | `queryPurchasesSuspend` | bandeau **« Premium : 365 jours restants. »** — l'abonnement annuel a été retrouvé chez Play et l'échéance reposée | ✅ |
| Chargement du catalogue | `queryProductDetailsSuspend` | **les trois offres avec leurs prix** : 0,99 € / 4,99 € / 9,99 €, aucun « N/A » | ✅ |
| Ouverture du paiement | `launchBillingFlow` + `setOfferToken` | feuille Google « Premium Mensuel, 0,99 €/5 min, carte test » | ✅ |
| Annulation | `PurchaseResult.Cancelled` | retour à l'écran, **aucun message d'erreur** | ✅ |
| Journal | — | aucun `NoSuchMethodError`, `AbstractMethodError` ni erreur `BillingClient` | ✅ |

➡️ **La migration v8 ne régresse sur aucun des correctifs déjà prouvés en v7.** B1.1, B1.2,
B1.4, B1.6 et B3 sont revérifiés sous Billing 8.0.0. `acknowledgePurchaseSuspend` est le
seul des quatre chemins non exercé, faute d'achat neuf à acquitter.

⚠️ `app-tv` embarque la même version de Billing mais n'a **pas** été republié
(versionCode 8) : la migration n'y est donc pas distribuée.


---

## 13. Navigation des chaînes live — conception et mise en œuvre mobile *(2026-08-19)*

### Ce qui existe, et pourquoi c'est lent

Les deux plateformes appliquent le **même motif** : une `LazyColumn` de genres, chaque
genre contenant une `LazyRow` horizontale de cartes 16:9 avec image distante.

- mobile : `ui/home/HomeScreen.kt` — `LazyColumn` → `GroupHeader` + `LazyRow` de `ChannelCard`
- TV : `ui/home/TvHomeScreen.kt` — `LazyColumn` → `LazyRow` de `TvChannelCard`

Ce motif est **hérité du jumeau Flutter** (`client/lib/screens/home_screen.dart:494`,
`ListView.builder(scrollDirection: Axis.horizontal)` de `_ChannelCard` en 16:9) : ce n'est
pas un choix délibéré du portage, c'est une reprise. Le Flutter n'est donc **pas** une
référence utile ici, contrairement à l'habitude du projet.

Trois défauts, dans l'ordre d'importance :

1. **L'imbrication horizontale est le vrai problème de navigation.** Atteindre la 40ᵉ
   chaîne d'un genre demande 40 déplacements horizontaux — soit 40 appuis sur le D-pad
   d'une télécommande. Un axe de défilement imbriqué dans l'autre est coûteux au doigt et
   pire encore au D-pad.
2. **La carte 16:9 est la mauvaise forme pour une chaîne.** L'identité d'une chaîne, c'est
   son **logo** — souvent un petit PNG transparent — et son nom. L'étirer en 16:9 remplit
   l'essentiel de la carte de fond vide. Un film, lui, a une vraie affiche : la refonte ne
   doit donc **pas** toucher aux écrans Films et Séries.
3. **Densité et coût.** Une carte de 170 dp laisse voir 2 à 3 chaînes par largeur d'écran ;
   une ligne de liste en laisse voir 10 à 12 par hauteur. Et chaque carte déclenche le
   chargement d'une image distante, sur un catalogue de ~11 900 chaînes.

### Contrainte mesurée : l'EPG n'est pas disponible en masse

`IptvRepository.fetchShortEpg(streamId)` interroge **une chaîne à la fois** ; l'API Xtream
n'expose pas d'EPG groupé. Afficher « en ce moment » sur chaque ligne d'une liste
demanderait un appel réseau par ligne — à exclure.

➡️ Conséquence de conception : l'EPG n'a sa place que pour **la chaîne focalisée ou
sélectionnée**, où un seul appel suffit.

### Proposition

**Mobile — liste verticale dense.** Une ligne par chaîne, ~64 dp :
logo 44 dp en `Fit` (jamais recadré, les logos sont transparents et de ratios variés),
nom sur une ligne, étoile de favori en fin de ligne. Le genre cesse d'être un **niveau
d'imbrication** pour devenir un **filtre** : à l'intérieur d'un genre, une seule liste
plate, un seul axe de défilement.

**TV — deux panneaux.** Genres à gauche, liste verticale de chaînes à droite. Haut/bas
avance d'une chaîne, ce qui rend la navigation prévisible ; la sélection d'un genre reste
à gauche. C'est le motif classique des applications TV, et il s'accorde au rail déjà en
place. L'EPG de la chaîne **focalisée** peut alors être chargé — un appel à la fois,
temporisé.

**Portée.** `LayoutMode` (`THEMES`, `GRID_SMALL`, `GRID_MEDIUM`) est partagé par Home,
Movies et Series. Ajouter `LIST` et n'en faire le **défaut que pour les chaînes live**
préserve les affiches là où elles ont du sens.

### Points à vérifier pendant l'implémentation

- **Logos hétérogènes** : certains absents, d'autres énormes, souvent transparents sur
  fond clair. Prévoir un fond neutre constant et un repli en pastille d'initiales.
- **Focus D-pad sur TV** : toute nouvelle liste focalisable doit être vérifiée à
  l'émulateur (§11) — c'est le sujet qui a motivé la migration depuis Flutter.
- **Liste plate de ~11 900 éléments** : clés stables obligatoires, et un défilement rapide
  (index alphabétique) à envisager si la mesure le justifie.


### Mise en œuvre mobile — fait et vérifié

| Élément | Rôle |
|---|---|
| `LayoutMode.LIST` | nouvelle disposition, **défaut du live** |
| `HomeScreen.ChannelRow` | une chaîne par ligne : logo 44 dp, nom, étoile de favori |
| `MainScreen` | état de disposition **séparé** live / VOD |

**La disposition était partagée par les trois onglets.** Un seul `layoutModeIndex` servait
Home, Movies et Series : faire de la liste le défaut du live l'aurait imposée aux affiches
de films. Deux états distincts désormais, chacun avec son défaut, et l'option « Liste »
n'est proposée que sur l'onglet live.

**Trois écarts délibérés avec l'ancienne `ChannelCard`** :

1. **`ContentScale.Fit`, jamais `Crop`.** L'ancienne carte recadrait le logo en 16:9 ; les
   logos de chaînes sont de ratios très variés et souvent transparents, le recadrage en
   amputait une partie.
2. **Repli en initiales** quand le logo manque ou échoue, au lieu d'une icône générique
   répétée à l'identique sur des centaines de lignes.
3. **L'étoile de favori fonctionne.** `ChannelCard` déclarait `onFav` **sans jamais
   l'appeler** — même classe de défaut que UX-2 sur TV : mettre une chaîne live en favori
   était impossible depuis la grille mobile.

### Mesuré sur appareil

| Observation | Résultat |
|---|---|
| Genre « Animation » (4 chaînes) en grille | 3 visibles — **« One Piece » caché** derrière le défilement horizontal |
| Le même en liste | **4 visibles**, un seul axe de défilement |
| Densité en liste | **7 chaînes par écran**, pas de rangée imbriquée |
| Logo réel rendu | ✅ 10 teintes distinctes dans la vignette |
| Étoile de favori | ✅ 0 → 578 pixels dorés à l'appui |
| Persistance du favori | ✅ toujours 578 après `force-stop` + relance |

L'écart mesuré paraît modeste sur cette playlist publique, dont les genres comptent 3 à
27 chaînes. Il est **structurel et croît avec la taille du genre** : sur le catalogue réel
de l'utilisateur, des genres à 336 et 317 chaînes (relevés en §8) demandaient autant de
déplacements horizontaux pour atteindre la dernière.

⚠️ Le portage TV reste à faire, et son focus D-pad devra être vérifié à l'émulateur.


### Les favoris de chaînes n'étaient lus par personne

Défaut trouvé en répondant à une remarque de l'utilisateur — « l'étoile sur une chaîne
n'est pas très utile, non ? ». Elle ne l'était pas : `MyListScreen` ne consommait que
`movieFavorites` et `seriesFavorites`. `FavoritesRepository.channelFavorites` était
**écrit et lu par personne**.

La bonne réponse n'était donc pas de retirer l'étoile mais de lui donner un effet :

| Changement | Détail |
|---|---|
| `ui/common/ChannelRow.kt` | `ChannelRow` extrait de `HomeScreen` en composant partagé — il sert désormais aux deux écrans, et prépare le portage TV |
| `MyListScreen` | filtre **« Chaînes »**, chaînes favorites en pleine largeur (`GridItemSpan(maxLineSpan)`) au-dessus des affiches |
| `MainScreen` | `onPlayChannel` transmis à « Ma liste » |

Une chaîne est une ligne, pas une affiche 2:3 : elle occupe toute la largeur dans la
grille à trois colonnes plutôt que d'être forcée dans une case de poster.

**Vérifié sur appareil, aller-retour complet** :

| Étape | Résultat |
|---|---|
| Étoile depuis la liste des chaînes | ✅ 0 → 578 pixels dorés |
| Persistance après `force-stop` | ✅ |
| « Ma liste » | ✅ **« ADN TV+ » affiché**, compteur « 1 titre », filtre « Chaînes » présent |
| Retrait depuis « Ma liste » | ✅ la chaîne disparaît, « Votre liste est vide » |

➡️ Ce défaut existe **à l'identique côté TV** : `TvMyListScreen` ne lit lui non plus que
les films et les séries.


### Ordre des favoris — mesuré, et ce n'est pas celui qu'on croit

Question de l'utilisateur : « s'ils sont juste ajoutés et apparaissent dans leur ordre
d'ajout, il serait intéressant de permettre de modifier l'ordre ». Vérifié sur appareil,
en mettant trois chaînes en favori dans l'ordre **inverse** du catalogue :

| | |
|---|---|
| Ordre d'ajout | Pluto TV Retro Toons → Gong → **ADN TV+** |
| Ordre affiché | **ADN TV+** → Gong → Pluto TV Retro Toons |

Exactement l'inverse. Ce n'est donc **ni l'ordre d'ajout, ni un ordre choisi** : c'est
l'ordre du **catalogue du fournisseur**, parce que `MyListScreen` parcourt `allChannels` et
retient les favoris (`allChannels.filter { channelFavs.contains(it.name) }`).

**Pourquoi l'ordre d'ajout est structurellement impossible aujourd'hui.**
`FavoritesRepository` persiste les favoris en `stringSetPreferencesKey` — un **`Set`**, qui
par définition ne porte aucun ordre. Même en itérant le `Set` plutôt que le catalogue, on
n'obtiendrait qu'un ordre de hachage, arbitraire et instable.

➡️ Permettre à l'utilisateur de réordonner exige donc de **changer la persistance**, pas
seulement l'écran :

1. passer d'un `Set<String>` à une **liste ordonnée** — DataStore Preferences n'a pas de
   type liste, il faudra encoder (JSON via Moshi, comme `RecentItemsCodec` le fait déjà
   pour la reprise de lecture, cf. P2) ;
2. prévoir une **migration** des favoris existants, dont l'ordre initial devra être choisi
   (catalogue, ou alphabétique) ;
3. décoder de façon **défensive** — règle du §2 : une entrée corrompue ne doit pas vider
   la liste ni faire crasher l'écran ;
4. l'ordre concerne aussi les films et séries, stockés de la même façon : traiter les trois
   d'un coup plutôt que d'introduire deux mécanismes.

Le glisser-déposer en UI (`LazyColumn` réordonnable) n'est que la dernière étape, et la
moins risquée.

---

## 14. Favoris de chaînes sur TV — le retrait n'a jamais été cassé *(2026-08-19)*

`raf.md` : « Sur l'app tv, je peux mettre en favoris une chaîne mais je ne peux pas la
retirer. » Le diagnostic évident — un `toggle()` qui n'ajoute que — est **faux** :
`FavoritesRepository.toggle()` retire aussi bien qu'il ajoute, et c'est couvert par la
suite de tests.

### Ce que la mesure a montré

Deux défauts distincts se combinaient pour rendre le retrait **introuvable** :

1. **La vue de navigation par défaut n'offre aucun bouton favori.**
   `TvHomeScreen` passe `showFavBtn = true` sur les résultats de recherche (l. 180) et sur
   un genre sélectionné (l. 200), mais **`showFavBtn = false`** sur la vue par défaut
   (l. 240) — celle où l'on atterrit. Vérifié à l'émulateur : en parcourant la rangée au
   D-pad, le focus ne passe que de chaîne en chaîne, jamais sur une étoile.
2. **« Ma liste » n'affichait pas les chaînes.** `TvMyListScreen` ne lisait que
   `movieFavorites` et `seriesFavorites` — exactement le trou trouvé côté mobile.

Résultat : une chaîne mise en favori depuis la recherche n'apparaissait **nulle part** et
n'était retirable **d'aucun écran**. D'où l'impression, parfaitement fondée, que le retrait
ne marche pas.

### Correction

`ui/common/TvChannelRow.kt` — équivalent TV de `mobile/ui/common/ChannelRow`, avec **deux
surfaces focalisables distinctes** : la ligne (lecture) et l'étoile (retrait). Branché dans
`TvMyListScreen`, qui gagne un filtre « Chaînes » et affiche les chaînes en pleine largeur
(`GridItemSpan(maxLineSpan)`).

**`showFavBtn = false` est laissé tel quel dans la vue par défaut** : l'activer doublerait
le nombre d'appuis pour traverser une rangée horizontale, ce qui est probablement la raison
du choix initial. Le portage de la vue en liste (§13) réglera le sujet proprement, la ligne
portant son étoile comme sur mobile.

### Vérifié au D-pad sur émulateur

| Étape | Résultat |
|---|---|
| Deux favoris injectés en base (`fav_channels`) | — |
| « Ma liste » | ✅ **« 2 TITRES »**, filtre « Chaînes », `ADN TV+ ★` et `Gong ★` |
| D-pad : ligne → étoile | ✅ deux éléments focalisables, trace `['Gong'] → ['★']` |
| DPAD_CENTER sur l'étoile | ✅ **« Gong » disparaît**, compteur à « 1 TITRE » |

Outil ajouté au scratchpad : `mkfav.py "Chaîne A" "Chaîne B"` encode le protobuf DataStore
d'un `stringSetPreferencesKey`, pour poser un état de favoris connu sans passer par l'UI.

### Mise en œuvre TV — deux panneaux, fait et vérifié au D-pad

`TvHomeScreen` abandonne les rangées horizontales imbriquées pour un `Row` de deux
`LazyColumn` :

```
[ rail ]  [ genres 360 dp ]  [ chaînes (poids 1) ]
```

- panneau gauche : `TvGenreItem` — nom, effectif, et son étoile de favori ;
- panneau droit : `TvChannelRow`, la même ligne que « Ma liste », avec l'étoile de la
  chaîne. Les favoris remontent en tête ;
- la recherche passe elle aussi en liste, pour une seule et même forme.

**Le mode « genre sélectionné » disparaît** : il ouvrait un écran séparé, alors que les
deux panneaux rendent la sélection immédiate. `TvChannelCard` et `TvGenreHeader`
deviennent morts et sont supprimés — `TvHomeScreen` passe de 605 à 397 lignes.

#### Trace D-pad relevée sur l'émulateur

```
rail → [ANIMATION 4] → [☆ du genre] → [ADN TV+] → Daria → Gong → One Piece
```

**Un appui = une chaîne.** L'ancienne disposition demandait autant d'appuis *à droite* que
de rang dans le genre. Sélectionner « BUSINESS NEWS » à gauche met immédiatement à jour le
panneau droit (« BFM Business »).

⚠️ Rugosité constatée, non corrigée : arrivé à la **dernière** chaîne d'un genre, un appui
supplémentaire vers le bas fait sortir le focus vers le rail de navigation. Compose TV
cherche le focalisable le plus proche quand la liste est épuisée. Sans gravité — on revient
d'un appui — mais à surveiller si l'on ajoute un panneau EPG à droite.

⚠️ `app-tv` reste en **versionCode 8** : rien de tout ceci n'est distribué.

---

## 15. Ordre des favoris — réglable par l'utilisateur *(2026-08-19)*

Suite du constat de §13 : l'ordre affiché était celui du **catalogue du fournisseur**, ni
l'ordre d'ajout ni un ordre choisi. Le rendre réglable imposait de changer la persistance,
pas seulement l'écran.

### Ce qui a été écrit

| Élément | Rôle |
|---|---|
| `core/data/FavoritesCodec.kt` | encode/décode une **liste ordonnée** en JSON, migre l'ancien `Set`, et déplace un élément. Logique pure, **14 tests** |
| `FavoritesRepository` | six listes ordonnées (`*_ordered`), `moveChannel/Movie/Series` |
| `ContentViewModel` | les six flux passent de `Set<String>` à `List<String>` ; `moveChannelFavorite` exposé |
| `ChannelRow` · `TvChannelRow` | commandes ▲ ▼ optionnelles |
| `MyListScreen` · `TvMyListScreen` | les commandes, et **l'ordre lu depuis les favoris** |

### Deux pièges, dont un trouvé par la mesure

**1. Changer le stockage ne suffit pas.** Après avoir tout basculé en liste ordonnée, le
réordonnancement restait **sans effet à l'écran**. Cause : `MyListScreen` construisait sa
liste par `allChannels.filter { favoris.contains(it.name) }` — il parcourait le
*catalogue* et retenait les favoris, reprenant donc l'ordre du fournisseur. Corrigé en
inversant le sens du parcours :

```kotlin
val byName = allChannels.associateBy { it.name }
channelFavs.mapNotNull { byName[it] }   // l'ordre vient des favoris
```

Le même défaut existait pour les films et les séries : corrigé des deux côtés.

**2. La migration ne doit rien perdre.** Les anciennes clés `Set` sont **lues en repli**
tant que la nouvelle clé n'existe pas, et supprimées à la première écriture. La migration
est donc **paresseuse** : afficher ses favoris ne déclenche aucune écriture.

L'ordre initial de migration est **alphabétique** — seul ordre reproductible. Reprendre
l'itération du `Set` donnerait un ordre de hachage, différent d'un appareil à l'autre.

### Pourquoi des boutons ▲ ▼ et pas un glisser-déposer

Le glisser-déposer n'existe pas sur une télécommande. Des boutons donnent **la même
interaction sur mobile et sur TV**, restent opérables au D-pad, et se vérifient. Un
glisser-déposer mobile pourra s'ajouter par-dessus, il ne remplacera pas les boutons.

Aux extrémités, la commande correspondante est **absente** plutôt qu'inopérante — et
`FavoritesCodec.move` ignore de toute façon un index hors bornes, l'UI pouvant en émettre
un périmé pendant une modification.

### Vérifié sur appareil et sur émulateur

| Observation | Résultat |
|---|---|
| Migration mobile (3 favoris en ancien `Set`) | ✅ tous conservés, ordre alphabétique |
| Migration paresseuse | ✅ l'ancienne clé subsiste après simple affichage |
| Déplacement mobile | ✅ `[Gong, ADN TV+, Pluto]` → `[ADN TV+, Gong, Pluto]` |
| Persistance | ✅ `fav_channels_ordered = ["ADN TV+","Gong","Pluto TV Retro Toons"]`, ancienne clé **supprimée**, ordre conservé après relance |
| Migration TV | ✅ ordre alphabétique |
| Déplacement TV au D-pad | ✅ ▲ sur `Daria` → `[Daria, ADN TV+]` |

**État : 106 tests, 0 échec** (92 + 14 `FavoritesCodecTest`).

⚠️ Seules les **chaînes** exposent les commandes dans l'UI. `moveMovie` et `moveSeries`
existent au niveau du repository mais ne sont pas branchés : à faire si le besoin se
confirme sur les affiches.

---

## 16. TV — le rail s'ouvre « sans raison » après certains clics *(2026-08-19, diagnostiqué, non corrigé)*

Signalé par l'utilisateur : « lors de certains clics, ça ouvre le panneau latéral sans
raison ». Constaté aussi pendant les tests de §13 et §15, sans que j'y voie d'abord un
défaut à part entière.

### Mécanisme, établi par lecture et par mesure

`TvMainScreen` déplie le rail **dès que le focus y entre** :

```kotlin
.onFocusEvent { state -> railHasFocus = state.hasFocus }   // l. 118
LaunchedEffect(railHasFocus) { expanded = railHasFocus }   // l. 79-85  (72 dp → 240 dp)
```

Ce n'est donc pas le clic qui ouvre le panneau : c'est **le focus qui s'y réfugie**. Compose
TV, lorsque l'élément focalisé disparaît ou qu'une liste est épuisée, redonne le focus au
focalisable le plus proche — et le rail, toujours présent à gauche, est le candidat naturel.

### Reproduit sur émulateur

Dans « Ma liste », focus sur l'étoile de `Gong`, rail **replié** (aucun libellé visible,
largeur 72 dp) :

```
rail: replié   focus [1760,522][1872,634] -> ['★']
→ DPAD_CENTER (retire le favori, donc la ligne focalisée disparaît)
rail: DÉPLIÉ   focus [28,184][452,280]   -> ['Direct TV']     (largeur 424 px ≈ 240 dp)
```

### Les trois gestes qui le déclenchent

1. **retirer un favori** — la ligne focalisée disparaît ;
2. **déplacer un favori** (▲ ▼, §15) — l'élément change de place sous le focus ;
3. **atteindre la fin d'une liste** — déjà noté en §13 comme « rugosité ».

Les deux premiers sont apparus avec les écrans récents : le défaut est **plus visible
qu'avant**, même si le mécanisme lui préexistait.

### Correction appliquée aux mutations de liste — ✅ vérifiée

`TvMyListScreen` retient le focus dans le panneau de contenu **quand la mutation vient
d'ici** : un `FocusRequester` sur la première ligne, redemandé par un `LaunchedEffect`
après un retrait ou un déplacement. Le drapeau `refocusAfterEdit` est essentiel — sans
lui, on volerait le focus à qui se dirige délibérément vers le rail.

| Geste | Focus avant | Focus après correction |
|---|---|---|
| Retirer un favori | `['Direct TV']` — **rail**, panneau déplié | `['ADN TV+']` — contenu, rail replié |
| Déplacer un favori | idem | `['Daria']` — contenu, rail replié |

Rail mesuré replié après coup : aucun libellé large à gauche, seul le sigle `✦` à
x=57-87.

⚠️ **Le troisième déclencheur reste ouvert** : atteindre la fin d'une liste fait toujours
sortir le focus vers le rail. C'est le comportement par défaut de Compose TV quand il n'y
a plus de focalisable dans la direction demandée ; le corriger revient à piéger le focus,
ce qui demande plus de précautions.

### Piste initiale — conservée pour mémoire

Retenir le focus dans le panneau de contenu après une mutation : un `FocusRequester` par
liste, redemandé sur le voisin quand l'élément focalisé disparaît, le tout dans un
`focusGroup()`. ⚠️ La gestion du focus D-pad est **précisément** ce pour quoi l'application
a quitté Flutter : toute modification doit être vérifiée à l'émulateur (§11), et une
correction trop large risque de piéger le focus et de rendre le rail inatteignable — le
défaut inverse, et pire.

---

## 17. Localisation — le défaut allait dans les deux sens *(2026-08-19)*

Signalé comme « en mode anglais il reste du français ». L'audit a montré plus large : la
localisation n'avait **jamais été faite** sur la plupart des écrans, et les libellés en dur
étaient tantôt français, tantôt anglais.

| Sens | Exemples |
|---|---|
| Français visible en mode **anglais** | rail TV (`Films`, `Séries`, `Paramètres`), en-têtes (`215 CHAÎNES - 28 GENRES`), lecteur (`Pistes & Sous-titres`, `VITESSE DE LECTURE`), `Ma liste` |
| **Anglais** visible en mode français | **le paywall mobile entier** (`Unlock unlimited access`, `Maybe later`, `No products available at the moment.`), fiche film (`Plot`, `Director`, `Cast`, `Download`) |

Le second sens était le plus coûteux : **l'écran qui vend** s'affichait en anglais à un
utilisateur francophone.

### Deux défauts distincts, traités séparément

1. **Libellés en dur dans le Kotlin** — 35 sur `app-tv`, 33 sur `app-mobile`, extraits en
   ressources et remplacés par `stringResource`. Les compteurs deviennent des formats
   (`%1$d CHAÎNES - %2$d GENRES`) plutôt que des concaténations.
2. **Clés sans traduction** — 22 clés existaient dans `values/` sans équivalent
   `values-fr/` (écran Paramètres et style des sous-titres) : elles retombaient en anglais
   en mode français, silencieusement.

### Contrôle de parité, à rejouer après toute modification

```bash
python3 - <<'EOF'
import re
def keys(p): return set(re.findall(r'<string name="([^"]+)"', open(p,encoding='utf-8').read()))
for m in ('app-tv','app-mobile'):
    en=keys(f'{m}/src/main/res/values/strings.xml'); fr=keys(f'{m}/src/main/res/values-fr/strings.xml')
    print(m, len(en), len(fr), sorted(en-fr) or 'OK')
EOF
```

| Module | avant | après |
|---|---|---|
| `app-tv` | 91 en / 69 fr | **95 / 95** |
| `app-mobile` | — | **110 / 110** |

Plus aucun `Text("…")` accentué en dur dans les deux modules.

### Vérifié à l'écran

| Écran | Locale | Résultat |
|---|---|---|
| Accueil TV | anglais | `Live TV`, `Movies`, `Series`, `My list`, `Settings`, `215 CHANNELS - 28 GENRES` — **aucun français** |
| « Ma liste » mobile | français | `Ma liste`, `Tout`, `Chaînes`, `Films`, `Séries` |
| **Paywall mobile** | français | `Accès illimité à tous les contenus`, `Aucune offre disponible pour le moment.`, `Plus tard` — auparavant tout en anglais |

⚠️ Restent en dur, volontairement : les invariants (`LIVE`, `AUDIO`, `OK`, `%`) et les
libellés techniques d'animation (`rail-width`, `dl_shimmer`) qui ne sont pas de l'UI.

---

## 18. Plein écran et mise en veille pendant la lecture *(2026-08-19)*

Points 7 et 8 du lot. Tous deux **confirmés par absence** : aucune occurrence de
`WindowInsetsController` côté mobile, et aucune de `FLAG_KEEP_SCREEN_ON`, `keepScreenOn`
ou `WakeLock` dans **aucun** des trois modules.

➡️ Conséquence : **le point 8 touchait aussi le mobile.** L'utilisateur ne l'avait remarqué
que sur TV — c'est là que le symptôme est le plus net, une télécommande restant posée
pendant tout un film.

### Pourquoi un lecteur vidéo est le pire cas

Le système mesure l'inactivité aux interactions. Un lecteur n'en reçoit aucune : l'écran
s'éteint donc en pleine lecture, alors que l'application est manifestement utilisée. C'est
`FLAG_KEEP_SCREEN_ON` qui le signale, et rien ne le posait.

### Ce qui a été écrit

| Élément | Rôle |
|---|---|
| `mobile/ui/common/ScreenMode.kt` | `KeepScreenOn()` et `ImmersiveFullScreen()` |
| `tv/ui/common/KeepScreenOn.kt` | équivalent TV (pas de barres système à masquer) |

Deux précautions qui évitent le **défaut inverse** :

1. **Tout est retiré à la sortie** (`onDispose`) — un drapeau laissé en place donnerait un
   écran qui ne s'éteint jamais et des barres système définitivement masquées.
2. `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` — les barres restent accessibles d'un
   glissement. Les masquer sans échappatoire enfermerait l'utilisateur.

`ImmersiveFullScreen` est désactivé en PiP : masquer des barres n'a pas de sens dans une
fenêtre incrustée.

### Vérifié sur appareil, pendant **et** après la lecture

| Mesure | Pendant | Après sortie |
|---|---|---|
| `dumpsys window` — barre d'état | `type=statusBars … visible=false` | `visible=true` |
| `dumpsys power` — verrou | `SCREEN_BRIGHT_WAKE_LOCK … ws=WorkSource{com.purple.iptvplayer.debug}` | 0 occurrence |

La seconde colonne est la moitié qui compte : elle prouve qu'on n'a pas troqué un défaut
contre son symétrique.

---

## 19. Paramètres TV et fiche film *(2026-08-19)*

Vérifiés avec **le vrai catalogue de l'utilisateur** sur l'émulateur — le VPN rend le
fournisseur joignable depuis le poste, ce que §8 croyait impossible. 11 889 chaînes,
26 284 films : les écarts trouvés ici étaient invisibles sur le catalogue public, qui n'a
ni films ni séries.

⚠️ **Accélération** : lancer l'émulateur avec `-gpu host` au lieu de `swiftshader_indirect`
fait tomber le démarrage de ~85 s à **20 s**. À utiliser systématiquement.

### Point 3 — l'écran Paramètres

Trois défauts, dont deux invisibles dans un relevé textuel et trouvés **sur capture** :

1. **Le réglage d'arrière-plan des sous-titres manquait.** Pire : l'aperçu TV *reflétait*
   déjà ce réglage (`subBg`), sans qu'aucun contrôle ne permette de le changer. Le
   composable `TvToggleOption` existait **sans être utilisé nulle part** — troisième
   occurrence du motif après `onPurchase` (§UX-2) et `onFav` de la carte mobile.
2. **Le sélecteur de langue s'affichait comme une barre violette vide**, « EN » chassé hors
   de l'écran. Cause :
   ```kotlin
   .then(if (modifier == Modifier) Modifier else Modifier.fillMaxWidth())
   ```
   Comparer un `Modifier` par égalité : le seul appelant à en passer un est le premier
   bouton de langue, pour son `focusRequester` — il héritait donc de `fillMaxWidth()`.
3. **Le libellé du bouton focalisé était illisible** : le focus teinte le fond avec
   `accentColor` et le texte prenait la même couleur.

L'écran présente désormais les mêmes sections que le mobile : Langue, TAILLE, COULEUR,
ARRIÈRE-PLAN, APERÇU, déconnexion.

### Point 6 — la fiche film

**L'affiche était rognée.** Son cadre faisait 24 % de largeur sur toute la hauteur, soit un
ratio de 0,43 pour une image en 2:3 (0,667) : avec `ContentScale.Crop`, les côtés étaient
coupés — d'où l'impression d'affiche étroite. Un dégradé horizontal la recouvrait en outre.

Elle est maintenant en **2:3 réel**, centrée, coins arrondis et ombre portée. Deux autres
corrections : le titre ne répète plus l'année déjà portée par une puce, et le synopsis est
**défilable** au lieu d'être tronqué à 8 lignes.

⚠️ **Régression introduite puis corrigée** : à `fillMaxHeight(0.72f)`, l'affiche mangeait
assez de largeur pour que le dernier bouton d'action ne tienne plus — son libellé
« Close » s'écrivait **verticalement**, une lettre par ligne. Ramenée à `0.62f`.
Vérifier la rangée de boutons après toute modification de la largeur de l'affiche.

⚠️ **La fiche série n'a pas reçu ce traitement** : `TvSeriesScreen` a sa propre mise en
page, non auditée ici.

---

## 20. Régression introduite par la localisation : la fiche série plantait *(2026-08-19)*

Trouvée en ouvrant une série sur le vrai catalogue. L'application **quittait brutalement**
— ce que j'ai d'abord pris pour une erreur de navigation de mes scripts.

```
java.util.IllegalFormatConversionException: d != java.lang.String
    at TvSeriesScreenKt$TvSeriesDetailPage$…
```

Cause : lors de l'extraction des libellés en ressources (§17), `"Saison $season"` est
devenu `stringResource(R.string.label_season, season)` avec un format `%1$d`. Or `season`
vient de `d.seasons.keys` — ce sont des **chaînes** (`sortedBy { it.toIntOrNull() }` le
montre). Passer une `String` à `%d` lève à l'exécution.

➡️ **Un format de ressource mal typé ne se voit pas à la compilation.** Le compilateur
accepte `stringResource(id, n'importe quoi)` ; l'erreur n'apparaît qu'au rendu, et fait
tomber l'écran entier. Une extraction de libellés doit donc s'accompagner d'un contrôle
type-par-type de chaque argument.

Audit des sept formats introduits : seul `label_season` était faux, les six autres
reçoivent bien des entiers (`.size`, `daysLeft`, `trialDays`).

| Format | Argument | Verdict |
|---|---|---|
| `count_results`, `count_channels`, `count_titles` | `.size` | ✅ `%d` |
| `premium_days`, `trial_banner` | `daysLeft`, `days` | ✅ `%d` |
| `label_rating` | `rating` (String) | ✅ `%s` |
| `label_season` | `season` (**String**) | ❌ `%d` → corrigé en `%s` |


---

## 21. Fiche série — lisibilité et rendu *(2026-08-19)*

### Le défaut le plus coûteux : le titre de série répété à chaque ligne

Le fournisseur préfixe le nom de la série au titre de chaque épisode :

```
E1 - The Walking Dead : Dead City De vieilles connaissances
```

Répété sur toute la liste, il noyait le vrai titre en fin de texte. `stripSeriesName()`
le retire — comparaison insensible à la casse, tolérante aux séparateurs (`:`, `-`, `–`),
et **repli sur le titre d'origine** si le retrait laisse une chaîne vide, un épisode
pouvant légitimement porter le nom de la série.

```
E1  ·  De vieilles connaissances
```

### Rendu adouci

Chaque ligne portait un liseré de 1 dp ; répété sur toute la liste, c'est lui qui donnait
l'aspect de tableau. Remplacé par un fond translucide (`Fg1` à 4 %), le focus étant marqué
par un remplissage franc et une lueur, sans bordure. Vignettes portées de 72×42 à 104×58,
coins plus doux.

### Deux décisions de mise en page, prises après mesure

| Question | Décision | Pourquoi |
|---|---|---|
| Bouton « Fermer » : le supprimer, ou l'élargir ? | **Colonne gauche portée de 220 à 280 dp**, les deux boutons côte à côte | À 220 dp, « Fermer » se repliait une lettre par ligne. Les lignes d'épisodes ont de la marge de reste — l'élargissement ne leur coûte rien. Mieux que dégrader le bouton en icône |
| Où placer « Télécharger la saison » ? | **Au bout de la rangée des saisons** | Il porte sur la saison sélectionnée, sa place est à côté d'elle. Récupère une ligne entière : **6 épisodes visibles au lieu de 5** |

Le synopsis passe en `weight(1f)` défilable et non en hauteur fixe : avec une hauteur en
dur, un synopsis long repoussait les boutons **hors de l'écran**.

### ⚠️ Non vérifié : les séries à très nombreuses saisons

« Les Simpson » en compte **37** dans le catalogue de l'utilisateur, « Grey's Anatomy » 22.
La rangée est une `LazyRow`, donc défilante par construction, et le bouton de
téléchargement reste épinglé à droite grâce au `weight(1f)`. **Mais je n'ai pas pu
l'observer** : ces séries ne sont atteignables que par la recherche, et les résultats de
recherche sont inatteignables au D-pad (défaut 10). À reprendre une fois celui-ci corrigé.

---

## 22. Recherche TV — les résultats étaient inatteignables à la télécommande *(2026-08-19)*

Trouvé en cherchant à ouvrir « Les Simpson » (37 saisons) pour vérifier §21. Sur l'écran
Séries, une fois le curseur dans la barre de recherche, **la touche Bas ne la quittait
jamais** — et repasser par le rail y ramenait. Les 8 résultats étaient pourtant tous
`focusable="true"` : ce n'est donc pas qu'ils manquaient, c'est que la navigation n'y
descendait pas.

### Cause

`TvSearchBar` contient un `BasicTextField`. **Un champ de texte consomme les touches
directionnelles** — il les interprète comme un déplacement du curseur — et elles ne
remontent jamais au gestionnaire de focus.

**Correction** dans le composant partagé, donc valable pour Direct TV, Films et Séries :
haut et bas sont interceptés en `onPreviewKeyEvent`, *avant* le champ, et délégués à
`focusManager.moveFocus`. `moveFocus` renvoyant `false` quand il n'y a rien dans cette
direction, on laisse alors passer la touche plutôt que de l'avaler.

Vérifié : la touche Bas déplace désormais le focus de la barre vers une carte de résultat
(`focus [533,174][850,650]`).

### ⚠️ Piège de méthode — le clavier virtuel avale les touches

Pendant le test, `adb shell input keyevent 20/22/23` s'écrivait **dans le champ** :
« Simpson » devenait « Simpsonq », « Simpsonqs ». L'IME était encore affiché et captait
les touches directionnelles. `keyevent 111` (ÉCHAP) ne suffit pas ; il faut
`keyevent 4` (RETOUR), puis contrôler :

```bash
adb shell dumpsys input_method | grep -o 'mInputShown=(true|false)'
```

Sans ce contrôle, on croit à un défaut de focus alors qu'aucun événement directionnel
n'atteint l'application.

### Reste ouvert

Depuis une carte de résultat, **Droite remonte à la barre de recherche** au lieu d'aller à
la carte suivante (défaut 11). C'est la même famille que les défauts 9 et §16.

---

## 23. Gestion du focus sur TV — traiter la cause, pas les symptômes *(2026-08-19)*

Trois défauts signalés séparément — le rail qui s'ouvre seul (§16), le rail qui met en
avant le mauvais onglet (9), le focus qui remonte à la barre de recherche (11) — ont
**la même racine** : quand l'élément focalisé disparaît ou qu'il n'y a rien dans la
direction demandée, Compose TV redonne le focus au focalisable le plus proche, souvent le
premier de l'arbre.

### Défaut 9 — mesuré, puis corrigé

Trace relevée avant correction :

```
gauche (rail)   -> ['Live TV']
bas             -> ['Movies']
bas             -> ['Series']
valide (Series) -> ['Live TV']      ← le focus retombe sur le premier élément
```

Deux corrections indépendantes, l'une visuelle et l'autre de focus :

1. **Un liseré d'onglet actif, indépendant du focus.** `isFocused` était testé avant
   `isActive` et remplissait la pastille : un onglet simplement survolé paraissait plus
   sélectionné que celui réellement affiché. Le liseré ne dépend que d'`isActive`.
2. **Un `FocusRequester` par onglet**, redemandé après le changement de contenu, pour
   poser l'invariant « l'onglet focalisé est celui qui est affiché ».

Trace après correction : `valide (Series) -> ['Series']`, puis `valide (Movies) -> ['Movies']`.

### ⚠️ Le premier correctif avait son propre défaut

La première version pilotait l'effet par un état `pendingRailFocus` remis à `-1`
**à l'intérieur** du bloc :

```kotlin
LaunchedEffect(pendingRailFocus) {
    if (pendingRailFocus >= 0) {
        pendingRailFocus = -1   // ← modifie la clé : l'effet est annulé et relancé
        delay(60)
        requestFocus()          // ← jamais atteint
    }
}
```

**Modifier l'état qui sert de clé à un `LaunchedEffect` l'annule.** Le symptôme était
identique à l'absence de correctif, et j'ai d'abord cru à un délai trop court — j'ai
augmenté le délai à 350 ms sans effet, avant de voir la vraie cause. La clé est désormais
`selectedIndex`, que l'effet ne modifie pas.

### ⚠️ Régression du liseré, corrigée dans la foulée

Ajouter le liseré m'a fait remplacer `Arrangement.Center` par `spacedBy(0.dp)` : en mode
**replié**, le rail n'a la place que de son icône, et les 3 dp du liseré la décentraient —
signalé par l'utilisateur comme « une marge à droite ». Le liseré n'est donc rendu qu'en
mode déplié ; replié, la teinte de la pastille suffit à marquer l'onglet actif.

Mesuré après correction : fond du rail large de 144 px, centre à 72 px, centre des
éléments à 72 px.

### État des trois défauts

| Défaut | État |
|---|---|
| §16 — le rail s'ouvre après un retrait ou un déplacement dans « Ma liste » | ✅ corrigé (garde-fou `refocusAfterEdit`) |
| 9 — le rail met en avant le mauvais onglet | ✅ corrigé (liseré + `FocusRequester` par onglet) |
| 11 — depuis une carte de résultat, Droite remonte à la barre de recherche | ⏳ ouvert |
| §16 bis — atteindre la fin d'une liste fait sortir le focus vers le rail | ✅ corrigé, cf. §30 |

Le défaut 11 n'existait pas (§24) ; le §16 bis est corrigé au §30 — et la précaution
annoncée ici s'est révélée fondée : la première tentative de correction a bien cassé
autre chose.

---

## 24. Défaut 11 — mauvais diagnostic, et les 37 saisons enfin vérifiées *(2026-08-19)*

### Ce que j'avais annoncé était faux

J'avais consigné : « depuis une carte de résultat, Droite remonte à la barre de recherche
au lieu d'aller à la carte suivante ». Vérification faite en listant les nœuds
focalisables, **il n'y avait qu'une seule carte** :

```
focalisables : [1388,39][1782,135]   (barre de recherche)
               [1782,39][1878,135]   (bouton effacer)
               [533,174][850,650]    (l'unique résultat)
```

La recherche « Simpson » ne rendait qu'un résultat au moment du test — les deux vus plus
tôt venaient d'un état précédent. Droite ne « déviait » donc pas : il n'y avait rien à
droite, et Compose TV a fait ce qu'il fait toujours dans ce cas. **Le défaut 11 n'existe
pas** ; il se ramène au cas générique « rien dans cette direction », déjà consigné.

Leçon : compter les nœuds focalisables avant de conclure à un défaut de navigation.

### ✅ Séries à nombreuses saisons — vérifié

En attente depuis §21. « Les Simpson » compte **37 saisons**. Trace relevée :

```
focus [981,24] -> ['Season 5']
… 10 appuis vers la droite …
focus [981,24] -> ['Season 15']     saisons visibles : 14, 15, 16, 17
```

➡️ **La rangée défile correctement au D-pad**, et le bouton « Télécharger la saison »
reste épinglé à droite. La mise en page de §21 tient sur 37 saisons.

### Défaut trouvé au passage : le clavier virtuel piège la télécommande

Dès que le focus revient sur la barre de recherche, l'IME s'affiche et **avale les touches
directionnelles** : « Simpson » devenait « Simpsonp », « Simpsonqs ». C'est le même piège
que celui noté en §22 pour les tests, mais c'est aussi un défaut réel pour l'utilisateur —
à la télécommande, on traverse souvent la barre de recherche sans vouloir y saisir quoi
que ce soit. Consigné comme défaut 12.

---

## 25. Fiche série — navigation d'arrivée et accès au téléchargement *(2026-08-19)*

Deux remarques de l'utilisateur, toutes deux justes, et toutes deux conséquences de mes
choix de §21.

### Le focus d'arrivée était sur « Ma liste »

`firstDetailFocus` était posé sur le bouton « + Ma liste ». Or **l'action première d'une
série est de regarder un épisode**, pas de la mettre en favori. Pire, depuis ce bouton
aucune direction ne menait aux épisodes : à droite on trouvait « Fermer », puis les
boutons de téléchargement de la colonne de droite — jamais les lignes d'épisode.

Le focus d'arrivée va désormais au **premier épisode**. Trace :

```
arrivée   -> ['E1  ·  De vieilles connaissances']
haut      -> ['Download Season']
haut      -> ['Season 1']
```

Une hiérarchie naturelle : épisodes ← téléchargement de la saison ← saisons.

### « Télécharger la saison » est revenu sous la rangée des saisons

Je l'avais mis **au bout** de la rangée pour économiser une ligne (§21). Sur une série à
37 saisons, l'atteindre imposait de traverser les 37 onglets — l'économie d'une ligne
coûtait l'accessibilité du bouton.

Il repasse donc **en dessous**, où un simple « haut » depuis le premier épisode y mène.
Le gain de §21 (6 épisodes visibles au lieu de 5) est perdu, mais un bouton inatteignable
ne vaut pas une ligne de liste.

**Leçon** : une optimisation de densité qui allonge un chemin de navigation au D-pad est
un mauvais échange. Sur télécommande, le nombre d'appuis compte plus que le nombre de
lignes visibles.

---

## 26. Le clavier virtuel piégeait la télécommande *(2026-08-19)*

Dès que le focus arrivait sur la barre de recherche, le `BasicTextField` le prenait, le
clavier virtuel s'affichait, et **il avalait les touches directionnelles** : traverser la
barre à la télécommande écrivait dedans — « Simpson » devenait « Simpsonp », « Simpsonqs ».

C'est le prolongement du défaut 10 : celui-ci portait sur la sortie du champ, celui-ci sur
l'entrée.

### Motif retenu — le clavier à la demande

Le champ n'entre dans le parcours du focus **qu'une fois activé** :

```kotlin
var editing by remember { mutableStateOf(false) }
…
.onFocusChanged { isFocused = it.hasFocus; if (!it.hasFocus) editing = false }
.clickable { editing = true }
…
BasicTextField(modifier = Modifier
    .focusRequester(fieldFocus)
    .focusProperties { canFocus = editing })
```

La barre reste focalisable — c'est la **validation** qui donne le curseur, motif habituel
des interfaces TV.

### Deux pièges rencontrés

1. **`focusable()` en plus de `clickable{}`** créait deux nœuds concurrents et la
   validation n'atteignait jamais l'`onClick`. `clickable` rend déjà l'élément focalisable.
2. **`requestFocus()` immédiat échouait** : la recomposition n'avait pas encore appliqué
   `canFocus = true`, la demande portait donc sur un nœud non focalisable. Résolu par un
   `withFrameNanos { }` avant la demande.

### Vérifié à l'émulateur

| Étape | Mesure |
|---|---|
| Focus arrive sur la barre | `mInputShown=false` — clavier fermé |
| Validation | `mInputShown=true` — clavier ouvert |
| Saisie « Simpson » | « 2 RESULTS », résultats affichés |
| Traversée bas/bas/haut, clavier fermé | champ inchangé — **plus aucune touche parasite** |


---

## 27. Parseurs de catalogue — la tolérance ne doit pas être uniforme *(2026-08-19)*

Dernier point ouvert du §6 « Couverture » : les parseurs JSON de `XtreamApiClient`
portaient le défaut P2 — `JSONArray(json)` et `getJSONObject(i)` nus — mais sur le
chemin de **chargement du catalogue**, autrement plus exposé que « Reprendre la lecture ».

### Rouge constaté avant correction

`core/src/test/…/network/XtreamParsersTest.kt`, 14 tests. Au premier passage :
**9 échecs sur 10**, tous en `JSONException` :

```
ECHEC: une chaine corrompue est ecartee … -> org.json.JSONException: JSONArray[1] is not a JSONObject
ECHEC: un document de chaines illisible … -> org.json.JSONException: A JSONArray text must start with '['
```

Une seule ligne malformée dans la réponse du panneau — un champ renommé, un `null`
inséré — et **les 11 889 chaînes étaient perdues**, pas seulement l'entrée fautive.

### ⚠️ La correction évidente était une régression — spécification révisée en cours de route

La première version rendait une liste vide pour *tout* document illisible. Vérification
faite dans `IptvRepository.fetchChannels` avant de la garder :

```kotlin
val result = try { … apiClient.parseChannels(catsBody, streamsBody, c) }
             catch (e: Exception) { cacheRepo.getChannels(allowStale = true)… }
channelsCache = result
cacheRepo.saveChannels(result)      // ← aucun garde-fou sur result vide
```

Le repli hors-ligne de P8 vit **dans le `catch`**. Avaler l'exception aurait donc :

1. empêché ce repli de se déclencher ;
2. **écrasé le catalogue en cache par une liste vide**, figée 24 h par le TTL de P8.

Transformer une panne bruyante en panne silencieuse et destructrice. C'est la leçon de
§5 P4 rencontrée une seconde fois — la spécification a été corrigée, pas contournée, et
les quatre tests concernés réécrits en `assertThrows`.

### Asymétrie retenue

| Niveau | Comportement | Raison |
|---|---|---|
| document de flux illisible | **lève** | c'est une panne : le `catch` appelant doit servir le cache périmé |
| document de **catégories** illisible | dégrade | un libellé de groupe perdu ne vaut pas le catalogue — les chaînes retombent sur « Others » |
| **entrée isolée** corrompue | écartée | une ligne fautive ne doit pas coûter les autres |

Deux primitives portent cette règle : `catsArrayOrEmpty()` (réservée aux catégories) et
`JSONArray.objects()` (saut d'entrée). Appliquées à `parseChannels`, `parseMovies`,
`parseSeries`, `buildCatMap` et `parseSeriesDetail` — où une **saison** au format
inattendu est désormais ignorée sans coûter les 36 autres.

### Portée honnête de ce qui est prouvé

Prouvé : les 14 tests, sur données fabriquées. **Non observé sur appareil** — provoquer
une réponse malformée exigerait un panneau complice ou un proxy interposé. Le défaut
était certain (lecture du code + rouge des tests), le correctif l'est aussi ; c'est le
*déclenchement en conditions réelles* qui n'est pas mesuré.

Constat annexe, **non corrigé** : `fetchChannels` met en cache un résultat vide sans
sourciller. Un panneau qui répond légitimement `[]` le temps d'un incident fige donc un
catalogue vide pour 24 h. Distinguer « vraiment vide » de « incident » demande une
information que le code n'a pas aujourd'hui — même famille que B2, et même piège :
ne pas écrire à l'aveugle.

**État : 120 tests, 0 échec** (116 + 4 sur les parseurs de détail).


---

## 28. EPG sur TV — la logique était dupliquée, et les deux copies avaient divergé *(2026-08-20)*

Demande de `raf.md` : « il manque l'EPG comme sur mobile, c'est une carte en dehors du
lecteur ». La TV avait bien un `TvEpgBar` — mais **faux**, et depuis toujours.

### Le vrai défaut : P10 et P11 n'ont jamais été portés sur TV

| Ligne de `TvPlayerScreen` | Défaut | Corrigé sur mobile en |
|---|---|---|
| `tvParseEpgTime(start)` | ignore `startMs`/`endMs` du modèle, reparse la chaîne en UTC | P11b |
| `current.start.take(16).takeLast(5)` | affiche l'horaire **brut du fournisseur** | P11a |
| `val now = System.currentTimeMillis()` | lu une fois pendant la composition, horloge figée | P10b |

Cause racine : la décision « quel programme est à l'antenne, et où il en est » était
**écrite deux fois**, dans `PlayerScreen` et dans `TvPlayerScreen`. C'est exactement ce
qu'interdit la règle §2.1 — et la duplication a produit ce qu'elle produit toujours :
les correctifs n'ont été appliqués qu'à une copie.

### Preuve différentielle avant correction

Plutôt que d'affirmer le défaut, l'algorithme TV a été porté **verbatim** dans `core` et
confronté au scénario mesuré en P11 (panneau en UTC+1, appareil à Paris). Rouge obtenu :

```
expected:<0.62222224> but was:<0.0>       ← barre d'avancement figée à zéro
expected:<[20]:00>    but was:<[19]:00>   ← le décalage d'une heure
l'avancement doit croitre (0.0 -> 0.0)
```

À noter : le test de **sélection** du programme, lui, passe — par l'accident déjà décrit
en P11, le repli `programs.firstOrNull()` donnant le bon programme par chance puisque
l'API renvoie les diffusions à partir de maintenant. C'est ce qui rendait le défaut
invisible à l'œil : le bon titre s'affichait, avec un mauvais horaire et une barre vide.

### Correction — une seule logique, dans `core`

`core/epg/EpgTimeline.kt` : `startMs`/`endMs` (horodatage Unix d'abord, chaîne en repli),
`snapshot(programs, now)` (courant, suivant, avancement) et `formatTime` (fuseau de
l'appareil, injectable pour les tests). **7 tests.**

Les deux UI la consomment désormais ; les helpers privés du mobile ont été supprimés.
Le portage mobile est fidèle au caractère près — mêmes replis, même formatage — mais
**n'a pas été réobservé sur téléphone** (Pixel 7 non connecté sur cette session) : il est
couvert par la compilation et les tests, pas par la mesure.

### ✅ Vérifié sur émulateur TV, catalogue réel de l'utilisateur

TF1 FHD, 11 889 chaînes chargées (VPN actif). Heure de l'appareil **09:06**.

| Observation | Mesure |
|---|---|
| Carte affichée | `LIVE · 06:55 – 10:00 · Bonjour ! La Matinale TF1 · ▶ TFou` |
| Programme courant | correct — 09:06 tombe bien dans 06:55–10:00 |
| Barre d'avancement | **72,0 %** mesurés au pixel, contre **70,8 %** attendus |
| Horloge | l'incrustation de TF1 dans le flux affiche **09:05** |

Le dernier point est le contrôle le plus solide : c'est **la chaîne elle-même** qui
atteste l'heure, indépendamment de l'appareil et de mon calcul. Avant correction, la
carte aurait affiché l'horaire brut du panneau, décalé.

La carte reprend la forme du mobile (badge `LIVE`, plage horaire, titre, programme
suivant), en bas à gauche, et suit `overlayVisible` comme le reste des contrôles.

Défaut corrigé au passage : « Suivant - » était **codé en dur en français** sur TV. Il
disparaît au profit de l'icône du mobile, ce qui supprime la chaîne plutôt que d'en
traduire une de plus. Parité des ressources maintenue : app-tv **100/100**, app-mobile
**110/110**.

**État : 127 tests, 0 échec** (120 + 7 `EpgTimelineTest`).

⚠️ `app-tv` reste en **versionCode 8** : rien de ceci n'est distribué.


---

## 29. VF / VOSTFR — la « première piste qui ne marche jamais » est une piste forcée *(2026-08-20)*

Demande de `raf.md`, périmètre précisé par l'utilisateur : **films et séries, pas le
direct**. La précision associée — « la première piste de sous-titres ne fonctionne quasi
jamais, prendre la deuxième si elle existe » — n'était pas une superstition, et sa cause
est mesurable.

### Mesurer avant de concevoir

Le catalogue réel a été sondé à `ffprobe` (le VPN rend le fournisseur joignable) plutôt
que de supposer ce que contiennent les fichiers :

| Film | Audio | Sous-titres |
|---|---|---|
| Monster Summer | eng, **fre** | fre « Complets » |
| Doctor Strange (MULTI) | eng, **fre**, fre (FR-CA) | eng forcé, eng, **fre forcé**, fre |
| Avatar **(VOSTFR)** | eng seul | eng « FULL », fre « FULL » |
| Robin des Bois (2018) | fre ×2, eng ×2 | **fre « Forced »**, fre « French », fre « French SDH » |

Deux enseignements que l'on n'aurait pas devinés :

1. **La cause du constat de `raf.md`.** La première piste française est une piste
   **forcée** — elle ne porte que les passages en langue étrangère, pas les dialogues.
   Elle paraît donc « ne rien afficher ». Ce n'est pas un bug du lecteur.
2. **605 titres portent « (VOSTFR) » dans leur nom** : le fournisseur livre aussi des
   versions comme des entrées de catalogue **distinctes**. Une entrée VOSTFR n'a pas
   d'audio français — le bouton doit donc ne proposer que ce qui existe réellement.

### ⚠️ Le drapeau du conteneur ne suffit pas — corrigé en test-first

Première implémentation : ne se fier qu'à `SELECTION_FLAG_FORCED`. Le relevé de
**Robin des Bois** l'a démentie — ses trois pistes portent `forced=0`, la piste forcée
n'étant reconnaissable qu'à son **titre** :

```
lang=fre titre='Forced'      forced=0     ← le drapeau n'est pas posé
lang=fre titre='French'      forced=0
lang=fre titre='French SDH'  forced=0
```

Test écrit avec ces données, **rouge constaté** (`expected:<s2> but was:<s1>` — la piste
forcée était bien choisie, c'est-à-dire le symptôme signalé), puis correction :
`isForcedTrack()` retient le drapeau **ou** le titre, en **mot entier** (`\bforc(ed|és|…)\b`)
pour ne pas écarter à tort un « Reinforced Edition ».

➡️ **On corrige la cause, pas le symptôme.** « Prendre la deuxième piste » aurait marché
sur ces fichiers-là et échoué dès que l'ordre change ; le critère « non forcée » tient
quel que soit l'ordre.

### Architecture

`core/player/VersionPolicy.kt` — logique pure, **16 tests**, dont les cas ci-dessus repris
tels quels. `PlayerService` expose `availableVersions` / `selectedVersion` et applique le
choix ; les deux UI ne font que rendre un bouton. La sélection de pistes était déjà
dupliquée entre les deux `PlayerScreen`, ce qui avait produit la divergence de §28 : elle
ne l'est plus.

`selectedVersion` est **déduit des pistes réellement jouées**, jamais d'un état parallèle :
le bouton ne peut donc pas annoncer une version que le lecteur ne joue pas.

### Décision de conception

Le bouton n'apparaît que si les **deux** versions existent. Avec une seule il n'y a rien à
choisir, et sur TV un focalisable de plus coûte un appui à la télécommande sans rien
apporter (leçon de §25). ⚠️ Discutable : un contenu n'ayant que des sous-titres français
pourrait mériter un bouton unique « VOSTFR ». À trancher si le besoin apparaît.

### ⚠️ Défaut préexistant trouvé au passage : l'overlay TV se masquait en pleine navigation

Mes premières mesures montraient un focus qui s'échappait de VF vers la racine. J'ai
d'abord cru à un défaut de mon composant et ajouté un `focusGroup()` — **qui a aggravé les
choses**. La vraie cause est ailleurs :

```kotlin
LaunchedEffect(overlayVisible, showSpeedDialog, showTrackDialog) {
    if (overlayVisible && …) { delay(5_000); overlayVisible = false }
}
```

Le minuteur n'est pas réarmé par les appuis — `lastInteractionMs` était **écrit et lu par
personne**. L'overlay se masquait donc 5 s après son apparition quoi qu'on fasse, et le
focus retombait à la racine au milieu d'un déplacement. Cela touchait **tous** les
contrôles, pas seulement le nouveau bouton.

**Correction** : `lastInteractionMs` entre dans la clé de l'effet, et tout appui non
consommé le rafraîchit. `focusGroup()` a été **retiré** — il corrigeait un problème qui
n'existait pas (même erreur qu'au §24 : compter avant de conclure).

### ✅ Vérifié sur émulateur TV, catalogue réel

| Observation | Résultat |
|---|---|
| Bouton présent sur un film à deux versions | ✅ `Monster Summer · 1× · VF · VOSTFR` |
| Navigation D-pad | ✅ lecture → VF → (droite) → VOSTFR |
| Bascule VF | ✅ fond VF `(164,99,229)` violet, VOSTFR sombre |
| Bascule VOSTFR | ✅ l'inverse, mesuré au pixel |
| **Pistes lues par ExoPlayer** (Robin des Bois) | ✅ `T fr/Forced/forced=false`, `T fr/French`, `T fr/French SDH` — **le drapeau n'est pas posé**, ce qui confirme la nécessité du critère par titre |
| **Choix appliqué** | ✅ `CHOIX VOSTFR -> audio=TrueHD Atmos 7.1 sub=French` — audio **anglais**, sous-titre **« French »** et non « Forced » |
| Choix VF | ✅ `CHOIX VF -> audio=TrueHD 7.1 sub=null` (français, sous-titres coupés) |
| **Direct** | ✅ overlay `LIVE · AFRICANS CHANNELS · 1×` — **aucun bouton**, périmètre respecté |

### ✅ Vérifié sur téléphone (Pixel 7, variante debug, catalogue réel)

| Observation | Résultat |
|---|---|
| Bouton présent sur « Robin des Bois (2018) » | ✅ `Robin des Bois · 1× · 00:44 · 1:56:08 · VF · VOSTFR` |
| **État initial** | ✅ **VF** allumé — le téléphone est en français, ExoPlayer a choisi la piste française et `detect()` le rapporte |
| Bascule VOSTFR | ✅ fond VOSTFR `(147,82,214)` violet, VF éteint |
| Retour VF | ✅ l'inverse, mesuré au pixel |
| Contenu à version unique | ✅ bouton **absent** (`A null/null`, `T fr/French` : pas d'audio français, donc pas de choix) |

L'état initial est une confirmation utile en soi : personne n'a appuyé sur VF, la pastille
s'allume parce que le lecteur joue effectivement la piste française. C'est la preuve que
`selectedVersion` reflète le lecteur et non un état parallèle.

⚠️ **Le téléphone a été reconfiguré** : la variante `.debug` pointait sur une playlist M3U
publique sans VOD, il a fallu la connecter au compte Xtream de l'utilisateur pour disposer
de films. L'ancienne configuration est perdue (identifiants en `EncryptedSharedPreferences`,
illisibles de l'extérieur). L'application **de production est intacte**.

### Note de parité relevée au passage

Le mobile réarme correctement son minuteur d'overlay — `LaunchedEffect(lastInteractionMs)`
— alors que la TV ne le faisait pas. La correction TV décrite plus haut aligne donc la TV
sur le mobile, elle n'invente pas un comportement.

**État : 143 tests, 0 échec** (127 + 16 `VersionPolicyTest`).


---

## 30. Le focus qui s'échappait vers le rail — dernier des défauts de focus *(2026-08-20)*

Dernier point ouvert de §16/§23 : arrivé au bout d'une liste, un appui de plus vers le bas
envoyait le focus dans le rail, qui se dépliait « tout seul ».

### Reproduit d'abord, et le cas n'était pas celui qu'on croyait

§13 attribuait le défaut à « la dernière chaîne d'un genre ». **Faux** : mesuré sur
ALWAN CHANNELS (24 chaînes), le focus reste sagement sur la dernière ligne. Idem sur le
panneau des genres (75 entrées) et sur la grille Films.

Le défaut n'apparaît que sur une liste **plus courte que l'écran**. Reproduit sur une
recherche à un seul résultat :

```
bas  -> ['☆']         (l'unique résultat)
bas  -> ['Movies']    ← le rail, déplié (largeur 424 px = 240 dp)
```

Faute de candidat sous le dernier élément, Compose TV élargit sa recherche et retient le
focalisable le plus proche — le rail, toujours présent à gauche. Quand la liste remplit
l'écran, il n'y a pas d'espace vide en dessous et le problème ne se pose pas.

➡️ Compter et reproduire avant de corriger : la description d'origine désignait un cas qui
fonctionne parfaitement.

### ⚠️ Première correction : bonne intention, mauvais endroit

Interdire la **sortie verticale du contenu** (`focusProperties { exit = … }` sur le
conteneur de contenu) paraissait naturel. Elle a cassé la remontée d'une liste vers la
barre de recherche — un déplacement pourtant **interne** au contenu. Détecté par un test
de non-régression joué avant de conclure, pas après.

### Correction retenue — côté rail

Le garde-fou est posé sur le rail : **on n'y entre pas verticalement**.

```kotlin
.focusGroup()
.focusProperties {
    enter = { direction ->
        when (direction) {
            FocusDirection.Up, FocusDirection.Down -> FocusRequester.Cancel
            else -> FocusRequester.Default
        }
    }
}
```

Ne touche à aucun déplacement interne au contenu, et **Gauche reste ouvert** — le rail
n'est donc jamais inatteignable. C'est la précaution annoncée en §23 : piéger le focus
serait un défaut pire que celui corrigé.

### Vérifié au D-pad

| Contrôle | Résultat |
|---|---|
| Bas ×3 au bout d'une liste d'un élément | ✅ focus **immobile** sur le résultat |
| Liste → haut → barre de recherche | ✅ non-régression, la remontée fonctionne |
| Contenu → gauche → rail | ✅ le rail reste atteignable |
| Navigation verticale **dans** le rail | ✅ Live TV → Movies → Series |
| Rail → droite → contenu | ✅ |
| Grille Films, 12 appuis vers le bas | ✅ reste dans la grille |

`enter` étant encore `@ExperimentalComposeUiApi` en Compose 1.7 (BOM 2024.09), l'opt-in est
déclaré sur `TvMainScreen`.

**État : 143 tests, 0 échec.**


---

## 31. Secret de signature — le diagnostic était plus grave que la réalité *(2026-08-20)*

Point ouvert depuis le premier audit : « `keystore.properties` est suivi par git avec ses
mots de passe en clair — le sortir du suivi **et faire tourner la clé** ».

### Ce que la mesure a montré

| Question | Réponse |
|---|---|
| `keystore.properties` suivi ? | ✅ oui, **un seul commit** (`6b9c219b9`), présent sur `origin/iptv` |
| `upload-keystore.jks` suivi ? | ❌ **jamais committé**, sur aucune branche, à aucun moment |

➡️ **Le mot de passe était exposé, la clé ne l'a jamais été.** Un mot de passe sans le
magasin ne permet de signer rien du tout. La remédiation n'était donc pas un *reset de
clé d'upload* — démarche lourde, qui passe par la Play Console et interrompt la
publication — mais un simple **changement de mot de passe**, qui laisse le certificat
intact.

### Le magasin est en PKCS12, ce qui simplifie l'opération

```
keytool error: -keypasswd commands not supported if -storetype is PKCS12
```

Ce n'est pas un échec : en PKCS12 le mot de passe de la clé **est** celui du magasin.
`-storepasswd` change donc les deux d'un coup.

### Vérifié — le certificat est inchangé, la publication n'est pas affectée

| Contrôle | Avant | Après |
|---|---|---|
| SHA1 du certificat | `F6:0C:72:9C:FF:6D:…:62:0F` | **identique** |
| Validité | jusqu'en 2053 | identique |
| `:app-mobile:bundleRelease` | ✅ | ✅ **signé par le même certificat** (`CN=Hichem JOUINI`, SHA1 identique) |

C'est le point décisif : Play App Signing reconnaît le certificat d'upload, pas le mot de
passe qui protège le fichier. **Aucune action Play Console n'est requise.**

### Ce qui a été sorti du suivi

| Chemin | Fichiers | Pourquoi |
|---|---|---|
| `native/keystore.properties` | 1 | secret |
| `native/local.properties` | 1 | chemin de SDK propre à chaque machine (§3) |
| `native/.gradle/`, `native/*/build/`, `native/.kotlin/` | **3121** | 9,6 Mo de verrous et caches binaires |

Le compte de 3121 corrige le « 279 » noté en §7 : 279 était le nombre de fichiers
*modifiés* par une exécution de Gradle, pas le nombre de fichiers suivis.

**Vérifié** : après un `./gradlew` complet, `git status` ne rapporte plus que le
`.gitignore` modifié. Auparavant, chaque build noyait les vraies modifications.

### ⏳ Reste à trancher : la réécriture d'historique

L'ancien mot de passe subsiste dans le commit `6b9c219b9` sur `origin/iptv`. Il est
désormais **sans valeur** — il n'ouvre plus le magasin, et le magasin n'a jamais été
publié.

Le purger exigerait `git filter-repo` **et un `push --force`** sur un dépôt partagé, ce
qui réécrit l'historique de tous ceux qui l'ont cloné. Le gain est cosmétique, le coût
est collectif : à décider par l'équipe, pas par nécessité de sécurité.

⚠️ **Risque réel restant, sans rapport avec git** : `upload-keystore.jks` n'existe **que
sur la machine « rigolo »**. Le perdre rendrait toute mise à jour de l'application
impossible sans un reset de clé auprès de Google. Une sauvegarde hors machine est
autrement plus urgente que la réécriture d'historique.

### ⚠️ Obstacle trouvé au passage : `:app-tv:assembleRelease` échoue

Sans rapport avec la signature — `:app-tv:packageRelease` réussit et l'APK produit est
bien signé par le bon certificat (SHA1 `f60c729c…620f`, vérifié à `apksigner`). C'est
l'étape **suivante** qui tombe :

```
> Task :app-tv:lintVitalAnalyzeRelease FAILED
  Found class org.jetbrains.kotlin.analysis.api.resolution.KaCallableMemberCall,
  but interface was expected
  The crash seems to involve the detector `NonNullableMutableLiveDataDetector`
```

C'est un **bug de l'outil lint** (incompatibilité entre le lint de `lifecycle` et l'API
d'analyse Kotlin du toolchain), pas un défaut du code.

✅ **Levé le 2026-08-20** : `lint { disable += "NullSafeMutableLiveData" }` dans
`app-tv/build.gradle.kts`. `:app-tv:assembleRelease` réussit désormais, et l'app TV est de
nouveau publiable. À réactiver le jour où les versions s'alignent.

`:app-mobile:bundleRelease` n'est pas concerné et fonctionne.

**Sauvegardes prises avant l'opération** (ancien magasin + anciennes propriétés) dans le
scratchpad de session — donc temporaires. À ne pas confondre avec une vraie sauvegarde.


---

## 32. B2 — retirer un droit sans déconnecter les abonnés légitimes *(2026-08-20)*

`syncEntitlements()` n'ajoutait que des droits :

```kotlin
val (_, purchases) = billingClient.queryPurchasesSuspend(params)   // BillingResult jeté
purchases.forEach { if (handlePurchase(it)) restored++ }           // rien si la liste est vide
```

Un achat remboursé, révoqué ou rétrofacturé disparaissait de la réponse de Play sans que
`setPro()` soit jamais annulé. `is_pro_user` restait vrai **indéfiniment**, y compris dans
les `EncryptedSharedPreferences` — couche anti-fraude qui jouait alors contre l'éditeur.

### La décision est pure, donc testée

`core/data/EntitlementReconciler.kt` : `decide(inapp, subs, playIsInstaller)` →
`Grant` / `Revoke` / `Unknown`. **11 tests**, dont 7 rouges constatés d'abord.

Le `BillingResult` cesse d'être jeté : c'est lui qui distingue « Play dit que tu ne
possèdes rien » d'une panne. Asymétrie assumée — **accorder** est sans risque et se fait
dès qu'un droit est vu ; **retirer** exige que les deux catalogues aient répondu.

### ⚠️ La correction a introduit exactement le défaut qu'elle devait éviter

Vérification sur appareil, état premium injecté : la première version **a mis
l'utilisateur dehors**, écran d'achat à la place du bandeau.

Cause : sur la variante `.debug`, l'`applicationId` est suffixé, donc Play répond
**OK avec une liste vide** — il ne connaît pas ce paquet. Le réconciliateur en concluait
« tu ne possèdes rien » et révoquait. Techniquement conforme à la spécification, faux dans
les faits.

C'est la leçon déjà consignée en §9 — « Play Billing ne pouvait rien retourner d'autre
qu'un catalogue vide » — qui n'avait jamais été encodée. Elle l'est désormais :
**Play ne fait autorité que sur ce qu'il a lui-même installé** (`installingPackageName ==
com.android.vending`, avec repli `getInstallerPackageName` sous Android 11).

Preuve différentielle, même appareil et même état injecté :

| Build | Résultat |
|---|---|
| sans la condition d'installeur | écran d'achat — accès **retiré à tort** |
| avec la condition | **`PREMIUM · 30 jours restants`** — accès conservé |

### `trial_start_date` est délibérément conservé

`revokeEntitlements()` efface `is_pro_user` et `subscription_expiry_date`, **pas** la date
de début d'essai. L'effacer réattribuerait trois jours gratuits à chaque révocation : il
suffirait de se faire rembourser pour repartir en essai. Même piège qu'en B1.4, où
`pm clear` rendait l'accès par l'essai neuf et non par la synchronisation.

### Portée honnête

**Prouvé** : la décision (11 tests), et le fait que la correction ne déconnecte pas un
utilisateur premium quand Play ne fait pas autorité (mesuré sur appareil).

### ✅ Révocation prouvée sur build de Play — 2026-08-20

Conditions contrôlées avant toute observation : versionCode **14**, `installerPackageName`
**`com.android.vending`**.

| Étape | Bandeau | ACTIVER | Verdict |
|---|---|---|---|
| Achat `purple_lifetime_999` à 11:33, puis relance complète | absent | absent | `isPro == true` |
| Remboursement **avec suppression du droit**, relance à 15:01 | **« Essai gratuit : 2 jours restants. »** | **présent** | **accès retiré** |

Aucune action de l'utilisateur entre les deux — pas de « Restaurer ». C'est
`syncEntitlements()` au démarrage qui a constaté que Play ne reconnaît plus l'achat et a
retiré le droit. **L'ancien code ne l'aurait jamais fait** : sa boucle était purement
additive.

⚠️ **Le signal discriminant est « 2 jours », pas « accès retiré ».** Si
`revokeEntitlements()` avait effacé `trial_start_date`, `initTrial()` aurait réattribué un
essai **neuf de 3 jours** et le bandeau aurait affiché **3**. Le décompte a simplement
vieilli depuis la veille : l'essai n'a pas été rendu. Même famille de raisonnement qu'en
B1.4, où « l'accès revient » était un test qui ne pouvait pas échouer.

Note de méthode : aucun `pm clear` n'a été fait sur cette application. Elle porte les
identifiants Xtream dans des `EncryptedSharedPreferences` que `pm clear` détruirait
définitivement (§9) ; le bandeau suffisait comme instrument.

**État : 154 tests, 0 échec.**


---

## 33. Quatre défauts de la fiche série, signalés sur l'écran réel *(2026-08-20)*

Remarques de l'utilisateur sur la fiche mobile de « A Shop for Killers ». Chacune a été
confirmée dans le code **et** mesurée à l'écran.

### 1. Le nom de la série répété sur chaque épisode

`E1 · A Shop for Killers Épisode 1`, sur toute la saison. La TV avait déjà ce nettoyage
(§21) ; le mobile ne l'a jamais eu. Encore la duplication d'une décision entre les deux
UI — extrait cette fois dans `core/model/EpisodeTitle.kt`, **6 tests**.

Vérifié à l'écran : `E1 · Épisode 1`.

### 2. L'image de la fiche trop zoomée — la hauteur n'y était pour rien

L'affiche est en **2:3**. L'étirer sur toute la largeur d'un bandeau demande un
agrandissement d'environ **1,8×**, quelle que soit la hauteur du bandeau : c'est la
largeur qui commande. Augmenter la hauteur n'aurait rien changé.

La vraie réponse est venue du catalogue : le fournisseur expose `backdrop_path`, une image
**paysage** (TMDB w1280), présente sur **6 337 des 8 467 séries**. Utilisée en bandeau,
elle ne demande aucun agrandissement.

`SeriesDetail` et `MovieDetail` portent désormais `backdrop`, alimenté par un lecteur
tolérant (le champ est un tableau chez ce fournisseur, une chaîne chez d'autres). Le fondu
est conservé.

⚠️ Le cache de fiches a un TTL de 24 h : le nouveau champ n'apparaît qu'après expiration
ou purge de `cache/iptv_cache`.

### 3. Reprise de lecture — la position était écrite sous le mauvais épisode

`currentMediaId` était fixé au lancement et **jamais mis à jour** quand la liste de lecture
avançait. Le code le signalait lui-même :

```kotlin
// We should update currentUrl/title here too if we want perfect history for auto-advance
```

Conséquence : dès que l'épisode 2 s'enchaînait, sa position était enregistrée sous
l'identifiant de l'**épisode 1** — marqué à tort — pendant que le 2 n'enregistrait rien.

`playWithEpisodes` reçoit maintenant le `seriesId` et suit l'index de la liste ;
l'identifiant de progression, jusqu'ici réécrit à la main à **huit endroits**, vit dans
`EpisodeTitle.progressId`. Un épisode quitté par avance automatique est explicitement
marqué comme vu, plutôt que d'espérer que le minuteur de 10 s ait capté une position
proche de la fin.

Vérifié : après 40 s sur l'épisode 1, une barre de progression apparaît sous sa ligne.

**Marquage « vu » retravaillé** : le titre était **barré**, ce qui se lit « annulé » et non
« déjà regardé ». Remplacé par une pastille de validation sur la vignette, sur mobile
**et** sur TV.

### 4. « Annuler la saison » pour un seul épisode

`inProgressIds` retient tout épisode en cours : télécharger un seul épisode faisait
apparaître « Annuler la saison ». Le libellé devient un pluriel Android — « Annuler le
téléchargement » / « Annuler les N téléchargements ».

Vérifié dans les deux formes, à un puis deux épisodes.

### 5. Cast — le vrai défaut était le format, pas la télécommande

Symptôme rapporté : « aucun bouton ne répond et le contenu ne se diffuse pas ». Les
boutons ne répondaient pas parce qu'**il n'y avait rien à piloter** : le média n'arrivait
jamais sur le récepteur.

Deux hypothèses concurrentes — le Wi-Fi qui bloque l'IP du fournisseur (§8), ou le format
du conteneur. Mesure du catalogue avant d'aller plus loin :

| Conteneur | Films | Part |
|---|---|---|
| **mkv** | 20 104 | **76 %** |
| mp4 | 4 997 | 19 % |
| avi | 1 161 | 4 % |

**Google Cast ne lit pas le Matroska** (récepteur par défaut : MP4, WebM, HLS, DASH). Les
trois films essayés étaient tous des `.mkv`.

➡️ **Tranché par l'utilisateur** : Toy Story 5, en `.mp4`, se diffuse parfaitement,
télécommande comprise. La cause est donc le **conteneur**, pas le réseau — ce qui a évité
d'installer un VPN sur l'appareil de cast pour rien.

Ce qui reste faux dans `CastRepository`, et n'a **pas** été corrigé :

```kotlin
else -> "video/mp2t"                            // annoncé pour un .mkv comme pour un .ts
.setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)  // même pour une chaîne live
```

Un `.mkv` est déclaré au récepteur comme du MPEG-TS, et une chaîne live comme un flux
bufferisé. Corriger ces deux points ne rendra pas le MKV lisible pour autant — seul un
transcodage ou une source HLS le permettrait.

### 5 bis. Télécommande de cast — trois défauts, corrigés et vérifiés

| Défaut | Cause | État |
|---|---|---|
| Impossible de s'en débarrasser | `expanded` démarrait à `true` **et** un `LaunchedEffect(mediaTitle)` la redépliait à chaque changement de titre | repliée par défaut, plus aucune ré-expansion d'office |
| Elle recouvrait la barre d'onglets | rendue globalement en `BottomCenter`, et **`MiniBar` déclarait un `modifier` sans jamais l'utiliser** — le décalage passé par l'appelant était perdu | décalage de 60 dp sur l'écran principal, `modifier` enfin consommé |
| Elle survivait à l'arrêt de la lecture | `stop()` arrête le média mais garde la session ; `isConnected` restait vrai | l'arrêt met fin à la session |

Le bouton de pistes a été **supprimé** : son `onClick` était vide, et il ne pouvait rien
faire — Google Cast ne sait changer de piste audio ou de sous-titres que sur un flux
adaptatif (HLS/DASH), alors que le fournisseur sert des fichiers progressifs. Le récepteur
joue la piste par défaut du conteneur, souvent l'anglais, sans alternative. C'est la
**cinquième** occurrence dans ce projet d'un contrôle déclaré mais jamais branché, après
`onPurchase` (§UX-2), `onFav` (§13), `TvToggleOption` (§19) et ce `modifier`.

Vérifié sur appareil : la télécommande ne s'ouvre plus d'office, la barre repliée se place
**au-dessus** des onglets (2064–2211 contre 2257–2337), les cinq onglets répondent, et
l'arrêt fait disparaître la barre (`Cast Déconnecté`).

Appareil de test : **« Télé »**. La découverte prend une dizaine de secondes avant que
l'appareil n'apparaisse dans la liste.

Libellé corrigé au passage : `"Ma liste"` était codé en dur dans la barre d'onglets.

**État : 160 tests, 0 échec.**


---

## 34. Cast — dire ce qui ne passera pas, et suivre ce qui passe *(2026-08-20)*

### Avertir plutôt que laisser deviner

`core/player/CastFormats.kt` — logique pure, **10 tests**. Le récepteur par défaut lit
`mp4`, `m4v`, `webm`, `m3u8`, `mpd` ; il ne lit ni `mkv`, ni `avi`, ni le MPEG-TS nu.

Trois usages :

1. **Type MIME correct.** L'ancien code annonçait `video/mp2t` pour tout ce qui n'était ni
   HLS ni DASH — un `.mkv` était donc présenté comme du MPEG-TS.
2. **Refus explicite.** Une diffusion impossible ouvre un message — « Ce contenu est en
   MKV, un format que le Chromecast ne sait pas lire » — au lieu de laisser l'utilisateur
   devant une télécommande inerte.
3. **Pastille sur les affiches**, *pendant un cast uniquement* : hors session ce serait du
   bruit sur chaque vignette. Vérifié au pixel — violet vif `(179,136,245)` sur un `.mp4`,
   gris terne `(107,106,119)` sur un `.mkv`.

⚠️ La pastille ne couvre que les **films** : `SeriesItem` ne porte pas d'URL, le format
d'un épisode n'est connu qu'après ouverture de la fiche.

### « Reprendre la lecture » ignorait tout ce qui était casté

Au démarrage d'un cast, `PlayerScreen` met le lecteur local en pause et se ferme — or
c'est lui qui enregistrait la progression, depuis ce lecteur désormais arrêté. Rien n'était
donc consigné : un film regardé sur le Chromecast n'apparaissait jamais dans la reprise.

`CastRepository` enregistre maintenant toutes les 10 s depuis la position **du récepteur**,
plus une dernière fois à la fin de session — sans quoi arrêter le cast juste après avoir
avancé effaçait jusqu'à 10 s. `setPendingMedia` transporte désormais `mediaId` et `type`,
sans lesquels `updateRecentList` ne retient rien.

**Vérifié dans les données** : après 45 s de cast, l'entrée est en tête de
`recent_items_json` avec `progress: 8928` et `duration: 2545376`.

### Confirmation rétroactive du défaut d'enchaînement (§33.3)

Dans ces mêmes données, deux épisodes de *The Walking Dead* ont leurs URL **croisées** :
`2624_430469` pointe vers `430468.mkv`, et l'inverse. C'est la signature exacte du
`currentMediaId` figé — l'identifiant restait sur l'épisode précédent pendant que la liste
avançait. Le défaut corrigé au §33.3 avait donc bien laissé des traces réelles.

### Décalage de la barre repliée — deuxième passe

Le premier correctif laissait la barre mordre légèrement les onglets : la barre d'onglets
porte `navigationBarsPadding()` **en plus** de ses 60 dp, et je n'avais compté que les
60 dp. Mesuré après correction : barre de cast 2001–2148, onglets 2257–2337.

**État : 170 tests, 0 échec.**


---

## 35. Retour depuis une fiche, et synopsis illisible *(2026-08-20)*

### La recherche était perdue au retour

Ouvrir un résultat détruit la composition de l'écran de liste. L'état de recherche vivait
dans un `remember` — perdu — au lieu d'un `rememberSaveable`, que Navigation Compose
restaure pour une destination encore dans la pile.

```kotlin
var query by remember { mutableStateOf("") }   // avant
```

Le symptôme décrit : chercher « One Piece », ouvrir un résultat, revenir… et retomber sur
la liste complète.

Corrigé sur les **trois** écrans de recherche (Direct TV, Films, Séries), et pour deux
états de la même famille, perdus exactement pareil :

| État | Écran |
|---|---|
| `query` | HomeScreen, MoviesScreen, SeriesScreen |
| `selectedGenre` | MainScreen |
| `filter` | MyListScreen |

`filter` est un enum : l'**ordinal** est sauvegardé, le sauveur par défaut ne couvrant que
les types supportés par `Bundle`.

⚠️ Les états volontairement **non** sauvegardés restent tels quels — `drawerOpen`,
`settingsOpen`, `layoutPickerOpen` : une boîte de dialogue ne doit pas se rouvrir toute
seule au retour.

**Vérifié sur appareil** : recherche « One Piece », ouverture d'un résultat, retour — la
requête et ses deux résultats sont toujours là.

### Le synopsis était coupé sans recours

Fiche série uniquement (celle du film était déjà complète) : `maxLines = 3` avec ellipse,
et aucun moyen de lire la suite.

**Dépliable plutôt que défilant** : un défilement imbriqué dans une page déjà défilante se
manipule mal au doigt. Le lien « Voir plus » n'apparaît que si le texte déborde
**réellement** — mesuré via `onTextLayout().hasVisualOverflow`, et non deviné d'après la
longueur de la chaîne.

**Vérifié sur appareil** : 546 caractères affichés après dépliage, lien passé à
« Voir moins ».

**État : 170 tests, 0 échec.** Parité : app-tv 100/100, app-mobile 113/113.


---

## 36. Régression du cast — un fait décisif que je n'avais pas vérifié *(2026-08-20)*

Le blocage introduit au §34 a empêché de diffuser **Toy Story 5**, qui fonctionnait avant.

### L'erreur de raisonnement

Chaîne suivie :

1. Google documente le récepteur **par défaut** comme lisant mp4/webm/HLS/DASH, pas le MKV.
2. Les trois films en échec étaient des `.mkv`.
3. « Toy Story 5 est un `.mp4` et il passe » ⇒ le conteneur est la cause.

**L'étape 3 était fausse.** Toy Story 5 est un **`.mkv`** (`stream_id` 479268). Je l'ai
affirmé sans le vérifier, et le fait s'est glissé dans un raisonnement qui, sinon, était
correct — d'où sa solidité apparente.

⚠️ La preuve était **dans les données que j'avais lues** : le `recent_items_json` affichait
`"url":".../479268.mkv","title":"Toy Story 5"`. Je suis passé dessus parce qu'elle
confirmait l'histoire déjà en tête.

**Conséquence** : un garde-fou qui refusait 76 % du catalogue, dont des contenus qui
marchaient.

### Ce que la mesure établit vraiment

Un récepteur Android TV — ce qu'est l'appareil « Télé » — lit le MKV : sa pile média n'est
pas celle du récepteur Cast par défaut. **Les capacités dépendent de l'appareil**, et ne
sont pas connaissables depuis le client.

La cause des échecs initiaux reste donc **non établie**. Piste la plus plausible, non
vérifiée : le **codec** à l'intérieur du conteneur — Doctor Strange et Robin des Bois
portent tous deux du TrueHD Atmos 7.1, que beaucoup de récepteurs ne décodent pas.

### Correction

| Avant (§34) | Maintenant |
|---|---|
| refus **avant** chargement sur une liste écrite en dur | on tente toujours ; c'est l'échec **rapporté par le récepteur** (`setResultCallback`) qui déclenche le message |
| pastille « diffusable / non diffusable » sur les affiches | **supprimée** : la compatibilité n'étant pas connaissable, elle mentait |
| `video/x-matroska` pour un mkv | **repli sur `video/mp2t`**, la valeur avec laquelle un MKV se diffusait |

Le dernier point est délibéré : `video/mp2t` est faux pour du Matroska, mais c'est ce que
l'application envoyait quand ça marchait — les récepteurs reniflent le contenu réel. Le
corriger sans pouvoir le vérifier serait très exactement l'erreur du §5 P4.

### Leçon

Un raisonnement différentiel ne vaut que si **chaque** terme est mesuré. Ici un seul fait
non vérifié — le conteneur du témoin positif — a suffi à inverser la conclusion, et le
reste de la chaîne, correct, lui a donné l'apparence de la rigueur.

**État : 169 tests, 0 échec.**


---

## 37. Grille irrégulière — pas une régression, un défaut ancien *(2026-08-20)*

Signalé comme une régression : « un titre trop long modifie la taille de l'encadré ».

**Vérifié avant de corriger** : `git diff` sur `MoviesScreen.kt` depuis le début de la
session ne contient que le passage de `remember` à `rememberSaveable` et un déplacement
d'import. La ligne du titre est **identique octet pour octet** à la version d'avant :

```kotlin
Text(movie.name, …, maxLines = 2, overflow = TextOverflow.Ellipsis, …)
```

Le titre occupe donc une ou deux lignes selon sa longueur, et la carte n'a pas de hauteur
réservée : une carte à titre long est plus haute que ses voisines. Le comportement
préexistait — la pastille de cast ajoutée puis retirée n'a laissé aucune trace.

**Corrigé quand même** : `minLines = 2` sur les quatre cartes de grille (Films, Séries, et
les deux de « Ma liste »). Toutes les cartes réservent deux lignes et s'alignent.

Les titres de `HomeScreen` ne sont pas touchés : ce sont des lignes de liste avec
`weight(1f)`, où une hauteur variable ne produit pas d'irrégularité.

**État : 169 tests, 0 échec.**


---

## 38. Perte d'état — pourquoi il n'y a pas de « partie commune », et où le défaut vit vraiment *(2026-08-20)*

Question posée : « ça aurait dû être géré aussi côté TV, non ? Il n'y a pas une partie
commune entre mobile et TV ? »

### Non, et c'est structurel

`core` détient la **logique métier** — dépôts, ViewModels, décisions pures. La requête
tapée dans une barre de recherche est de l'**état d'interface**, propre à chaque écran
Compose. Il n'existe donc aucun code partagé qui aurait pu corriger les deux d'un coup.

### Et le défaut n'était pas le même des deux côtés

Mesuré, pas supposé :

| Cas | Mobile | TV |
|---|---|---|
| Ouvrir une fiche puis revenir | ❌ perdait la recherche (corrigé au §35) | ✅ **jamais eu le défaut** |
| Changer d'onglet puis revenir | ❌ perdait la recherche | ❌ perdait la recherche |

La TV échappe au premier cas pour une raison de conception : elle n'ouvre pas la fiche par
**navigation**. `selectedSeriesId` est un état *interne* à `TvSeriesScreen`, l'écran ne
quitte donc jamais la composition. Sur mobile, la fiche est une destination distincte.

### Le second cas touchait les deux, et `rememberSaveable` n'y suffisait pas

Les deux UI changent d'onglet par un `when (index)`, qui **retire** l'onglet précédent de
la composition. L'entrée d'un `rememberSaveable` est jetée avec lui : ma correction du §35
ne couvrait donc que la navigation, pas le changement d'onglet.

Il faut un `rememberSaveableStateHolder()` et un `SaveableStateProvider(index)` autour du
contenu — posé dans `MainScreen` **et** `TvMainScreen`. Les états de recherche des trois
écrans TV passent au passage en `rememberSaveable`.

**Vérifié sur les deux plateformes** : recherche « One Piece », aller-retour vers un autre
onglet, retour — les 8 résultats sont toujours là.

### Ce qui reste délibérément non conservé

`selectedSeriesId` / `selectedMovieId` : revenir sur un onglet doit montrer la liste, pas
rouvrir la fiche qu'on y avait ouverte. Et les boîtes de dialogue (`drawerOpen`,
`settingsOpen`, `layoutPickerOpen`) — se rouvrir seules serait un défaut.

**État : 169 tests, 0 échec.**

---

## 39. Le sélecteur de disposition n'agissait pas sur Films et Séries *(2026-08-20)*

Signalé comme une régression. **Vérifié d'abord** : mon diff sur `MoviesScreen.kt` et
`SeriesScreen.kt` depuis le début de la session ne contient que `rememberSaveable` sur la
requête et `minLines` sur le titre. La condition en cause est **identique octet pour
octet** à la version d'avant. Ce n'est donc pas une régression.

### L'écart, mesuré

| Écran | Condition de la vue groupée |
|---|---|
| Live (`HomeScreen`) | `layoutMode == THEMES && selectedGenre == null && query.isEmpty()` |
| Films / Séries | `selectedGenre == null && query.isEmpty()` |

Sur Films et Séries, `layoutMode` n'entrait pas dans la condition : la vue groupée par
genre s'imposait dès qu'aucun filtre n'était actif, et le mode n'était consulté que dans
la branche filtrée. D'où l'impression que le sélecteur ne fait rien — il fonctionnait,
mais seulement après une recherche ou un choix de genre.

Mesuré avant correction, avec une recherche active : Petit → cartes de 311 px, Moyen →
482 px. Sur la vue par défaut : 341 px dans les trois modes.

### Correction

Les deux écrans adoptent la condition du live. Le défaut VOD passe de `GRID_MEDIUM` à
**`THEMES`** pour que l'apparence par défaut ne change pas : c'est `THEMES` qui produit les
rangées par genre déjà en place.

**Vérifié sur appareil**, vue par défaut de Films :

| Mode | Rendu |
|---|---|
| Thèmes | 5 en-têtes de genre, cartes 341 px |
| Grille (Petit) | grille plate, cartes 311 px |
| Grille (Moyen) | grille plate, cartes 482 px |

Même résultat sur Séries (341 px → 482 px).

**État : 169 tests, 0 échec.**

---

## 40. Le rail TV happait le focus — un correctif de §23 devenu la cause *(2026-08-20)*

Signalé : « le menu latéral récupère trop souvent le focus et du coup s'ouvre pour rien ».

### La cause était mon propre correctif

```kotlin
LaunchedEffect(selectedIndex) {
    delay(250)
    runCatching { railFocus[selectedIndex].requestFocus() }
}
```

Posé au §23 pour que l'onglet focalisé soit celui qui est affiché. Deux effets non prévus :

1. un `LaunchedEffect` s'exécute **aussi à la première composition** — le rail happait donc
   le focus **au lancement**. Mesuré : rail déplié, focus sur « Live TV », sans que
   personne l'ait demandé ;
2. il le reprenait à **chaque** changement d'onglet.

Comme `LaunchedEffect(railHasFocus) { expanded = railHasFocus }` déplie le rail dès qu'il
reçoit le focus, il s'ouvrait sans cesse.

### L'invariant de §23 tient sans ce correctif

Le liseré d'onglet actif ne dépend que de `selectedIndex` (`isActive = selectedIndex ==
index`), pas du focus. Voir quel onglet est affiché ne demandait donc pas de lui donner le
focus — la moitié utile de §23 reste, l'autre part.

### Correction : c'est le **contenu** qui prend le focus

Le contenu est ce que l'utilisateur veut manipuler après avoir choisi un onglet ; le rail
reste à un appui vers la gauche. Les `FocusRequester` du rail sont supprimés, devenus
inutiles — sixième occurrence évitée du « déclaré mais jamais utilisé ».

⚠️ **Deux pièges rencontrés en chemin**, tous deux mesurés :

- **Fenêtre de réessai trop courte.** Au lancement, le contenu n'a aucun élément
  focalisable tant que le catalogue charge — une vingtaine de secondes sur le vrai
  catalogue. Avec 2,4 s de tentatives, le focus restait nulle part et le premier appui
  retombait dans le rail. Fenêtre portée à ~36 s, interrompue dès que le contenu a le focus.
- **Un garde-fou contre-productif.** J'avais ajouté « ne pas insister si le rail a le
  focus », pour ne pas le voler à l'utilisateur. Or au moment où l'on choisit un onglet on
  est **forcément** dans le rail : la boucle rendait la main aussitôt et le focus retombait
  sur le premier élément du rail. Retiré — la boucle s'arrête de toute façon dès que le
  contenu a le focus.

### Vérifié à l'émulateur

| Moment | Rail | Focus |
|---|---|---|
| Lancement | **replié** | contenu (premier genre) |
| Gauche depuis le contenu | déplié | rail — voulu |
| Choix d'un onglet | **replié** | contenu |
| Droite depuis le rail | replié | contenu |

Non-régression : le rail reste atteignable par la gauche, et sa navigation verticale
interne fonctionne.

**État : 169 tests, 0 échec.**

---

## 41. Première build de release TV depuis le début du chantier *(2026-08-20)*

`app-tv` était resté en **versionCode 8** depuis le début, et sa publication était bloquée
par le plantage de lint décrit en §31 — donc rien du travail TV (deux panneaux, carte EPG,
VF/VOSTFR, quatre correctifs de focus, pastille « vu », conservation d'état, rail qui ne
happe plus le focus) n'était sorti d'ici.

Blocage levé en désactivant le seul détecteur fautif. Build produite :

| | |
|---|---|
| `applicationId` | `com.purple.iptvplayer.tv` |
| versionCode / versionName | **9** / **1.2.0** |
| Signature | `CN=Hichem JOUINI`, SHA1 `f60c729c…620f` — clé d'upload |
| Taille | 6,1 Mo |

**Vérifié** : l'APK **minifié** s'installe et démarre sans plantage (R8 n'a rien cassé),
`leanback-launchable-activity` bien déclarée.

⚠️ **Chargement latéral sur un appareil réel** : l'app TV n'a **pas** de suffixe
`applicationIdSuffix` en debug, et une build locale est signée par la clé d'upload — donc
par un certificat différent de celui de Play (Play App Signing signe avec la clé de
Google). Si la version du Play Store est déjà installée sur l'appareil, cet APK ne pourra
pas l'écraser : il faut désinstaller d'abord, ce qui **perd les identifiants Xtream** de cet
appareil (`EncryptedSharedPreferences`, cf. §9).

### Lien M3U pré-rempli — sans jamais le committer

Saisir un lien M3U complet à la télécommande est interminable. L'écran de connexion TV
peut donc partir avec un lien déjà en place — mais **le lien porte les identifiants de
l'abonnement**, et le dépôt est partagé : le committer serait la faute déjà commise avec
`keystore.properties` (§31).

Mécanique retenue : la valeur se déclare dans `native/local.properties` — qui est dans le
`.gitignore` — sous la clé `purple.defaultM3u`, ou se passe en ligne de commande par
`-Ppurple.defaultM3u=…`. Elle arrive au code via `BuildConfig.DEFAULT_M3U`, **vide par
défaut** : une build faite sur une autre machine ne pré-remplit rien et ne divulgue rien.

**Vérifié sur émulateur** (versionCode 10 / 1.2.1) : le champ arrive rempli, et un seul
appui sur « Se connecter » charge les 11 899 chaînes.
