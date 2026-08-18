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

⚠️ **Aucun JDK n'est sur le `PATH` et `JAVA_HOME` est vide.** Gradle ne démarre
pas sans ceci. Le JDK utilisable est celui embarqué dans Android Studio :

```bash
export JAVA_HOME=/home/hjouini/Downloads/android-studio-panda4-patch1-linux/android-studio/jbr
export PATH="$PATH:/home/hjouini/Android/Sdk/platform-tools"   # pour adb
cd /home/hjouini/Documents/ETNA/woc/cluster/iptv/native
```

| Besoin | Commande | Vérifié |
|---|---|---|
| Compiler la logique métier | `./gradlew :core:compileDebugKotlin` | ✅ BUILD SUCCESSFUL (2 m 21 s) |
| **Tests unitaires JVM (boucle de travail)** | `./gradlew :core:testDebugUnitTest` | ✅ 35 tests, 0 échec (~3 s) |
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
| B1 | abonnements jamais restaurés | lecture de `BillingRepository` — **non corrigé, à confirmer en Play Console** |

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

### B1 — Les abonnements ne sont jamais restaurés *(non corrigé — à confirmer)*
`core/data/BillingRepository.kt`

`restorePurchases()` et `queryProducts()` n'interrogent que `ProductType.INAPP`.
Si l'un des produits est configuré en abonnement dans la Play Console, il n'est ni
proposé ni restauré : un abonné qui réinstalle perd l'accès, ce qui aggrave P1.
`queryProducts()` avale de plus silencieusement l'échec — si `responseCode != OK`,
`_products` reste vide sans aucun diagnostic, ce qui rend le symptôme
« seul un abonnement est proposé » de `raf.md` impossible à expliquer côté app.

**Non corrigé** : trancher exige de savoir comment les trois produits sont déclarés
en Play Console (INAPP one-time vs SUBS), information indisponible depuis le code.

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

Le fichier référence `../client/android/upload-keystore.jks`, **absent de cette
machine** : `assembleRelease` est donc impossible ici, et avec lui toute installation
par-dessus l'app signée en release.

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

**État : 70 tests, 0 échec, ~7 s.**

### À faire

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
