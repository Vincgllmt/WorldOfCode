# Stratégie de test — Purple IPTV

> Sorti de `CLAUDE.md` le 2026-08-27, qui n'en garde qu'un renvoi : ce fichier
> n'est **pas** chargé automatiquement. `CLAUDE.md` garde le triptyque et la commande du niveau 1 ;
> le détail des trois niveaux, l'outillage et les conventions sont ici.

---

#### Le triptyque obligatoire

**Un développement se valide sur les supports où il tourne, pas seulement dans
une suite de tests.** Une modification de l'app TV se voit sur l'émulateur TV ;
une modification de l'app mobile se voit sur le téléphone. Les tests unitaires
prouvent la logique, ils ne prouvent rien de ce qui s'affiche.

| Ce qui a changé | Niveaux à passer |
|---|---|
| Logique dans `core` | 1 |
| UI de l'app TV | 1 **et 2** |
| UI de l'app mobile | 1 **et 3** |
| Logique partagée qui touche les deux UI | 1, **2 et 3** |

Ce qui n'a pas été vérifié doit être **dit**, jamais supposé.

---

##### Niveau 1 — Logique (obligatoire, toujours)

```bash
export JAVA_HOME=$HOME/.local/share/jdk-17    # aucun JDK système, cf. §3
cd cluster/iptv/native
./gradlew :core:testDebugUnitTest
./gradlew :app-tv:testDebugUnitTest    # source set créé au §43
```

C'est le juge de paix. Il est rapide (~30 s), ne demande aucun appareil, et
couvre la couche où se trouvent la plupart des défauts.

On continue d'**étendre** cette suite : chaque correctif de logique arrive avec
le test qui échouerait sans lui. Un test qui ne peut pas échouer ne prouve rien
(§8.3).

Rapport HTML après échec : `core/build/reports/tests/testDebugUnitTest/index.html`.

---

##### Niveau 2 — Interface TV (émulateur)

**Ce que le niveau 1 ne voit pas** : le focus D-pad, le rendu Compose, la
navigation entre écrans. Aucun test JVM ne rend un pixel (§8.14).

➡️ **Pas besoin de demander.** L'émulateur est une machine jetable : le lancer,
y installer l'app et la piloter ne demande aucune autorisation. Le faire de sa
propre initiative dès qu'une modification touche `app-tv`.

```bash
export PATH="$PATH:/home/rigolo/Android/Sdk/emulator:/home/rigolo/Android/Sdk/platform-tools"

# 1. Lister les AVD disponibles
emulator -list-avds                       # → purple_tv

# 2. Lancer l'émulateur TV
emulator -avd purple_tv -gpu swiftshader_indirect -no-boot-anim -no-audio &

# 3. Attendre le démarrage complet
until [ "$(adb -s emulator-5554 shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 5; done

# 4. Installer l'app
./gradlew :app-tv:installDebug

# 5. La lancer (TV = LEANBACK_LAUNCHER, pas le launcher normal)
adb -s emulator-5554 shell monkey -p com.purple.iptvplayer.tv \
    -c android.intent.category.LEANBACK_LAUNCHER 1

# 6. Tests instrumentés, s'il y en a pour le sujet traité
./gradlew :app-tv:connectedDebugAndroidTest
```

⚠️ **`-gpu host` NE FONCTIONNE PAS sur cette machine**, bien que le `config.ini`
de l'AVD porte `hw.gpu.mode=host`. Session Wayland + Intel intégré : le rendu
matériel est refusé. L'émulateur démarre quand même, la fenêtre s'affiche, l'app
obtient le focus — et **rien n'est dessiné**. Symptômes trompeurs : capture figée
sur le launcher, `uiautomator` à 0 nœud, impression que l'app ne démarre pas
alors que son processus tourne.

Le diagnostic tient en une commande :

```bash
grep -i "cannot be used" <log de l'émulateur>
# ERROR | Your GPU cannot be used for hardware rendering.
```

⚠️ Pour l'arrêter : `pkill -f "[q]emu-system"`. Sans la classe de caractères, le
motif matche la ligne de commande du shell qui l'exécute et **tue son propre
shell**.

⚠️ `uiautomator dump` ne rend **rien d'exploitable** sur cette app : Compose
n'expose pas d'arbre de vues classique. Pour constater l'état d'un écran, passer
par `adb exec-out screencap -p > /tmp/ecran.png` et regarder l'image.

---

##### Niveau 3 — Interface mobile (appareil physique)

Il n'y a pas d'émulateur mobile ici : l'app mobile se valide sur le Pixel 7.

**La règle tient en une question : l'appareil est-il branché ?**

```bash
adb devices -l | grep -v emulator      # un appareil physique répond-il ?
```

**S'il répond** → installer et vérifier directement, sans rien demander :

```bash
./gradlew :app-mobile:installDebug
```

**S'il ne répond pas** → **S'ARRÊTER**, demander à l'utilisateur de brancher son
Pixel 7 en USB, et **attendre sa confirmation** avant de reprendre. Ne pas
contourner en se contentant du niveau 1 et en déclarant le travail vérifié : une
modification d'UI mobile non vue sur un écran n'est pas vérifiée.

`app-mobile` porte `applicationIdSuffix = ".debug"` : la variante s'installe
**à côté** de la production (`com.purple.iptvplayer.debug`), dont les données
restent intactes. Contrepartie : Play Billing ne fonctionne pas sur cette
variante.

⚠️ Le téléphone est l'appareil **personnel** de l'utilisateur (§8.16). Installer
l'app **mobile** dessus est l'usage prévu ; en revanche ne **jamais** y installer
une build **TV**, et éviter les captures d'écran — une capture a déjà ramené une
conversation privée à l'écran (§52). En cas de doute sur une capture, demander.

Deux obstacles `adb` déjà rencontrés, tous deux résolus :

1. `no permissions (missing udev rules)` → `sudo adb kill-server && sudo adb start-server`,
   à lancer **par l'utilisateur** ;
2. `unauthorized` → la boîte « Autoriser le débogage USB ? » doit être validée
   sur le téléphone.

---

#### Outillage

| Outil | Rôle | Niveau |
|---|---|---|
| **JUnit 4** | runner, standard AGP | 1 |
| **kotlinx-coroutines-test** | `runTest` pour les API `suspend` | 1 |
| **org.json:json** | implémentation réelle d'`org.json` sur le classpath de test | 1 |
| **compose ui-test-junit4** | rend l'arbre Compose, injecte des touches | 2 et 3 |
| **androidx.test** + **espresso** | runner instrumenté | 2 et 3 |

Plus `testOptions { unitTests { isReturnDefaultValues = true } }` dans
`core/build.gradle.kts`.

Le point sensible du niveau 1 est `org.json` : dans un test JVM nu,
`JSONArray`/`JSONObject` ne sont que des *stubs* d'`android.jar` qui lèvent
« not mocked ». L'implémentation Maven réelle sur le classpath de test lève le
blocage — vérifié par `ToolchainSmokeTest.orgJsonIsAvailable`, qui existe
précisément pour empêcher qu'on retire cette dépendance par mégarde.

#### Robolectric : évalué puis écarté

Robolectric était le choix initial pour obtenir `org.json` et un `Context` réels.
Il s'est avéré **inutile** au niveau 1 : en extrayant la logique métier en objets
purs ([TrialPolicy], [RecentItemsCodec], [DownloadPolicy]…), plus aucun test de
logique ne touche à Android. La suite tourne en ~30 s au lieu de plusieurs
dizaines de secondes, et on évite les problèmes de compatibilité de Robolectric
avec `compileSdk 36` ainsi que l'`AndroidKeyStore` requis par
`EncryptedSharedPreferences`.

➡️ **Règle qui en découle : on ne teste pas un Repository à travers Android ; on
extrait sa décision en objet pur et on teste celui-ci.** C'est le motif de
`TrialPolicy`, `CachePolicy`, `RecentPolicy`, `AccessState`, `VersionPolicy`,
`TrackPolicy`, `DownloadPolicy`, `TrackListBuilder`.

Pour l'UI, c'est l'inverse : Robolectric ne remplace pas un appareil. Les
niveaux 2 et 3 passent par `androidTest` sur émulateur ou téléphone.

#### Convention

Tests de logique dans `core/src/test/kotlin/com/purple/iptvplayer/core/…`,
miroir de l'arborescence `main`. Un fichier `XxxTest.kt` par classe testée.

Tests instrumentés dans `app-tv/src/androidTest/…` et
`app-mobile/src/androidTest/…`. Ils décrivent le **symptôme** tel que
l'utilisateur le vit — « l'écran ne répond à aucune touche » — et non
l'implémentation du correctif : un test écrit à partir du code qu'il vérifie ne
peut que le confirmer.

#### Testabilité — décision architecturale

`TrialRepository` lisait l'heure via `System.currentTimeMillis()` en dur, ce qui
rendait la logique d'essai/abonnement **non testable de façon déterministe**.
Décision : **injecter une source de temps** (paramètre
`now: () -> Long = System::currentTimeMillis`) plutôt que de manipuler l'horloge
système dans les tests. Même principe pour toute future logique dépendant du
temps.
