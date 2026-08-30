# Environnement et outillage — Purple IPTV

> Sorti de `CLAUDE.md` le 2026-08-27, qui n'en garde qu'un renvoi : ce fichier
> n'est **pas** chargé automatiquement. À ouvrir avant de builder, d'installer ou de piloter un appareil.

---

Le projet a été travaillé sur **deux machines**. Ne pas confondre leurs chemins.

#### Machine « rigolo » — celle qui détient la clé de signature (2026-08-19)

C'est la seule des deux qui peut produire un AAB signé (`upload-keystore.jks` présent).

```bash
export JAVA_HOME=$HOME/.local/share/jdk-17       # Temurin 17, installé une fois pour toutes
export PATH="$JAVA_HOME/bin:$PATH:/home/rigolo/Android/Sdk/platform-tools"
cd /home/rigolo/Documents/woc/cluster/iptv/native
```

| Point | État sur cette machine |
|---|---|
| `native/local.properties` | ✅ **déjà correct** (`sdk.dir=/home/rigolo/Android/Sdk`) — rien à ajuster ; c'est la version du dépôt, la machine « hjouini » n'avait pas committé sa correction |
| JDK | ✅ **`~/.local/share/jdk-17`** (Temurin 17.0.20.1). Le paquet système n'est qu'un JRE — **pas de `javac`** —, d'où ce dépliage sans sudo, fait une fois et **durable**. S'il disparaissait : `curl -fsSL "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" \| tar -xz -C ~/.local/share && mv ~/.local/share/jdk-17* ~/.local/share/jdk-17` (≈ 185 Mo, 1 min). ⚠️ Ne PAS le remettre dans le scratchpad : celui-ci est propre à une session, et Gradle échoue ensuite sur « JAVA_HOME points to invalid directory » |
| Android SDK | ✅ complet — build-tools 34/35/36.1/37, platforms 34→36.1, emulator, image `google_apis_playstore` android-37 |
| `adb` | ✅ sur le `PATH`, aucune règle udev à corriger |
| Appareil | ✅ **Pixel 7 (`panther`, Android 17) connecté et autorisé** |
| `upload-keystore.jks` | ✅ présent en `client/android/`, **vérifié** : alias `upload`, le mot de passe de `keystore.properties` l'ouvre, `PrivateKeyEntry` valide jusqu'en 2053, SHA1 `F6:0C:72:9C:…` |

#### Le lien de test de l'utilisateur — où il est, et le piège de `get.php`

**`~/.purple_iptv/test_credentials`**, `chmod 600`, **hors du dépôt** : il porte des
identifiants, on ne le committe pas et on n'en recopie pas le contenu dans un fichier
suivi par git. Il définit `PURPLE_M3U_URL` ; `. ~/.purple_iptv/test_credentials` le charge.

Le même lien vit en double dans `native/local.properties` sous `purple.defaultM3u`
(fichier ignoré par git), d'où le pré-remplissage du champ de l'écran de connexion TV —
saisir un lien M3U complet à la télécommande étant interminable.

⚠️ **`get.php` est refusé par ce fournisseur.** Mesuré le 2026-08-28 depuis ce poste :
`HTTP 885` avec un corps vide, avec ou sans `User-Agent` de lecteur (VLC, okhttp, Lavf).
Inutile de chercher un contournement — l'application ne s'en sert pas :
`Credentials.parseUrl` (`core/model/Credentials.kt:16-31`) repère `username` et `password`
dans la chaîne de requête et rend des identifiants **`PlaylistType.XTREAM`** avec
`host = http://spacep2.com`. Tout le catalogue passe donc par `player_api.php`.

**Une playlist M3U réelle, pour exercer la voie `PlaylistType.M3U`.**
`~/.purple_iptv/playlist_live.m3u` (`chmod 600`, ~2,3 Mo, 11 877 chaînes, 74 thèmes) est
fabriquée depuis le compte Xtream — `get_live_categories` + `get_live_streams`, une entrée
`#EXTINF` par flux, URL `…/live/<user>/<pass>/<stream_id>.ts`. C'est le **seul** moyen de
faire passer de vraies données par `M3uParserService` : le lien de l'utilisateur est
converti en Xtream par `parseUrl` et n'atteint jamais ce code. ⚠️ Chaque URL porte les
identifiants — ce fichier ne sort pas de `~/.purple_iptv/`. La recette de régénération est
en commentaire dans `test_credentials`.

**La servir au téléphone**, bien plus rapide que de piloter le sélecteur SAF :

```bash
cd ~/.purple_iptv && python3 -m http.server 8099 --bind 127.0.0.1 &
adb -s <serial> reverse tcp:8099 tcp:8099
# dans l'app : http://127.0.0.1:8099/playlist_live.m3u
```

`parseUrl` la traite bien en `PlaylistType.M3U` — pas de `username`/`password` dans la
chaîne de requête. Éditer le fichier et refaire une connexion suffit à changer de jeu
d'essai.

Pour contrôler l'état du compte sans lancer l'application :

```bash
. ~/.purple_iptv/test_credentials
curl -sS "http://spacep2.com/player_api.php?username=…&password=…" | head -c 300
```

Au 2026-08-28 : `auth=1`, `status=Active`, `max_connections=1`. Cette dernière valeur
explique les échecs de lecture simultanée : **une seule connexion à la fois**, donc ne pas
laisser un flux ouvert sur l'émulateur pendant qu'on en lance un sur le téléphone.

#### Machine « hjouini » — sans clé de signature

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

#### Build d'auteur : utiliser l'app passé les trois jours d'essai

L'essai dure 3 jours et une build **chargée latéralement** ne peut ni acheter ni restaurer
(§9) : passé ce délai, l'app TV se referme sur sa barrière, sans issue. La sortie est une
build de debug déverrouillée — cf. §52 bis.

```bash
# native/local.properties (ignoré par git)
purple.unlock=true

./gradlew :app-tv:assembleDebug      # 1.3.0-debug, signée de la clé d'upload
adb install -r app-tv/build/outputs/apk/debug/app-tv-debug.apk
```

| | |
|---|---|
| Portée | **debug uniquement** — la release est câblée à `OWNER_UNLOCK = false` en dur |
| Signature | clé d'upload si `keystore.properties` existe ⇒ s'installe **par-dessus** la release sans désinstaller, données conservées |
| Effet de bord | `core` étant partagé, la debug d'`app-mobile` est aussi déverrouillée sur cette machine |

Sans rebuild, `adb shell pm clear com.purple.iptvplayer.tv` rend un essai neuf de 3 jours —
mais efface identifiants, favoris et « Reprendre la lecture ».

#### Piloter un appareil réel

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

#### Correctif d'environnement déjà appliqué

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

---

## Servir un catalogue à l'émulateur, sans le fournisseur

L'IP du fournisseur est bloquée depuis ce poste en Wi-Fi (§8), ce qui interdit tout
scénario ayant besoin d'un catalogue — et donc tout ce qui passe par la lecture d'un média,
barrière d'achat comprise.

```bash
mkdir -p /tmp/srv && cat > /tmp/srv/list.m3u <<'EOF'
#EXTM3U
#EXTINF:-1 tvg-name="Canal Test 1" group-title="DEMO",Canal Test 1
http://127.0.0.1:8099/flux1.ts
EOF
cd /tmp/srv && python3 -m http.server 8099 --bind 127.0.0.1 &
adb reverse tcp:8099 tcp:8099      # 127.0.0.1:8099 du device → hôte
adb reverse --remove tcp:8099      # à ne pas oublier
```

⚠️ **Mesuré le 2026-08-30 : le serveur reçoit bien le `GET`, mais l'application refuse le
lien** (« Connexion au serveur impossible »). `IptvRepository.doValidate` valide un M3U par
un `apiClient.head(host)` exigeant `200`, et le journal du serveur ne montre **aucun
HEAD** — alors qu'un `curl -I` répond `200`. Écart non élucidé ; la recette est notée telle
quelle, avec sa limite (§68).

⚠️ `pgrep -f "http.server"` **matche votre propre ligne de commande** et fait croire que le
serveur tourne encore. Même piège que `pkill -f "[q]emu-system"` : utiliser la classe de
caractères, ou tuer par PID relevé avec `pgrep -af`.
