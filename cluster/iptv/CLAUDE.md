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
| S2 | mot de passe de signature commité en clair | `native/keystore.properties` suivi par git — **à sortir du suivi** |
| S3 | **le `signingConfig` ne trouvait jamais le keystore** | `bundleRelease` en échec sur la machine qui détient la clé — **corrigé** |
| B1 | facturation : six défauts, dont l'abonné bloqué au 30ᵉ jour | lecture de `BillingRepository`, paramétrage confirmé par l'utilisateur |
| B2 | un achat remboursé/révoqué ne retire jamais l'accès | lecture de `syncEntitlements` — **non corrigé** |
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

- [x] **S3** — `rootProject.file()` dans les deux `signingConfig` : le keystore était
      cherché un niveau trop bas et **aucune publication n'était possible**.
- [x] `:app-mobile:bundleRelease` produit et signé par la clé d'upload (versionCode 9).

**État : 73 tests, 0 échec.**

### À faire

- [ ] **B3 — prix « N/A » sur le paywall** (cf. §5 B3). Correction symétrique de celle déjà
      faite pour le tri : lire le prix de la première phase tarifaire en repli.
- [ ] **UX-1 — cohérence de l'état premium dans toute l'application** *(demandé le 2026-08-19)*.
      Voir §10.
- [ ] **B2 — un achat remboursé ne retire jamais l'accès** (cf. §5 B2). Exige de distinguer
      « Play dit que tu n'as rien » de « Play n'a pas répondu » : ne pas écrire à l'aveugle.

- [ ] Exposer la simulation d'expiration dans l'UI derrière `BuildConfig.DEBUG`
      (demande explicite de `raf.md`).
- [ ] Trancher **P9** (« Maybe later » sur l'écran de blocage).
- [ ] Vérifier sur appareil réel les symptômes de `raf.md` qui ne se reproduisent
      pas hors appareil : Cast d'une chaîne TV (son sans image), EPG qui ne
      disparaît jamais, retrait d'un favori impossible sur `app-tv`.
- [ ] Auditer `FavoritesRepository.toggle()` côté `app-tv` : la logique `core`
      semble correcte, le défaut est probablement dans la couche UI TV.
- [ ] Trancher **S1** (TLS) et **B1** (restauration des abonnements) — les deux
      exigent une décision qui n'est pas dans le code.
- [ ] `DownloadRepository` (8,4 ko) et `PlayerService` : encore aucune couverture.
      `XtreamApiClient` n'est couvert que sur ses URL et l'EPG ; ses parseurs JSON
      (`parseChannels`, `parseMovies`, `parseSeriesDetail`) restent nus — et ils
      appellent `JSONArray()` sans protection, exactement comme P2.
- [ ] Ultérieur : tests instrumentés (Espresso / Compose UI) quand un appareil ou
      un AVD sera disponible.

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
