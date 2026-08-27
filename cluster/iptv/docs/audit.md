# Audit de Purple IPTV — feuille de route

> Relevé le 27/08/2026 par lecture systématique du code,
> périmètre par périmètre : `core`, `app-tv` et `app-mobile`, soit ~12 000 lignes
> de Kotlin. **100 défauts** retenus, chacun sourcé à la ligne.
>
> Chaque entrée porte une **preuve** (`fichier:ligne`) et, quand elle a pu être
> établie, une **cause racine**. Là où la cause n'a pas pu être tranchée par
> lecture seule, c'est écrit — mieux vaut « cause à établir » qu'une supposition
> présentée comme un fait.
>
> Les tickets GitLab correspondants portent le label `ai-factory`. Ce document
> reste la référence même s'ils sont fermés.

## Vue d'ensemble

| Gravité | Nombre |
|---|---|
| **CRITIQUE** | 4 |
| **MAJEUR** | 43 |
| **MINEUR** | 53 |

| Périmètre | Défauts |
|---|---|
| `app-mobile/detail` | 11 |
| `app-mobile/shell` | 11 |
| `app-mobile/player` | 9 |
| `app-mobile/setup` | 9 |
| `app-tv/series` | 9 |
| `app-mobile/downloads` | 7 |
| `app-tv/home` | 7 |
| `app-tv/movies` | 7 |
| `core/viewmodel` | 7 |
| `app-mobile/catalog` | 6 |
| `app-tv/purchase` | 6 |
| `app-tv/navigation` | 5 |
| `app-tv/setup` | 4 |
| `app-tv/player` | 2 |

## Comment lire ce document

**CRITIQUE** — casse un parcours utilisateur : crash, écran inutilisable,
donnée perdue. À traiter en premier.

**MAJEUR** — comportement faux dans un cas identifié, ou décision dupliquée
entre les deux UI qui finira par diverger (motif §8.2, aujourd'hui règle 2 de
`docs/METHODE.md`).

**MINEUR** — libellé en dur, pluriel non accordé, incohérence de présentation.
Réel, mais ne justifie pas une correction isolée : à traiter par lots.


# CRITIQUE

## #97 — app-mobile/detail : faire piloter le lecteur par la même instance de PlayerViewModel que l'écran de lecture

`app-mobile/detail`

**Symptôme.** (a) sur un épisode de série, « Réessayer » de l'écran d'erreur ne produit rien : PlayerScreen.kt:221 appelle `retry()`, qui sur l'instance du lecteur voit `episodes` vide puis `currentUrl` à null et sort (PlayerViewModel.kt:231-241) — alors que le commentaire de `retry()` décrit précisément ce cas « URL vide, liste passée séparément ». (b) En quittant le lecteur, PlayerScreen.kt:149 appelle `stop()` sur l'instance du lecteur, dont `progressSavingJob` et `transitionJob` sont nuls : la boucle d'enregistrement et le suivi de transition lancés par `playWithEpisodes` sur l'instance de la **fiche** ne sont jamais annulés et survivent tant que la fiche est dans la pile. `playerService.stop()` ramenant `mediaItemIndex` à 0 (comportement documenté par le commentaire de `stop()`, PlayerViewModel.kt:200-203), le suivi orphelin y lit une transition : l'épisode qu'on vient de quitter est marqué « vu en entier » (`markPreviousEpisodeWatched`, dès qu'on l'a regardé plus de 10 s, seul cas où `lastKnownDurationMs` est renseigné), puis l'épisode 1 est réinséré dans « Reprendre la lecture » toutes les 10 s — le défaut du §49/§8.15 que `stop()` avait été écrit pour supprimer. N'affecte pas l'épisode d'index 0, dont l'index ne change pas.

**Preuve.** app-mobile/.../seriesdetail/SeriesDetailScreen.kt:62 obtient un `PlayerViewModel` par `koinViewModel()` dans la destination `series_detail`, et :326 y appelle `playWithEpisodes`. app-mobile/.../player/PlayerScreen.kt:73 en obtient un **autre** dans la destination `player`. core/.../di/AppModule.kt:33 déclare `viewModel { PlayerViewModel(...) }` — une instance par `ViewModelStoreOwner` — et aucun fichier de `app-mobile`, `app-tv` ni `core` ne redéfinit `LocalViewModelStoreOwner` : dans un `NavHost`, c'est le `NavBackStackEntry`, donc une instance par destination.

**Cause.** établie — `PlayerViewModel` est déclaré `viewModel {}`, donc porté par la destination, alors que son propre code suppose une instance unique (« ce ViewModel étant porté par l'Activity », PlayerViewModel.kt:189).

**Piste.** soit partager une seule instance entre les deux destinations (owner de l'Activity, entrée parente de navigation, ou portée Koin explicite), soit cesser de piloter le lecteur depuis la fiche et faire transiter la liste d'épisodes par la route. Corriger seulement `retry()` laisserait (b) en place.


## #125 — app-mobile/setup : passer au chargeur de playlist l'URI du fichier choisi, pas son `path`

`app-mobile/setup`

**Symptôme.** onglet « Fichier » : la sélection paraît réussie — `FilePickerRow` (SetupScreen.kt:397) affiche bien « ma-liste.m3u » avec la coche verte — puis « SE CONNECTER » échoue systématiquement sur « Could not connect to the server. Please check your credentials. ». L'import d'un M3U local ne fonctionne pour aucun fichier.

**Preuve.** app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/setup/SetupScreen.kt:72 — `uri?.path?.let { selectedFile = it }` retient le `path` d'une URI `content://` rendue par `ActivityResultContracts.GetContent()` ; ligne 278 ce texte est envoyé tel quel à `vm.submitLocalFile(it)`, et `core/.../IptvRepository.kt:45` le valide par `java.io.File(creds.host).exists()`

**Cause.** le `path` d'une URI de fournisseur de documents (`/document/primary:Download/ma-liste.m3u`, `/msf:1000000123`) n'est pas un chemin de système de fichiers ; `File(...).exists()` rend toujours `false`. S'ajoute que `GetContent()` n'accorde qu'une permission de lecture temporaire alors que le chemin est persisté par `credRepo.save()` : même un chemin correct ne survivrait pas au redémarrage.

**Piste.** conserver l'URI (`uri.toString()`), prendre `ActivityResultContracts.OpenDocument` + `takePersistableUriPermission`, et donner à `core` un chemin de lecture par `ContentResolver` pour les sources locales — la branche `File(...)` de `IptvRepository` ne sait lire qu'un chemin absolu réel. Décider dans `core` ce qui distingue « URI de contenu / chemin de fichier / URL http » plutôt que dans l'UI.


## #66 — app-tv : ne pas rouvrir l'écran de connexion sur un `SetupState.Success` hérité de la session précédente

`app-tv/setup`

**Symptôme.** l'utilisateur qui s'est connecté puis, dans la même session, va dans Paramètres → Déconnexion : ses identifiants sont effacés, l'écran de connexion apparaît un instant et se referme seul sur un catalogue vide. Chaque nouvelle tentative rebondit de la même façon ; il n'existe plus aucun chemin vers l'écran de connexion tant que l'application n'est pas tuée et relancée (au redémarrage, l'Activity est neuve, donc le ViewModel aussi). Même mécanisme, en moins grave, pour `SetupState.Error` : le bandeau d'erreur de la tentative précédente est déjà affiché à l'arrivée.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/setup/TvSetupScreen.kt:71-73 — `LaunchedEffect(state) { if (state is SetupState.Success) onSuccess() }` s'exécute aussi à la **première** composition (§8.8) et `state` provient d'un `SetupViewModel` obtenu par `koinViewModel()` (ligne 56), donc porté par le `ViewModelStore` de l'Activity. `TvNavGraph.kt:96` compose `TvSetupScreen` sans pile de navigation (« machine à états `when` », cf. `TvNavPolicy.kt:74`), et `TvNavGraph.kt:102-107` y ramène après `credRepo.clear()` (bouton « Déconnexion » réellement câblé, `TvMainScreen.kt:790`).

**Cause.** `SetupViewModel` survit à la destination parce que `TvNavGraph` n'a pas de `NavBackStackEntry` : le `ViewModelStoreOwner` est l'Activity. `state` reste donc à `Success` après la navigation vers `Main`, et rien ne le remet à `Idle` à l'entrée — `vm.resetState()` n'est appelé que sur un changement d'onglet (ligne 151). Divergence avec le mobile, immunisé par construction : `NavGraph.kt:90` déclare `composable(Routes.SETUP)`, dont l'entrée est détruite par `popUpTo(Routes.SETUP) { inclusive = true }` au succès, puis recréée au logout (`popUpTo(0)`) — un `SetupViewModel` neuf à chaque fois.

**Piste.** remettre l'état à `Idle` à l'entrée de l'écran plutôt que compter sur la durée de vie du ViewModel, ou ne déclencher `onSuccess()` que sur une **transition** vers `Success` observée pendant que l'écran est composé. Vérifier au passage que les autres écrans TV obtenus par `koinViewModel()` ne dépendent pas non plus d'un état supposé neuf.


## #43 — core/viewmodel : cesser de garder dans « Reprendre la lecture » un média lu jusqu'au bout

`core/viewmodel`

**Symptôme.** un film regardé jusqu'au générique reste indéfiniment dans « Reprendre la lecture », barre pleine, et le rouvrir depuis la carte le place directement à la fin — écran noir ou générique — au lieu de le relancer. La rangée se remplit de contenus déjà vus et chasse ceux réellement en cours (la liste est bornée à `RecentItemsCodec.MAX_ITEMS`, cf. RecentPolicy.upsert).

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/PlayerViewModel.kt:296 — `saveProgressNow()` n'a qu'un seuil bas (`pos > 5_000L`) et aucun seuil de fin : la boucle des 10 s, puis le dernier enregistrement de `stop()` (PlayerViewModel.kt:197), écrivent une position égale à la durée. Rien n'exploite la fin de lecture : `PlayerStatus.ENDED` n'est produit qu'en un point (core/player/PlayerService.kt:93) et n'est lu **nulle part** dans les trois modules. Le résultat est relu tel quel à la réouverture (app-tv/.../TvPlayerScreen.kt:139 et app-mobile/.../PlayerScreen.kt:98 appellent `vm.getSavedProgress(mediaId)` puis passent la valeur en `startPositionMs`), et affiché à 100 % par la carte (app-mobile/.../home/HomeScreen.kt:341-346, `progress / duration`).

**Cause.** établie — il n'existe aucune notion de « terminé » dans la chaîne de progression. `PlayerViewModel` n'enregistre que « position > 5 s », et personne ne consomme l'état `ENDED` que `PlayerService` publie déjà.

**Piste.** faire porter par `core` une règle de fin (par ex. position au-delà d'un pourcentage de la durée ⇒ ne pas enregistrer et retirer l'entrée via `clearProgress`), et la brancher à la fois sur la boucle d'enregistrement, sur `stop()` et sur `PlayerStatus.ENDED`. La règle est une décision pure : elle doit vivre à côté de `RecentPolicy`, pas dans les deux UI.

**✅ Corrigé le 2026-08-27** — `core/data/ProgressPolicy` (règle pure, seuil 0,9 — celui que les trois UI appliquaient déjà chacune de leur côté), branchée sur la boucle, `stop()`, `onCleared()`, `PlayerStatus.ENDED` et un garde de reprise dans `playMedia` ; `ProgressRepository.markCompleted` retire l'entrée sans perdre la marque « vu », `getResumePosition` rouvre au début. Vérifié à l'émulateur en différentiel build par build, et sur le Pixel 7 où la rangée réelle est passée de **15 cartes à 1**. Détail : `JOURNAL.md` §53.


# MAJEUR

## #108 — app-mobile/home : regrouper les thèmes d'une seule façon, la vue thèmes et la liste de chaînes n'utilisent pas la même clé

`app-mobile/catalog`

**Symptôme.** quand le catalogue contient deux libellés de thème qui ne diffèrent que par la casse (c'est le seul cas que la normalisation de `allGrouped` sert à traiter, sinon elle est morte), la carte de thème annonce « CINEMA · 40 chaînes » ; en l'ouvrant on obtient **deux** en-têtes, « Cinema (25) » et « CINEMA (15) », dont un seul porte le liseré de sélection et le signet rempli. Poser le signet sur le second enregistre une **deuxième** entrée de favori pour le même thème, qui apparaît en double dans « Ma liste ».

**Preuve.** app-mobile/.../ui/home/HomeScreen.kt:85-91 — `allGrouped` regroupe sur `(group ?: "Other").trim().lowercase()` puis réaffiche l'orthographe du premier élément, et trie sur `first.lowercase()`. HomeScreen.kt:76-81 — `grouped`, qui alimente la liste de chaînes du même écran, regroupe sur la chaîne **brute** `it.group ?: "Other"`, teste le favori avec `genreFavs.contains(it.key)` (clé brute) et trie sur cette clé brute, donc casse-sensible. HomeScreen.kt:197 — `isSelected = selectedGenre == genre` compare en casse-sensible, alors que le filtre HomeScreen.kt:69 retient les chaînes avec `equals(selectedGenre, ignoreCase = true)`. Corroboration hors périmètre : `ui/mylist/MyListScreen.kt:115-116` compte les thèmes favoris sur `it.trim().lowercase()` — la clé normalisée est la convention ailleurs dans l'app.

**Cause.** deux regroupements écrits côte à côte dans la même fonction, l'un normalisé, l'autre non ; le filtre, lui, est insensible à la casse — donc les trois règles ne coïncident pas.

**Piste.** une seule décision « clé de thème + libellé affiché + tri », portée par `core` et partagée par les trois onglets mobiles ; elle rejoint les tickets #59/#60 qui constatent la même divergence côté app-tv. Trancher aussi le repli : `core` écrit « Others » (IptvRepository.kt:68), l'UI écrit « Other » (HomeScreen.kt:78 et 87) — et comme `group` n'est jamais nul en sortie de `IptvRepository`, ce repli d'UI est de toute façon inatteignable.


## #109 — app-mobile/home : donner à chaque ligne de chaîne une clé unique, l'URL ne l'est pas

`app-mobile/catalog`

**Symptôme.** sur une source M3U qui liste deux fois le même flux (doublon exact, ou même URL rangée dans deux `group-title`), l'onglet Direct TV plante dès que les deux lignes sont composées en même temps.

**Preuve.** app-mobile/.../ui/home/HomeScreen.kt:202 — `items(channels, key = { "lrow_" + it.url })`, dans une `LazyColumn` unique qui empile toutes les sections de thèmes. `core/network/M3uParserService.kt:36-42` n'impose aucune unicité : deux entrées `#EXTINF` portant la même URL produisent deux `M3uItem`, et `IptvRepository.kt:63-70` les mappe telles quelles en deux `Channel`.

**Cause.** Compose exige des clés uniques dans une liste paresseuse — chaque item est enveloppé dans `SaveableStateProvider(key)` (vérifié dans `foundation-android:1.10.3`, `LazyLayoutItemContentFactoryKt` → `LazySaveableStateHolder`), et `SaveableStateHolderImpl` porte le `require` « Key … was used multiple times » (vérifié au bytecode dans `runtime-saveable-android:1.10.3`). La voie Xtream n'est pas concernée : `streamUrl` dérive de `stream_id`, unique.

**Piste.** une clé qui ne dépend pas d'une donnée fournisseur — soit dédoublonner à la construction dans `core` (ce qui règle aussi le cas d'un favori posé sur un doublon), soit composer la clé avec le thème et le rang. Ne pas se contenter d'ajouter le nom : deux doublons exacts partagent aussi le nom.


## #98 — app-mobile/detail : ne pas lancer le flux distant d'un épisode que l'on va lire depuis le disque

`app-mobile/detail`

**Symptôme.** appuyer sur la pastille ✓ d'un épisode téléchargé ouvre d'abord une connexion au fournisseur, puis bascule sur le fichier local ; hors ligne — le cas d'usage même du téléchargement — la lecture part sur une erreur avant de se rattraper. Deux lectures sont amorcées pour une seule demande.

**Preuve.** SeriesDetailScreen.kt:345-349 — `onPlayLocal` appelle `playWithEpisodes(episodes, …)`, qui exécute `playerService.playPlaylist` sur les URL **distantes** (PlayerViewModel.kt:92-93), avant de naviguer vers le lecteur avec `file://$localPath`, que PlayerScreen.kt:99 relance aussitôt en `playMedia`.

**Cause.** établie — le chemin local réutilise l'amorce de liste distante pour obtenir la file d'épisodes.

**Piste.** jumeau mobile du ticket #51 ; à traiter avec lui, en distinguant « constituer la file » de « lancer la lecture ».


## #99 — app-mobile/detail : décider « film commencé » sur la progression enregistrée, pas sur la liste plafonnée des reprises

`app-mobile/detail`

**Symptôme.** un film commencé, puis 20 autres médias regardés depuis : la fiche affiche « Lire », sans barre d'avancement et **sans le bouton « Recommencer »** (conditionné à `isStarted`, ligne 161) — mais l'appui sur « Lire » redémarre à 47 min, et il n'existe alors aucun moyen de repartir du début.

**Preuve.** MovieDetailScreen.kt:56, 76-79 — `isStarted` est déduit de `progressRepo.recentItems`, plafonné à 20 entrées (`RecentItemsCodec.MAX_ITEMS = 20`, appliqué par `RecentPolicy.upsert(...).take(max)`). Le lecteur, lui, reprend depuis la clé `progress_<id>` (PlayerScreen.kt:98 → `getSavedProgress` → ProgressRepository.kt:36), qui n'est jamais purgée.

**Cause.** établie — deux sources de vérité pour la même décision, dont une plafonnée.

**Piste.** faire porter la décision par core (lecture de la progression réelle), la liste « Reprendre la lecture » restant une vitrine plafonnée.


## #100 — app-mobile/detail : conserver la saison choisie au retour du lecteur

`app-mobile/detail`

**Symptôme.** on lance S5E3, on revient : la fiche est retombée sur la saison 1, en haut de liste. À refaire après chaque épisode d'une série longue. Même perte après rotation ou mort du processus.

**Preuve.** SeriesDetailScreen.kt:81 — `var selectedSeason by remember { … }`, alors que le même fichier importe `rememberSaveable` (ligne 11) et s'en sert pour le synopsis (ligne 135).

**Cause.** établie — la composition de la destination est détruite en naviguant vers le lecteur ; seul l'état sauvegardable est restauré depuis l'entrée de navigation.

**Piste.** `rememberSaveable`, en validant que la saison mémorisée figure encore dans `sortedSeasons` (une fiche rechargée peut ne plus l'avoir). Jumeau mobile du ticket #53.


## #101 — app-mobile/detail : sortir en ressources quatre libellés en dur, dont deux qui affichent la mauvaise langue

`app-mobile/detail`

**Symptôme.** en anglais, deux boutons en français sur les deux fiches ; en français, « No plot available », « Downloading 42 % » — alors que les trois autres états du même bouton sont traduits (`dl_queued`, `dl_done`, `dl_failed`, lignes 277-280) — et « Season 3 » dans le sélecteur de saisons.

**Preuve.** MovieDetailScreen.kt:199 et SeriesDetailScreen.kt:177 — « ✓ Ma liste » / « + Ma liste » écrits en français dans le code ; MovieDetailScreen.kt:228 « No plot available » ; MovieDetailScreen.kt:278 « Downloading ${item.progress}% » ; SeriesDetailScreen.kt:202 « Season $season ».

**Cause.** établie ; `tools/check_strings.py` ne repère les littéraux que dans un paramètre nommé (`label =`, `title =`, `name =`) et ignore `Text("…")` — c'est pourquoi ces quatre-là ont survécu au §48, dont le rapport est vert.

**Piste.** les ressources existent déjà côté TV, traduites : `btn_watchlist_add` / `btn_watchlist_in` (app-tv values et values-fr) et `label_season` = `Season %1$s` / `Saison %1$s`. Restent à créer un état `dl_downloading` et un repli de synopsis.


## #90 — app-mobile/mylist : réordonner un favori avec l'index de la liste affichée déplace la mauvaise chaîne

`app-mobile/downloads`

**Symptôme.** dès qu'un seul favori n'est plus résolu dans le catalogue, les flèches de « Ma liste » déplacent une autre chaîne que celle touchée, ou ne semblent rien faire. Exemple : favoris persistés `[A, B, C]`, catalogue ne contenant plus `A` ⇒ l'écran affiche `[B, C]` ; « descendre » sur `B` (index affiché 0) envoie `move(0,1)` et déplace `A` derrière `B` ⇒ l'affichage ne bouge pas. L'ordre persisté est silencieusement corrompu, et l'utilisateur retouche jusqu'à obtenir n'importe quoi. Le cas est atteignable sans manœuvre exotique : les correctifs P3 et P7 ont changé les noms nettoyés des chaînes, or le favori est stocké **par nom** — tout favori posé avant ces correctifs est orphelin.

**Preuve.** app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/mylist/MyListScreen.kt:248-249 — `onMoveUp`/`onMoveDown` passent `index`, celui de `itemsIndexed(favChannels, …)`. `favChannels` (l.92-95) est `channelFavs.mapNotNull { byName[it] }`, donc la liste des favoris **privée de ceux qui ne sont plus dans le catalogue**. En face, `ContentViewModel.moveChannelFavorite` (core/viewmodel/ContentViewModel.kt:56) appelle `FavoritesRepository.moveChannel` (core/data/FavoritesRepository.kt:79) qui applique `FavoritesCodec.move(prefs.ordered(CHANNELS, …), from, to)` (core/data/FavoritesCodec.kt:62) — c'est-à-dire sur la liste **persistée entière**, non filtrée.

**Cause.** établie — deux référentiels d'index. L'UI raisonne sur la liste résolue, `core` sur la liste persistée. Le chemin `toggleChannelFavorite(channel.name)` (l.245), lui, passe une **identité** et n'a pas ce défaut : c'est le déplacement qui est l'exception.

**Piste.** ne pas faire circuler un index à travers la frontière UI/core. Faire porter le déplacement par une identité (le nom du favori, plus un sens haut/bas), ou traduire l'index affiché en index persisté avant l'appel. La décision est écrite deux fois — `app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/mylist/TvMyListScreen.kt:309-310` passe le même index filtré — donc elle doit finir dans `core`, avec le test qui va avec (règle §8.2).


## #91 — app-mobile/mylist : distinguer « catalogue en cours de chargement / en erreur » de « liste vide »

`app-mobile/downloads`

**Symptôme.** l'écran « Ma liste » annonce « Votre liste est vide » et invite à ajouter des favoris alors que l'utilisateur en a. Deux occasions : (1) transitoirement à chaque entrée dans l'onglet, puisque `LaunchedEffect(Unit)` (l.83-87) relance les trois chargements et que `loadChannels()` repasse par `ContentState.Loading` (ContentViewModel.kt:44) — l'onglet étant sorti de la composition par le `when (currentTab)` de MainScreen.kt:194-220, cela se reproduit à chaque visite ; (2) **définitivement** si le catalogue ne peut pas être rechargé — cache disque périmé et fournisseur injoignable (cas §8 du journal, IP bloquée en Wi-Fi) : `fetchChannels` lève, l'état passe en `Error`, et l'écran affirme que la liste est vide. L'utilisateur conclut que ses favoris sont perdus. Sur le filtre THEMES le symptôme est atténué mais présent : les thèmes restent affichés, tous à « 0 chaînes ».

**Preuve.** app-mobile/…/mylist/MyListScreen.kt:89,96,97 — `(channelsState as? ContentState.Success)?.data ?: emptyList()` écrase `ContentState.Loading` **et** `ContentState.Error` en liste vide ; l.177-182 `isEmpty` se déduit uniquement de ces listes ; l.184-204 affiche alors « Votre liste est vide ». À comparer avec `app-mobile/…/home/HomeScreen.kt:94,97`, qui traite les trois états séparément (spinner, message d'erreur, contenu) — l'asymétrie est dans la même application.

**Cause.** établie — la lecture des trois `ContentState` ne conserve que le cas `Success`, et l'état vide est déduit du résultat de cette lecture au lieu de l'état lui-même.

**Piste.** faire dépendre l'écran des trois états comme le fait `HomeScreen` : chargement ⇒ indicateur, erreur ⇒ message (et non l'invitation à ajouter des favoris), succès ⇒ vide seulement si les favoris résolus sont vides. Vérifier au passage si le rechargement systématique à l'entrée de l'onglet est nécessaire, `ContentViewModel` étant partagé avec les onglets Direct TV / Films / Séries.


## #81 — app-mobile/player : rafraîchir le média en attente du cast quand le lecteur change d'épisode ou avance dans le film

`app-mobile/player`

**Symptôme.** deux cas. (1) La lecture est passée toute seule à l'épisode 2 ; l'utilisateur caste : le Chromecast lance l'**épisode 1**, et la progression est écrite sous l'identifiant de l'épisode 1. (2) Sur un film : l'utilisateur regarde 40 minutes puis caste ; le Chromecast démarre à `savedPos`, c'est-à-dire la position d'avant cette session (0 pour une première lecture) — les 40 minutes vues sont perdues côté téléviseur.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:96-102 — `LaunchedEffect(url)` enregistre une seule fois `castVm.setPendingMedia(url, title, cover, savedPos, …)`. `url` est un paramètre de route : il ne change jamais tant qu'on reste sur l'écran. Or `vm.nextEpisode()` (PlayerScreen.kt:137, 254, 295) ne navigue pas — `PlayerViewModel.nextEpisode()` (core/viewmodel/PlayerViewModel.kt:157-165) fait un `seekToNextMediaItem()` dans la playlist ExoPlayer. Le média en attente est ensuite rejoué tel quel à la connexion : `CastRepository.kt:80-86` fait `castMedia(pm.url, pm.title, …, pm.startPositionMs, …)`.

**Cause.** le média en attente est un instantané pris à l'entrée de l'écran, alors que l'état réellement lu (élément courant de la playlist, position) vit dans `PlayerService`. Rien ne réenregistre l'instantané.

**Piste.** réenregistrer le média en attente à partir de l'état vivant du lecteur — soit sur changement d'élément de playlist et de position, soit en ne le résolvant qu'au moment où la session cast démarre (le dépôt cast a déjà l'entrée `castMedia`).


## #82 — app-mobile/player : donner une sortie au compte à rebours « épisode suivant », qui coupe 30 s d'épisode et tourne même en pause

`app-mobile/player`

**Symptôme.** l'épisode bascule automatiquement à **30 secondes de sa fin** (40 s d'apparition − 10 s de décompte), en plein contenu et non sur un générique. L'utilisateur qui met en **pause** pour lire la fin voit quand même l'épisode suivant démarrer 10 s plus tard. Aucun moyen de refuser : toucher la carte ne fait qu'aller plus vite.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:130-139 — la carte apparaît à `durationMs - positionMs <= 40_000`, puis `while (nextEpCountdown > 0) { delay(1000); nextEpCountdown-- }` et `vm.nextEpisode()`. La boucle n'a pour clé que `showNextSuggestion` : ni `state.status`, ni un état d'annulation. Les deux seuls contrôles de la carte (`onClick = onNext` en :541 et :581) accélèrent le saut, aucun ne l'annule.

**Cause.** établie — le décompte ne dépend que de la position, et le mobile n'a pas l'état d'annulation que la TV possède (`nextDismissed`, app-tv/.../TvPlayerScreen.kt:416-426, 474).

**Piste.** suspendre le décompte hors de `PlayerStatus.PLAYING` et ajouter l'annulation déjà présente côté TV. Écart de parité mobile/TV : le seuil et la règle d'annulation gagneraient à être décidés dans `core` plutôt qu'une fois par UI.


## #83 — app-mobile/player : cesser de piloter la barre d'avancement uniquement par la position du lecteur

`app-mobile/player`

**Symptôme.** pendant le glissement, le pouce revient en arrière par à-coups (il est réécrit par la position du lecteur, en retard). Et un glissement d'un bout à l'autre envoie des dizaines de `seekTo` à un flux réseau, chacun rouvrant une requête — mise en mémoire tampon en rafale.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:497-505 — `value = positionMs / durationMs` et `onValueChange = { onSeek((it * durationMs).toLong()) }`. Aucun état local de glissement : la valeur affichée est toujours celle du lecteur, et chaque delta du doigt déclenche un `seekTo`.

**Cause.** barre entièrement contrôlée par `positionMs`, sans état de glissement ni `onValueChangeFinished`.

**Piste.** mémoriser la valeur en cours de glissement, n'afficher la position du lecteur qu'en dehors du glissement, et ne chercher qu'au relâchement.


## #84 — app-mobile/player : sortir en ressources les libellés du lecteur, dont six qui existent déjà dans strings.xml

`app-mobile/player`

**Symptôme.** sur un appareil en anglais, l'onglet « Subtitle style » de la feuille du lecteur s'affiche en français (« APERÇU », « Petit / Moyen / Grand »), alors que le panneau identique des Paramètres s'affiche en anglais. Deux orthographes du même écran dans la même session.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:820 `"APERÇU"`, :838 `"Ceci est un aperçu des sous-titres"`, :850 `"TAILLE"`, :852 `"Petit"/"Moyen"/"Grand"`, :867 `"COULEUR"`, :875 `"ARRIÈRE-PLAN"` — les ressources correspondantes existent (`subtitle_preview_label`, `subtitle_preview_text`, `subtitle_size_label`, `subtitle_size_small/medium/large`, `subtitle_color_label`, `subtitle_background_label`, values/strings.xml:57-68) et sont déjà utilisées par le **même panneau** dans les Paramètres (MainScreen.kt:386-443) et côté TV (TvMainScreen.kt:684-741). S'y ajoutent :565 `"Épisode suivant"` et :571 `"Chargement…"`, sans ressource.

**Cause.** établie — littéraux au lieu de `stringResource`, et le garde-fou ne les voit pas : `tools/check_strings.py` ne détecte les littéraux que dans des arguments nommés (`label =`, `title =`, `name =`) ; sur `Text("APERÇU")` il ne dit rien. Exécuté ce jour : parité 113/113 ✓, aucun signalement sur `PlayerScreen.kt`.

**Piste.** réutiliser les ressources existantes, en créer deux pour la carte « épisode suivant », et étendre `check_strings.py` au premier argument positionnel de `Text(...)` — sans quoi le défaut reviendra.


## #126 — app-mobile/purchase : afficher l'échec d'achat, aujourd'hui jamais rendu par l'écran mobile

`app-mobile/setup`

**Symptôme.** un paiement refusé par Play (`PurchaseResult.Error`, PurchaseViewModel.kt:122-125) fait simplement disparaître le voile « Paiement en cours… » et rend l'écran identique : l'utilisateur ne sait pas si son achat a échoué ou abouti. Et quand les offres ne se chargent pas (`OFFERS_UNAVAILABLE`), la ligne 82 affiche « Aucune offre disponible pour le moment. » que la Play Console soit mal configurée, le service en panne, ou l'appareil hors ligne.

**Preuve.** app-mobile/.../purchase/PurchaseScreen.kt:52-56 — le `when (state)` ne distingue que `Loading` ; tout le reste, y compris `PurchaseScreenState.PurchaseError`, tombe dans `else ->` qui affiche le catalogue inchangé. Aucune occurrence de `PurchaseError` dans le fichier, alors que `core/.../PurchaseViewModel.kt:43-46` documente ce cas comme « cause **typée**, que chaque UI traduit avec ses propres ressources ».

**Cause.** établie — l'écran mobile n'a jamais été mis à jour quand `PurchaseError(reason, message)` a été introduit dans `core` ; l'app TV, elle, le lit (`TvPurchaseScreen.kt:117-121`).

**Piste.** rendre `err.message` (déjà localisé par Play) sinon le libellé de `err.reason`, et prévoir un bouton « Réessayer » appelant `vm.loadProducts()` — `action_retry` existe déjà dans `app-mobile/src/main/res/values/strings.xml:97` et n'est pas utilisé ici. La table `PurchaseFailure → libellé` est écrite en privé dans `TvPurchaseScreen.kt:320` : décider où elle vit avant de l'écrire une deuxième fois (motif de duplication récurrent du projet).


## #127 — app-mobile/purchase : donner à l'acheteur un moyen de restaurer ses achats, la barrière n'a aucune issue

`app-mobile/setup`

**Symptôme.** un acheteur « à vie » qui réinstalle, change d'appareil, ou dont la synchronisation de démarrage n'a pas abouti, se retrouve devant l'écran-barrière avec pour seul choix racheter. Aucun bouton pour prouver son achat, aucun retour possible.

**Preuve.** `vm.restorePurchases()` (core/.../PurchaseViewModel.kt:98) n'est appelé nulle part dans `app-mobile` — seul appelant : `app-tv/.../TvPurchaseScreen.kt:132`. `PurchaseScreen.kt:99` ne compose que « Plus tard », et `navigation/NavGraph.kt:115` passe `onBack = null` en mode barrière : aucun autre focalisable que les cartes de prix.

**Cause.** la seule réconciliation automatique côté mobile est `syncEntitlements()` lancé au démarrage par `core/.../TrialViewModel.kt:46`, **borné à 4 s** (`BILLING_SYNC_TIMEOUT_MS`) et silencieux en cas d'échec. Passé ce délai l'utilisateur est traité comme expiré, et rien dans l'UI mobile ne permet de relancer la réconciliation.

**Piste.** exposer sur `PurchaseScreen` l'action de restauration que `core` fournit déjà, comme le fait la TV, en la rendant visible même quand des offres sont présentes (le ticket #71 fait le même constat côté TV). Libellé à créer côté mobile : `action_restore` n'existe que dans `app-tv/src/main/res/values/strings.xml:114`.


## #128 — app-mobile/setup : conserver les identifiants saisis quand l'écran est recréé

`app-mobile/setup`

**Symptôme.** l'utilisateur saisit serveur, identifiant et mot de passe, s'aperçoit que l'interface est dans la mauvaise langue, touche « FR » : l'écran revient vidé, et sur l'onglet « M3U » au lieu de l'onglet « Identifiants ». Même perte à chaque rotation de l'appareil et à chaque retour depuis le sélecteur de fichier si le système a tué l'activité.

**Preuve.** SetupScreen.kt:62-69 — `modeIndex`, `urlText`, `hostText`, `userText`, `passText`, `selectedFile` sont tous des `remember { mutableStateOf(...) }`, jamais `rememberSaveable`. Ligne 315, le sélecteur FR/EN du même écran appelle `activity?.recreate()`.

**Cause.** `remember` ne survit pas à un changement de configuration ni à `Activity.recreate()` ; l'état n'est pas remonté au `SetupViewModel`, qui ne détient que `SetupState`.

**Piste.** `rememberSaveable` sur les six états, ou remonter la saisie dans `SetupViewModel`. Attention au mot de passe si l'on choisit `rememberSaveable` : il transite alors par le `Bundle` d'état d'instance. L'app TV a la même écriture (`TvSetupScreen.kt:61-69`) mais n'est pas exposée au même déclencheur — pas de rotation ni de `recreate()` de langue.


## #129 — app-mobile/purchase : cesser d'afficher une remise « SAVE 58% » que rien ne calcule

`app-mobile/setup`

**Symptôme.** le pourcentage affiché à côté du prix annuel peut ne correspondre à aucun des deux prix réellement facturés — un ajustement tarifaire en Play Console, ou un pays où les tarifs ne sont pas dans le même rapport, laisse une remise fausse à l'écran. Le badge reste par ailleurs en anglais en interface française, à côté d'un badge « MEILLEURE OFFRE » traduit, lui (ligne 160).

**Preuve.** PurchaseScreen.kt:159 — `BillingRepository.YEARLY_ID -> "SAVE 58%"`, littéral figé, alors que les deux prix comparés viennent de Play (`OfferPrice.formatted`, lignes 136-144) et peuvent changer sans nouvelle version de l'application.

**Cause.** établie pour la partie libellé (littéral non ressourcé) ; pour la valeur, la remise n'est reliée à aucun calcul — il n'existe aucun code qui compare le prix mensuel et le prix annuel.

**Piste.** soit dériver le pourcentage des `formattedPrice` réellement rendus par Play — décision de calcul à placer dans `core` à côté d'`OfferPrice`, testable en JVM et partageable avec l'écran TV — soit retirer le chiffre et garder un badge qualitatif traduit.


## #114 — app-mobile/navigation : cesser de décoder une seconde fois les arguments du lecteur, déjà décodés par la navigation

`app-mobile/shell`

**Symptôme.** Deux cas selon la donnée. (1) Un titre ou une URL contenant un `%` littéral (« 100% FOOT », une URL M3U contenant `%20`) : après le décodage de la bibliothèque il reste un `%` nu, et `URLDecoder.decode` lève `IllegalArgumentException` en pleine composition — l'écran du lecteur tombe. (2) Une URL contenant `%20` survit au premier décodage puis perd son échappement au second : ExoPlayer reçoit une URL avec une espace brute et la lecture échoue. Un `+` littéral dans un titre devient une espace. Les URL Xtream (identifiants numériques, sans `%` ni `+`) traversent les deux décodages sans dommage, ce qui explique que le défaut soit resté invisible.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/navigation/NavGraph.kt:132-136 — `java.net.URLDecoder.decode(...)` est appliqué à `url`, `title`, `mediaId` et `cover`, alors que `Routes.encode` (ligne 54) les a encodés une seule fois. Vérifié dans `navigation-common-2.8.0/jars/classes.jar` : `NavDeepLink` lit les arguments de requête par `Uri.getQueryParameters` (qui appelle `Uri.decode` sur chaque valeur) et les arguments de chemin par `Uri.decode` — la valeur qui arrive dans le `Bundle` est donc **déjà** décodée.

**Cause.** Le codage/décodage est écrit comme si la navigation transmettait la chaîne brute, ce qu'elle ne fait pas depuis longtemps. L'encodage à l'écriture reste nécessaire (un `&` ou un `#` dans une URL casserait le motif de route) ; c'est le décodage à la lecture qui est en trop.

**Piste.** Retirer les quatre `URLDecoder.decode` et lire les arguments tels quels ; garder `Routes.encode`. Vérifier au passage l'asymétrie de la ligne 135 (`type` est encodé mais jamais décodé), qui devient la règle. Un test instrumenté sur un titre contenant `%` et `+` verrouillerait le cas.


## #115 — app-mobile/main : ne pas traiter l'état d'accès non résolu comme un essai expiré

`app-mobile/shell`

**Symptôme.** À chaque entrée sur l'écran principal, **tout** utilisateur — y compris un abonné ou un acheteur à vie — voit d'abord le bandeau violet « Essai expiré. » avec le bouton « ACTIVER », puis le bandeau correct. La fenêtre n'est pas de l'ordre de la frame : `TrialViewModel.refresh()` attend `billingRepo.syncEntitlements()` sous un délai borné à 4 s (`TrialViewModel.kt:45`).

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/main/MainScreen.kt:145-146 — la branche `else` du `when (val a = access)` attrape aussi `null`, et `(a as? AccessState.Trial)?.daysLeft ?: 0` rend alors 0, ce qui affiche `R.string.trial_expired` + le bouton « ACTIVER ». `access` vient de `trialVm.accessState` (ligne 80), dont la valeur initiale est `null` (`core/.../viewmodel/TrialViewModel.kt:34`, dont le commentaire prévient explicitement : « une UI qui lirait la valeur trop tôt afficherait l'état d'un utilisateur expiré (cf. P6) »).

**Cause.** Établie, en deux temps. (a) `else` couvre `null` autant qu'`Expired`. (b) `MainScreen.kt:73` appelle `koinViewModel()` sans propriétaire explicite : à l'intérieur d'un `composable{}` de `NavHost`, le `ViewModelStoreOwner` est le `NavBackStackEntry`, pas l'Activity — et `TrialViewModel` est déclaré `viewModel { }` (`core/di/CoreModule.kt:35`), donc **par propriétaire**. L'instance de `MainScreen` est distincte de celle de `IptvNavGraph` : la résolution que l'écran de lancement avait attendue est refaite à zéro en arrivant sur MAIN, synchronisation Play comprise.

**Piste.** Traiter `null` explicitement — n'afficher aucun bandeau tant que l'état n'est pas résolu — et décider si l'instance de `TrialViewModel` doit être partagée avec `IptvNavGraph` plutôt que recréée (ce qui éviterait aussi une seconde synchronisation Play au démarrage).


## #116 — app-mobile/main : lancer un téléchargement autrement que comme un flux direct sans identifiant

`app-mobile/shell`

**Symptôme.** Un film ou un épisode téléchargé, lancé depuis l'onglet « Téléchargements », recommence toujours à zéro : sa position n'est jamais enregistrée et il n'apparaît jamais dans « Reprendre la lecture ». Il est de plus déclaré au lecteur comme du direct, avec une jaquette vide.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/main/MainScreen.kt:219 — `DownloadsScreen(onPlay = { url, title -> onPlayChannel(url, title, "", 0) })`, et `NavGraph.kt:98` où `onPlayChannel` construit la route avec `type = "live"`. `DownloadsScreen` n'expose d'ailleurs que `(url, title)` (`ui/downloads/DownloadsScreen.kt:35`) alors que le `DownloadItem` porte son identifiant, sa série et sa saison.

**Cause.** Établie. `mediaId` vide ⇒ `PlayerScreen.kt:98-99` n'appelle pas `getSavedProgress` et passe `null` à `playMedia` ; `PlayerViewModel.saveProgressNow()` (`core/.../PlayerViewModel.kt:292`) sort immédiatement sur `currentMediaId ?: return`. Le `type = "live"` est en outre stocké tel quel dans l'entrée de progression (`PlayerViewModel.kt:304`).

**Piste.** Élargir le rappel de `DownloadsScreen` pour qu'il remonte l'identifiant de média, le type réel (`movie`/`series`) et la jaquette, et router par `onPlayMovie` ou un rappel dédié plutôt que par `onPlayChannel`. Jumeau exact du ticket #23 côté app-tv : traiter les deux avec le même format d'identifiant (cf. #11).


## #117 — app-mobile/main : appliquer l'encoche de barre d'état hors du bandeau, sinon l'acheteur définitif l'a sur la tête

`app-mobile/shell`

**Symptôme.** Pour un utilisateur `Pro` (achat définitif), et pour lui seul, la barre supérieure de 56 dp est dessinée sous la barre d'état : le logo, le titre « PURPLE IPTV », le bouton de cast et l'engrenage passent sous l'heure, la batterie et l'encoche.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/main/MainScreen.kt:101-105 — `is AccessState.Pro -> Unit` ne compose rien. Les deux seuls `statusBarsPadding()` de l'écran sont **à l'intérieur** des bandeaux (lignes 111 et 151) ; la `Column` racine (ligne 94) et `TopBar` (ligne 259) n'en portent aucun. L'activité est en bord-à-bord : `MainActivity.kt:32` appelle `enableEdgeToEdge()`.

**Cause.** L'encoche est absorbée par un élément optionnel. Dès qu'aucun bandeau n'est composé, plus personne ne la consomme.

**Piste.** Porter l'encoche sur un élément toujours présent (la `Column` racine ou `TopBar`) et la retirer des deux bandeaux, pour qu'elle ne dépende plus de l'état d'accès.


## #118 — app-mobile/common : ImmersiveFullScreen restaure un régime d'encoches que l'application n'utilise pas

`app-mobile/shell`

**Symptôme.** À confirmer à l'écran. Après une première visite du lecteur — ou après chaque aller-retour en PiP, puisque `enabled` bascule — la fenêtre ne vit plus dans le même régime d'encoches qu'au démarrage pour le reste du processus. Attendu : un décalage de mise en page en haut et en bas des écrans qui posent eux-mêmes `statusBarsPadding()`/`navigationBarsPadding()` (bandeau de MainScreen, barre d'onglets), soit une marge doublée, soit une marge disparue selon ce que le système redispatche.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/common/ScreenMode.kt:68 — `onDispose` pose `WindowCompat.setDecorFitsSystemWindows(window, true)`, une constante, sans avoir lu la valeur d'entrée. Or `MainActivity.kt:32` appelle `enableEdgeToEdge()`, qui pose précisément l'inverse (`false`). Le composable est utilisé par le lecteur (`ui/player/PlayerScreen.kt:111`, `enabled = !isInPip`).

**Cause.** La restauration écrit une valeur supposée au lieu de rendre celle qui était en place. Le sens exact du décalage visible dépend de la façon dont les encoches sont redispatchées à la vue Compose sous `decorFitsSystemWindows = true`, ce qui n'est pas établi par lecture.

**Piste.** Mémoriser l'état à l'entrée du `DisposableEffect` et le rendre tel quel à la sortie, plutôt que de forcer `true` ; ou n'agir que sur le contrôleur d'encoches (`hide`/`show`) sans toucher au régime de la fenêtre.


## #119 — app-mobile/navigation : ne pas renvoyer sur l'écran principal un acheteur qui n'a pas d'identifiants

`app-mobile/shell`

**Symptôme.** Un utilisateur sans identifiants dont l'essai est expiré (installé puis rouvert après trois jours, ou déconnecté puis relancé) est envoyé sur la barrière d'achat ; il paie, et retombe sur l'écran principal sans compte configuré. Chaque onglet affiche alors l'erreur brute « No credentials configured » (`core/.../IptvRepository.kt:60`), ou — si le cache catalogue de 24 h n'est pas encore expiré — le catalogue du compte précédent. Le seul chemin vers l'écran de connexion est Paramètres → « Se déconnecter ».

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/navigation/NavGraph.kt:78-82 — l'ordre du `when` donne la priorité à `access == false` sur `creds == null` ; ligne 116, `onSuccess` de l'écran d'achat navigue inconditionnellement vers `Routes.MAIN` en vidant la pile.

**Cause.** Établie : la destination de succès est écrite en dur, alors que la condition qui avait mené à la barrière n'est pas la seule à trancher où aller ensuite.

**Piste.** Après un achat, refaire le même arbitrage que l'écran de lancement (identifiants présents ? MAIN : SETUP) plutôt que de viser MAIN. Le jumeau TV a la même règle (`app-tv/.../TvNavGraph.kt:60-67` et son `onSuccess`) : décision à faire porter par un seul endroit.


## #59 — app-tv/home : cesser de re-normaliser le nom de genre, la clé de favori diverge de celle du mobile

`app-tv/home`

**Symptôme.** le magasin de favoris est partagé (FavoritesRepository, un seul `liveGenreFavorites`). Pour une catégorie contenant un caractère retiré par `cleanLabel` mais conservé par `cleanCat` (`:` `#` `*` `,` `!` `_` `·` — « FR: SPORT », « ## FRANCE ## »), (1) un thème mis en favori sur mobile n'apparaît **pas** allumé sur la TV, (2) l'allumer sur la TV crée une **seconde** entrée nettoyée, (3) dans « Ma liste » du mobile cette entrée s'affiche « 0 chaînes » (MyListScreen.kt:112-118, comptage par `it.group.trim().lowercase()`) et l'ouvrir donne une liste vide (HomeScreen.kt:69, `group.equals(selectedGenre, ignoreCase = true)`), (4) le favori posé depuis le mobile n'est **retirable** depuis la TV par aucun geste, puisque son étoile n'y est jamais allumée.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:77 — `cleanLabel()` retire tout ce qui n'est pas `[\p{L}\p{N}\s|\-+.&'()/]` ; ligne 135 le libellé nettoyé devient la clé (`map { cleanLabel(it.key) to it.value }`), lue ligne 266 (`genreFavs.contains(genre)`) et **écrite** ligne 272 (`vm.toggleLiveGenreFavorite(genre)`). Or le mobile écrit le groupe brut (app-mobile/.../ui/home/HomeScreen.kt:89-90 `items.first().group` puis :182 `toggleLiveGenreFavorite(genre)`), et l'onglet Films de la TV aussi (app-tv/.../ui/movies/TvMoviesScreen.kt:303 `groupBy { it.group!!.trim() }`, :362). `TvHomeScreen` est le seul écrivain à nettoyer.

**Cause.** établie — la normalisation du libellé de catégorie existe déjà dans `core` (`XtreamApiClient.cleanCat`, core/.../network/XtreamApiClient.kt:139, appliquée à la source par IptvRepository.kt:68) ; `TvHomeScreen` en applique une **seconde**, au critère différent, du côté UI. La clé de persistance devient donc dépendante de l'écran qui l'écrit (motif §8.2).

**Piste.** une seule normalisation, portée par `core`, et la même valeur servant à l'affichage **et** à la clé de favori dans les deux UI ; à défaut, aligner `TvHomeScreen` sur `TvMoviesScreen` et le mobile (clé = `channel.group` trimé). Prévoir la migration des entrées déjà écrites nettoyées.


## #60 — app-tv/home : normaliser le libellé de genre avant le regroupement, pas après

`app-tv/home`

**Symptôme.** (a) deux catégories distinctes du fournisseur qui ne diffèrent que par un caractère retiré (« ## FR ## » et « ** FR ** », « FR: SPORT » et « FR SPORT ») produisent **deux lignes identiques** — l'affichage passe en majuscules ligne 497, rien ne les distingue — chacune ne portant qu'une partie des chaînes ; valider la seconde affiche les chaînes de la **première** (le `find` s'arrête au premier), donc les chaînes de la seconde sont inatteignables en navigation ; les deux lignes portent en outre la même clé de `LazyColumn`. (b) une catégorie entièrement composée de caractères retirés (« ### », « *** ») disparaît de la liste des genres avec **toutes ses chaînes**, alors que l'en-tête continue de les compter (ligne 187, `allChannels.size`). Le mobile, lui, fusionne les variantes de casse et n'en perd aucune (HomeScreen.kt:87-89).

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:130-137 — `groupBy { (it.group ?: "Autres").trim() }` groupe sur la valeur **brute**, puis `.map { cleanLabel(it.key) to it.value }` remplace la clé par le libellé nettoyé et `.filter { it.first.isNotBlank() }` jette ce qui devient vide ; ligne 244 la sélection se fait par ce libellé (`grouped.find { it.first == currentGenre }`), ligne 261 il sert aussi de clé de `LazyColumn` (`items(grouped, key = { it.first })`).

**Cause.** établie — le nettoyage est appliqué **après** `groupBy`, donc deux clés brutes distinctes peuvent produire le même libellé sans que les deux listes de chaînes soient fusionnées, et un libellé vide n'a aucun repli.

**Piste.** nettoyer d'abord, grouper ensuite sur la valeur nettoyée (fusion réelle, clé unique), et conserver un repli non vide au lieu d'écarter le groupe ; en sortant ce calcul du composable il devient couvrable par un test JVM, ce qu'il n'est pas aujourd'hui.


## #61 — app-tv/home : rendre au bouton « Retour » de l'en-tête un effet, ou le retirer — il ne fait que perdre le focus

`app-tv/home`

**Symptôme.** appuyer sur OK sur « Retour » ne change **rien** à l'écran : la liste de droite reste la même, la ligne de genre reste marquée. Le seul effet est que le bouton se retire lui-même de la composition alors qu'il détient le focus — l'utilisateur se retrouve sans focus visible et le rail de gauche le récupère. Le `BackHandler` ligne 108-111 présente la même perte de focus quand il vide `searchQuery` alors que le focus est sur un résultat : la liste des résultats quitte la composition sous le focus.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:156-158 — le bouton n'existe que `if (selectedGroup != null)` et son `onClick` fait `selectedGroup = null`. Mais depuis G15 le panneau droit se résout ligne 238-242 par `TvGenrePreview.resolve(selected, previewed, first)` (TvFocusKit.kt:226 : `selected ?: previewed ?: first`), et `previewGenre` vaut déjà ce même genre — il a été posé ligne 100-104 quand le genre a pris le focus, avant d'être validé. `isSelected` ligne 265 se compare à `currentGenre`, pas à `selectedGroup`.

**Cause.** établie pour l'inertie (le repli sur `previewGenre` rend `selectedGroup = null` invisible) ; pour la dérive du focus, c'est le mécanisme de « réattribution » décrit en TvFocusKit.kt:41-47, et `TvHomeScreen` est le seul écran de contenu d'`app-tv` à n'utiliser aucun `TvFocusAnchor` (présent dans TvMoviesScreen.kt:98, TvSeriesScreen.kt:103, TvMainScreen.kt:611).

**Piste.** décider ce que « Retour » doit faire dans une disposition à deux panneaux — remettre le focus sur la liste des genres est le seul geste qui ait encore un sens — et, avant de retirer un nœud focalisé (bouton, liste de résultats), placer le focus délibérément. Ne pas supprimer le bouton sans vérifier ce qu'il portait (§8.6).


## #36 — app-tv/movies : afficher l'erreur de chargement de la fiche film au lieu d'un spinner sans fin

`app-tv/movies`

**Symptôme.** ouvrir un film alors que le fournisseur ne répond pas affiche une roue qui tourne indéfiniment ; aucun message, aucune indication d'échec. RETOUR sort (le `BackHandler` de la ligne 590 est actif), mais rien ne dit à l'utilisateur que le chargement a échoué ni qu'il peut réessayer.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:164 — `val detail = (detailState as? ContentState.Success)?.data` écrase `ContentState.Error` en `null` ; la signature du composable (TvMoviesScreen.kt:577, `detail: MovieDetail?`) ne peut plus porter l'erreur, et TvMoviesScreen.kt:605-609 rend un `CircularProgressIndicator` pour tout `null`. `ContentViewModel.kt:130` émet bien `ContentState.Error` quand `fetchMovieDetail` lève (réseau coupé, ou `first { it.id == id }` sur une source M3U).

**Cause.** établie — la fiche film prend un `MovieDetail?` là où ses deux jumelles prennent l'état complet : `TvSeriesDetailPage` reçoit `detailState: ContentState<SeriesDetail>?` et rend `ds.message` (TvSeriesScreen.kt:617 et 658), et le mobile fait de même (MovieDetailScreen.kt:66). La fiche film TV est la seule des trois à aplatir l'état, et c'est sa signature qui l'impose à ses deux appelants.

**Piste.** faire porter `ContentState<MovieDetail>?` par `TvMovieDetailPage` et traiter les trois branches comme `TvSeriesDetailPage`, plutôt que de rattraper l'erreur chez chaque appelant — sinon la décision sera écrite deux fois de plus.


## #37 — app-tv/movies : libérer l'ancre de focus même quand l'affiche d'origine n'est plus composée

`app-tv/movies`

**Symptôme.** parcourir une rangée vers la droite (ou descendre dans la grille de résultats), ouvrir un film, l'ajouter à « Ma liste », fermer. Le film remonte en tête de sa rangée — hors de la fenêtre visible, dont la position de défilement est conservée. Plus rien n'a le focus au retour, et jusqu'à la prochaine fermeture de fiche réussie l'onglet Films entre de nouveau par la barre de recherche (le défaut G6) au lieu de la première affiche.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:366-368 — chaque rangée est triée `sortedByDescending { movieFavorites.contains(it.id.toString()) }` (idem pour la grille, ligne 210) ; TvMoviesScreen.kt:752-758 — la fiche porte le bouton « + Ma liste » ; TvMoviesScreen.kt:174 — la fermeture appelle `anchor.restore()`, qui pose `pending`. Or `Modifier.focusAnchor` (common/TvFocusKit.kt:114-122) ne consomme `pending` que depuis un `LaunchedEffect` porté par le nœud de l'affiche : un nœud non composé n'exécute rien, et `pending` reste posé. TvMoviesScreen.kt:227 et 417 désactivent alors le point d'entrée de l'onglet, qui est explicitement conditionné à `anchor.pending == null`.

**Cause.** établie par lecture — l'ancre suppose que l'affiche d'origine est encore composée. Le hissage des `LazyListState` (TvMoviesScreen.kt:108-113) traite le cas « la liste a été recréée », pas le cas « l'élément a changé de place » : c'est précisément l'action offerte par la fiche qui réordonne la liste sous elle. La limite est documentée en tête de `focusAnchor` mais sa parade ne couvre pas ce cas.

**Piste.** donner à `TvFocusAnchor` une sortie de secours — libérer `pending` s'il n'a pas été consommé après quelques frames, et/ou faire retomber la restauration sur le point d'entrée du groupe. La machine à états de `TvFocusAnchor` étant pure, cette sortie est couvrable par un test JVM ; la reproduction, elle, demande l'émulateur.


## #76 — app-tv/navigation : purger l'état conservé de « Main » à la déconnexion

`app-tv/navigation`

**Symptôme.** l'utilisateur se déconnecte, se reconnecte avec d'autres identifiants, et l'application rouvre exactement l'écran du compte précédent : même onglet sélectionné, même recherche en cours, même genre ouvert, même fiche film/série dépliée. Si la fiche restaurée porte un identifiant absent du nouveau catalogue, elle reste sur un chargement sans fin (cf. ticket #36).

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/navigation/TvNavGraph.kt:57 crée `rememberSaveableStateHolder()`, :98 y enregistre `SaveableStateProvider("main")`, et le `onSignOut` de :102-107 se contente de `credRepo.clear()` puis `currentScreen = TvScreen.Setup` — `navStateHolder.removeState("main")` n'est jamais appelé.

**Cause.** le porteur d'état est délibérément hissé au-dessus du `when` pour survivre au passage dans le lecteur (commentaire :47-56), mais rien ne distingue « je reviens du lecteur » de « je change de compte ». Le jumeau mobile n'a pas le défaut parce que sa navigation détruit la pile : `app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/navigation/NavGraph.kt:103` fait `navigate(Routes.SETUP) { popUpTo(0) { inclusive = true } }`.

**Piste.** sur la voie de déconnexion uniquement, retirer l'entrée `"main"` du `SaveableStateHolder` avant de basculer sur `TvScreen.Setup` — la conservation d'état doit rester acquise pour le trajet Main ↔ Player ↔ Purchase.


## #77 — app-tv/common : retirer aussi les flèches de réordonnancement du parcours D-pad, comme l'étoile

`app-tv/navigation`

**Symptôme.** dans « Ma liste » filtrée sur les chaînes (`ui/mylist/TvMyListScreen.kt:304-311`, seul appelant à passer `onMoveUp`/`onMoveDown`), atteindre l'étoile depuis la ligne coûte trois appuis `▶` (ligne → ▲ → ▼ → ★) au lieu d'un, et les deux flèches restent à pleine opacité sur toutes les lignes alors que l'étoile s'efface. Le commentaire G11 de :49-51 note en outre que « chaque traversée verticale facturait l'étoile au passage » : si la recherche verticale attrape bien ces colonnes latérales, elle attrape aussi les flèches, et descendre la liste peut poser le focus sur un bouton qui **mute** l'ordre des favoris au premier `OK`.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/common/TvChannelRow.kt:118-123 pose `ArrowButton("▲", onMoveUp)` et `ArrowButton("▼", onMoveDown)` sans aucun garde de focus, alors que l'étoile juste en dessous (:129-131) porte `.alpha(if (rowHasFocus) 1f else 0.35f).focusProperties { canFocus = rowHasFocus }`.

**Cause.** le correctif G11 (`rowHasFocus`) n'a été appliqué qu'à la surface de l'étoile ; les deux flèches, ajoutées pour la même colonne d'actions, n'ont pas été incluses.

**Piste.** appliquer le même garde `rowHasFocus` (alpha + `canFocus`) aux deux `ArrowButton`, en gardant le raisonnement de :56-58 — `hasFocus` du groupe, pas `isFocused`, sinon la flèche se retire du parcours au moment où le focus l'atteint. Le nombre exact d'appuis et l'éventuelle dérive verticale vers la colonne des flèches se mesurent à l'AVD `purple_tv`.


## #70 — app-tv/purchase : ne pas écraser le succès d'une restauration par l'état Idle, la barrière ne se lève jamais

`app-tv/purchase`

**Symptôme.** un abonné payant dont le droit local n'a pas été resynchronisé (§32) tombe sur la barrière d'accès expiré, appuie sur « Restaurer mes achats » ; l'accès est bel et bien rendu côté `TrialRepository`, mais l'écran reste sur la barrière et affiche « Aucune offre disponible ». Aucune sortie : il faut tuer et relancer l'application. L'issue est en outre **intermittente** — si une frame de recomposition tombe pendant la fenêtre entre les deux écritures d'état, `onSuccess()` part et l'écran se ferme normalement ; sinon non.

**Preuve.** app-tv/.../purchase/TvPurchaseScreen.kt:62-64 — `LaunchedEffect(state)` n'appelle `onSuccess()` que sur `PurchaseScreenState.PurchaseSuccess` : c'est la **seule** sortie de l'écran quand `onBack == null` (barrière). Le bouton qui déclenche la restauration est en :130-133 (`vm.restorePurchases()`). Côté core, `PurchaseViewModel.kt:98-109` pose `Purchasing`, appelle `billingRepo.restorePurchases()` — qui, via `BillingRepository.syncEntitlements()` (BillingRepository.kt:224-226), délivre le produit **et** émet `PurchaseResult.Success` → le collecteur `observePurchaseResults` (PurchaseViewModel.kt:117-121) pose `PurchaseSuccess` — puis, au retour de l'appel, la ligne `_state.value = when { … else -> Idle }` (PurchaseViewModel.kt:105-109) **réécrit** cet état en `Idle`.

**Cause.** établie : `restorePurchases()` traite « nombre d'achats restaurés » et « résultat d'achat » comme deux canaux indépendants, et le second est écrasé par le premier. `PurchaseSuccess` est une valeur transitoire d'un `StateFlow`, donc conflée : rien ne garantit qu'un collecteur la voie. Le commentaire d'en-tête de l'écran (TvPurchaseScreen.kt:47-49) énonce pourtant l'invariant que ce chemin viole : « un abonné dont le droit n'a pas été resynchronisé doit pouvoir se débloquer sans repasser à la caisse ».

**Piste.** faire de la restauration réussie un état **terminal** au lieu d'un retour numérique écrasé — soit ne pas réécrire `_state` quand le collecteur a déjà posé `PurchaseSuccess`, soit renvoyer le `productId` restauré et poser `PurchaseSuccess` explicitement. À distinguer du ticket #47, qui traite l'absence de tout résultat ; ici le résultat arrive et est détruit.


## #71 — app-tv/purchase : offrir « Restaurer mes achats » aussi quand les offres se chargent, pas seulement quand elles échouent

`app-tv/purchase`

**Symptôme.** cas normal, Play répond et renvoie les trois offres : un abonné dont le droit n'a pas été resynchronisé voit la barrière avec Mensuel / Annuel / À vie, et **aucun** moyen de restaurer — le seul geste possible est de repayer. La restauration n'est proposée que lorsque la facturation est en panne, c'est-à-dire précisément quand elle a le moins de chances d'aboutir.

**Preuve.** app-tv/.../purchase/TvPurchaseScreen.kt:114-134 — le bouton « Restaurer mes achats » (:130-133) n'est composé que dans la branche `products.isEmpty()`. La branche nominale :136-143 ne rend que les cartes d'offre, et `onBack` est `null` sur la barrière (:99).

**Cause.** établie : le repli a été conçu comme filet anti-écran-mort (« sans lui, une barrière sans offre n'aurait plus aucun focalisable », :112-113) et non comme la fonction qu'il porte réellement. Il a donc hérité de la condition d'affichage du filet.

**Piste.** sortir « Restaurer mes achats » du `when` et le rendre dans les deux branches (sous les cartes sur la branche nominale). Vérifier au passage `TvPurchaseAccess.focusableCount` (TvNavPolicy.kt:213-223), dont le décompte encode l'ancienne règle et cesserait d'être vrai. Note : `app-mobile` n'expose ce bouton **nulle part** — même défaut, en pire.


## #72 — app-tv/purchase : réinitialiser l'état d'achat à l'entrée, sinon l'écran se referme aussitôt sur un succès hérité

`app-tv/purchase`

**Symptôme.** après un achat réussi, l'écran se ferme (normal). Le badge du rail (`RailPremiumBadge` / `RailTrialBadge`, TvMainScreen.kt:297 et :306, `onClick = onPurchase`) reste affiché pour un abonné mensuel ou annuel. En le rouvrant, `state` vaut encore `PurchaseSuccess` : le `LaunchedEffect` part dès la première composition, `onSuccess()` renvoie sur `Main` — le badge paraît inerte, et l'écran d'achat devient inatteignable pour toute la durée du processus. Un abonné mensuel ne peut plus passer à l'offre à vie.

**Preuve.** app-tv/.../purchase/TvPurchaseScreen.kt:53 (`koinViewModel()`) et :62-64. `TvNavGraph` ne repose sur aucun back-stack de navigation-compose (`when (screen)`, TvNavGraph.kt:88-116) : le `ViewModelStoreOwner` est l'Activity, donc `PurchaseViewModel` **survit** à la fermeture de l'écran. `PurchaseViewModel.resetState()` (PurchaseViewModel.kt:112) existe et n'est appelé par personne (seul celui de `SetupViewModel` l'est, TvSetupScreen.kt:151).

**Cause.** établie : état terminal conservé dans un ViewModel à portée d'Activity, jamais remis à zéro à l'entrée de l'écran. Même famille que le ticket #66 (`SetupState.Success` hérité), sur un autre écran.

**Piste.** consommer l'état terminal — remettre à `Idle` à l'entrée de l'écran, ou n'agir que sur une transition vers `PurchaseSuccess` plutôt que sur sa valeur. Un `LaunchedEffect(Unit) { vm.resetState() }` naïf entrerait en course avec le collecteur d'achats : à traiter côté ViewModel.


## #73 — app-tv/purchase : afficher l'échec d'un achat, aujourd'hui invisible dès que des offres sont présentes

`app-tv/purchase`

**Symptôme.** l'utilisateur choisit une formule, voit le voile « Paiement en cours… » (:148-156), le voile disparaît — et il ne se passe rien. Aucun message, aucune trace de l'échec. Sur la barrière, il reste bloqué sans savoir pourquoi. Play ayant fourni un message déjà localisé (`err.message`), l'information existe et est jetée.

**Preuve.** app-tv/.../purchase/TvPurchaseScreen.kt:116-122 — `state as? PurchaseScreenState.PurchaseError` n'est lu que dans la branche `products.isEmpty()`. La branche :136-143 ne rend que les cartes. Or `PurchaseViewModel.kt:122-125` pose `PurchaseError(message = result.message)` sur **tout** échec Play (`BillingRepository.kt:47, 80, 112, 146, 151` : service indisponible, offre indisponible, `describe(result)`), donc dans le cas nominal où les offres sont affichées.

**Cause.** établie : la présentation de l'erreur a été câblée sur la branche « pas d'offre » (celle qui l'a motivée, §43) au lieu d'être portée par l'écran. `app-mobile/PurchaseScreen.kt:81-94` a exactement le même trou — décision manquante des deux côtés, pas une divergence.

**Piste.** sortir le rendu de `PurchaseError` du `when` sur les offres et le placer au niveau de l'écran (bandeau ou texte sous les cartes), en gardant l'ordre `message` (Play, localisé) puis `reason.labelRes()` déjà écrit en :117-120.


## #74 — app-tv/purchase : sortir en ressources les libellés de formule, restés en anglais alors que le mobile les a déjà traduits

`app-tv/purchase`

**Symptôme.** sur un téléviseur en français, le reste de l'écran est traduit (`purchase_premium`, `purchase_pitch`, `purchase_blocked_hint` sont bien en `values-fr`) et les trois cartes affichent « Monthly … / month », « Yearly … / year — SAVE 58% », « Lifetime … one-time — BEST DEAL ». C'est le seul écran de l'application où l'on demande de l'argent.

**Preuve.** app-tv/.../purchase/TvPurchaseScreen.kt:179-195 — `"Monthly"`, `"Yearly"`, `"Lifetime"`, `"/ month"`, `"/ year"`, `"one-time"`, `"SAVE 58%"`, `"BEST DEAL"` écrits en dur. Le mobile a déjà externalisé la période et le badge : `app-mobile/.../purchase/PurchaseScreen.kt:152-160` lit `R.string.period_month` / `period_year` / `period_onetime` / `badge_best_deal`, présents dans `app-mobile/src/main/res/values/strings.xml:86-89` **et** `values-fr/strings.xml:86-89` (« / mois », « / an », « paiement unique », « MEILLEURE OFFRE »). Aucune de ces clés n'existe dans `app-tv/src/main/res/`.

**Cause.** établie pour la survie du défaut : `tools/check_strings.py` (`check_literals`) ne détecte que la forme `label = "…"` / `title = "…"` en **paramètre nommé**. Ici les libellés sont affectés à des `val` locaux puis passés positionnellement à `Text(...)` : le garde-fou du §48 ne peut structurellement pas les voir.

**Piste.** créer les clés manquantes dans `app-tv` en réutilisant celles du mobile. La table `productId → titre / période / badge` est par ailleurs écrite deux fois à l'identique (TvPurchaseScreen.kt:179-195 vs PurchaseScreen.kt:146-162), y compris la remise commerciale « 58 % » : c'est une décision produit, pas une décision d'affichage — la faire porter par `core` sous forme typée, chaque UI n'en tirant que sa ressource (§8.2).


## #50 — app-tv/series : reprendre un épisode à la position enregistrée au lieu de le relancer à zéro

`app-tv/series`

**Symptôme.** on regarde 40 min d'un épisode, on sort, on rouvre la fiche et on relance le même épisode : la lecture repart à 00:00. La position avait pourtant bien été enregistrée — la pastille « vu » de la ligne, elle, la lit correctement (TvSeriesScreen.kt:1056). La carte « REPRENDRE LA LECTURE » d'une série mène à la fiche (TvSeriesScreen.kt:318-321), donc le seul chemin de reprise d'une série se termine lui aussi à zéro.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:903-904 — la ligne d'épisode appelle `onPlayEpisodes(...)` puis `onPlay("", "", "", "")`, c'est-à-dire une URL **et un `mediaId` vides**

**Cause.** établie. Le `mediaId` vide est délibéré (il évite que le lecteur relance le média que `playWithEpisodes` vient de poser), mais c'est aussi le seul porteur de la reprise : `TvPlayerScreen.kt:138-139` ne lit `vm.getSavedProgress(mediaId)` que `if (url.isNotEmpty())`. Et le chemin liste ne compense pas : `PlayerViewModel.playWithEpisodes` (core/viewmodel/PlayerViewModel.kt:79-96) ne consulte jamais `ProgressRepository` et `PlayerService.playPlaylist` démarre en `C.TIME_UNSET` (core/player/PlayerService.kt:300). Le seul `seekTo` automatique du projet est celui de `playMedia` (PlayerViewModel.kt:63), qui n'est pas emprunté ici. L'écriture de la progression par épisode a été corrigée (§ « Reprise de lecture » du journal), sa **relecture** n'a jamais été branchée pour les séries.

**Piste.** faire porter la reprise par le chemin liste plutôt que par le `mediaId` du lecteur — `playWithEpisodes` connaît déjà `seriesId` et l'épisode de départ, donc l'identifiant de progression : il peut demander la position et la poser au démarrage, comme `playMedia` le fait. La décision est identique côté mobile (app-mobile/.../seriesdetail/SeriesDetailScreen.kt:326-327) : la corriger dans `core` la corrige pour les deux UI.


## #51 — app-tv/series : cesser de lancer le flux distant d'un épisode que l'on va lire depuis le disque

`app-tv/series`

**Symptôme.** lancer un épisode téléchargé démarre d'abord la lecture réseau de ce même épisode pendant une fraction de seconde, avant que le fichier local ne prenne la place. Sur un appareil hors ligne — le cas pour lequel le téléchargement existe — cette première lecture ne peut qu'échouer. Et l'enchaînement automatique vers l'épisode suivant, que ce premier appel est manifestement là pour installer, n'a en réalité jamais lieu depuis un épisode téléchargé.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:922-927 — `onPlayLocal` appelle `onPlayEpisodes(episodes, …)` **puis** `onPlay("file://$it", …)`

**Cause.** établie. `onPlayEpisodes` → `playWithEpisodes` pose la liste distante et démarre le lecteur (`playPlaylist`, PlayerService.kt:295-302). L'appel suivant navigue vers le lecteur avec une URL **non vide**, donc `TvPlayerScreen.kt:140` appelle `vm.playMedia(...)`, qui remet `episodes = emptyList()`, `episodesSeriesId = null` et annule `transitionJob` (core/viewmodel/PlayerViewModel.kt:48-51). Tout ce que le premier appel avait installé est défait ; il ne reste que son effet de bord réseau.

**Piste.** choisir un seul des deux chemins pour la lecture locale. Si l'on veut l'enchaînement automatique sur les épisodes téléchargés, il faut que le contexte de liste survive à `playMedia` — c'est une décision de `core`, pas de l'écran. Même code au mot près dans app-mobile/.../seriesdetail/SeriesDetailScreen.kt:346-349.


## #52 — app-tv/series : ne pas annoncer une saison « Téléchargé » quand elle vient seulement d'entrer en file

`app-tv/series`

**Symptôme.** on appuie sur « Télécharger la saison » ; dans la seconde qui suit, le bouton devient « Téléchargé » (`R.string.download_done`, TvSeriesScreen.kt:832), prend l'icône `CheckCircle` et se désactive — alors qu'aucun octet n'est encore sur le disque. Le compteur intermédiaire « (3/12) » (ligne 835) surestime de la même façon. L'utilisateur qui quitte l'app sur cette annonce croit disposer de la saison hors ligne.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:820-828 — `doneCount` compte comme faits les statuts `COMPLETED`, `DOWNLOADING` **et** `QUEUED`, puis `allDone = doneCount == eps.size`

**Cause.** établie. La condition de la ligne 822-826 mélange « obtenu » et « demandé ». Un statut `FAILED`, lui, n'est pas compté : le bouton se réactive alors avec un libellé cohérent, ce qui montre que seul le regroupement QUEUED/DOWNLOADING avec COMPLETED est en cause.

**Piste.** séparer les deux comptes — ce qui est sur le disque (`COMPLETED`) décide du libellé « Téléchargé », ce qui est en cours ou en attente appelle un libellé d'état distinct. `enqueueAll` sait déjà ignorer les épisodes déjà présents (core/data/DownloadRepository.kt:63-73), le bouton n'a donc pas besoin d'être désactivé pour protéger la file.


## #53 — app-tv/series : conserver la saison choisie au retour du lecteur

`app-tv/series`

**Symptôme.** on ouvre la saison 12, on lance un épisode, on quitte le lecteur : la fiche rouvre sur la saison 1 et il faut retraverser les onglets de saison. Sur les séries à 37 saisons déjà relevées dans ce projet, c'est une dizaine d'appuis à refaire à chaque aller-retour. Même perte à chaque passage par `Loading` : la branche `Success` sort de la composition et l'état repart de zéro.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:666 — `var selectedSeason by remember { mutableStateOf(sortedSeasons.firstOrNull()) }`, un `remember` simple, placé **à l'intérieur** de la branche `is ContentState.Success`

**Cause.** établie. `TvNavGraph` remplace `TvScreen.Main` par `TvScreen.Player` (app-tv/.../navigation/TvNavGraph.kt:127) : toute la composition de l'écran série est détruite. `selectedSeriesId`, `selectedGenre` et `searchQuery` survivent parce qu'ils sont `rememberSaveable` (lignes 96-99) ; `selectedSeason`, non. Le fichier documente déjà ce piège pour un autre état — `firstEpisodeReady` est hissé au-dessus du `when (detailState)` exactement pour cette raison (lignes 632-642) — mais `selectedSeason` est resté dedans.

**Piste.** hisser l'état de saison au-dessus du `when (detailState)` comme `firstEpisodeReady`, et le rendre persistant en le clefant sur `seriesId`. Attention au fait qu'un `rememberSaveable` posé dans une branche absente au moment de la sauvegarde n'enregistre rien : c'est précisément ce que le hissage règle.


## #67 — app-tv : rendre atteignable au D-pad la bascule d'affichage du mot de passe

`app-tv/setup`

**Symptôme.** sur l'écran « Identifiants », l'œil qui révèle le mot de passe ne peut jamais recevoir le focus : au repos, ▶ depuis le champ ne va nulle part ; en saisie, le clavier virtuel Leanback avale la direction. Un mot de passe saisi à la télécommande ne peut donc pas être relu — c'est le même défaut que la croix d'effacement de la recherche (ticket #62), sur un autre écran.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/setup/TvSetupScreen.kt:186-191 — le `trailingIcon` est un `TvIconToggle` `focusable()` (ligne 465) placé **à l'intérieur** de la `Row` du champ, laquelle est elle-même une cible de focus par `.clickable { editing = true }` (ligne 414) et porte 14 dp de padding (ligne 415).

**Cause.** §8.17 — la recherche directionnelle de Compose n'accepte un candidat que s'il **dépasse** le rectangle focalisé du côté visé. Quand la `Row` entière porte le focus, l'œil est strictement inclus dans ce rectangle (padding), donc jamais candidat, dans aucune direction ; et depuis un champ voisin, la collecte s'arrête à la première cible de focus rencontrée — la `Row` — sans descendre jusqu'à l'œil. Le seul état où il est joignable (`editing = true`, focus sur le `BasicTextField`, dont l'œil dépasse à droite) est précisément celui où l'IME consomme les directions (§8.12, §22, §26).

**Piste.** sortir la bascule de la cible de focus qui l'englobe, ou lui donner une entrée explicite — par exemple la traiter comme une action du champ (une touche dédiée pendant l'édition) plutôt que comme un focalisable imbriqué. Le mobile n'a pas le problème : `SetupScreen.kt:193` s'appuie sur un `clickable` tactile. À vérifier à l'écran, la mesure étant le nombre d'appuis pour atteindre l'œil, jamais un raisonnement seul.


## #44 — core/viewmodel : reprendre un épisode de série à la position enregistrée, qui est écrite mais jamais relue

`core/viewmodel`

**Symptôme.** sur mobile comme sur TV, une série arrêtée en cours d'épisode reprend systématiquement au début. Depuis « Reprendre la lecture », la carte de série ouvre la fiche (TvSeriesScreen.kt:318-321, SeriesScreen.kt:114-117) et l'épisode relancé repart de zéro, alors que la carte affichait la barre d'avancement. La rangée annonce une reprise que le lecteur ne fait pas.

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/PlayerViewModel.kt:79-96 — `playWithEpisodes()` n'a aucun paramètre de position de départ et n'interroge jamais `progressRepo` ; elle délègue à `playerService.playPlaylist(items, startIndex)`, qui pose `setMediaItems(mediaItems, startIndex, C.TIME_UNSET)` (core/player/PlayerService.kt:300), c'est-à-dire départ à zéro. La position est pourtant bien enregistrée toutes les 10 s sous `EpisodeTitle.progressId(seriesId, ep.id)` (PlayerViewModel.kt:101 et 291-309). Le seul point qui relit une position est `LaunchedEffect(url)` (TvPlayerScreen.kt:139, PlayerScreen.kt:98), et les deux fiches série ouvrent le lecteur avec une URL vide — app-mobile/.../seriesdetail/SeriesDetailScreen.kt:326-327 (`playWithEpisodes(...)` puis `onPlayEpisode("", "", "", "")`), app-tv/.../series/TvSeriesScreen.kt:172-174 et app-tv/.../mylist/TvMyListScreen.kt:169-171 — donc ce chemin ne s'exécute jamais pour un épisode.

**Cause.** établie — les deux voies d'entrée du lecteur sont asymétriques : `playMedia()` accepte un `startPositionMs`, `playWithEpisodes()` non, et c'est la seconde que prend tout épisode.

**Piste.** donner à `playWithEpisodes()` la même capacité de reprise qu'à `playMedia()` — résoudre la position dans `core` à partir de `progressId(seriesId, ep.id)` plutôt que de la faire remonter par un argument de navigation, puisque les deux UI perdent déjà l'information avant d'arriver au lecteur. À corriger **avec** le défaut de fin de lecture ci-dessus : sans règle de « terminé », reprendre les épisodes fera repartir chaque épisode déjà vu à sa dernière seconde.


## #45 — core/viewmodel : cesser de marquer un épisode « vu en entier » quand l'utilisateur appuie sur « Épisode suivant »

`core/viewmodel`

**Symptôme.** à dix minutes d'un épisode de quarante-cinq, l'utilisateur appuie sur « Épisode suivant » ; l'épisode quitté est enregistré à 45/45 et sa position réelle est définitivement écrasée. Il apparaît comme entièrement vu, et l'entrée « Reprendre la lecture » de la série affiche brièvement une barre pleine avant que le tick suivant ne la remplace par l'épisode courant.

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/PlayerViewModel.kt:119-133 — l'observateur ne surveille que `mediaItemIndex` et traite **tout** changement d'index comme une fin d'épisode, puis PlayerViewModel.kt:140-155 (`markPreviousEpisodeWatched`) enregistre `positionMs = lastKnownDurationMs`, c'est-à-dire la durée complète. Or `nextEpisode()` (PlayerViewModel.kt:157-165) produit exactement le même changement d'index via `seekToNextMediaItem()`, et il est câblé à un bouton dans les deux applications : app-tv/.../player/TvPlayerScreen.kt:293, app-mobile/.../player/PlayerScreen.kt:254 et :295, plus la carte de suggestion PlayerScreen.kt:137.

**Cause.** établie — la transition d'index est la seule information utilisée pour décider qu'un épisode est terminé, alors qu'elle recouvre deux événements très différents : la fin réelle de la lecture et le saut demandé par l'utilisateur.

**Piste.** distinguer la fin réelle du saut manuel avant d'écrire la durée — soit en s'appuyant sur l'état publié par `PlayerService` (`ENDED`, aujourd'hui inutilisé), soit en marquant le saut côté `nextEpisode()`/`previousEpisode()`. La décision « cet épisode a-t-il été terminé ? » est pure et doit être extraite pour être couverte, comme `RecentPolicy` l'a été.


## #46 — core/viewmodel : sortir de ContentViewModel et SetupViewModel les textes d'erreur destinés à l'écran

`core/viewmodel`

**Symptôme.** sur une application par ailleurs francophone, l'écran de configuration répond en anglais ; et un catalogue qui ne charge pas affiche à l'utilisateur le message technique d'OkHttp (adresse, port, « timeout ») ou le littéral « Error ».

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/SetupViewModel.kt:31, :37, :45 et :60 portent quatre phrases anglaises écrites en dur (« Invalid M3U URL. Please provide a valid playlist URL. », « All fields are required. », « Please select a file. », « Could not connect to the server. Please check your credentials. ») ; elles sont rendues telles quelles par app-mobile/.../setup/SetupScreen.kt:222 et app-tv/.../setup/TvSetupScreen.kt:212. Même défaut dans core/.../viewmodel/ContentViewModel.kt:50, :86, :130, :159 et :187, où `ContentState.Error(e.message ?: "Error")` transporte le message brut de l'exception, affiché sans traduction en huit points : HomeScreen.kt:98, MoviesScreen.kt:97, SeriesScreen.kt:96, MovieDetailScreen.kt:66, SeriesDetailScreen.kt:74, TvHomeScreen.kt:122, TvMoviesScreen.kt:294, TvSeriesScreen.kt:269.

**Cause.** établie — c'est le défaut déjà corrigé pour l'achat, non appliqué aux deux autres `ViewModel`. Le remède existe dans le même paquet : PurchaseViewModel.kt:16-46 remplace le message par une cause typée (`PurchaseFailure`) que chaque UI traduit, avec en commentaire l'avertissement explicite « Ne jamais y mettre un libellé écrit en dur » — resté sans effet sur ses voisins.

**Piste.** transposer le motif `PurchaseFailure` à `SetupState.Error` et à `ContentState.Error` : une cause typée dans `core`, la traduction dans les `strings.xml` de chaque UI, le message brut du serveur réservé aux cas où il vient déjà localisé. `tools/check_strings.py` ne voit pas ces littéraux, ils sont hors des modules applicatifs.


## #47 — core/viewmodel : donner une sortie à l'écran d'achat quand aucun résultat de facturation n'arrive

`core/viewmodel`

**Symptôme.** l'utilisateur appuie sur une offre, un voile noir à roue d'attente couvre l'écran et n'en repart jamais. Sur TV, cet écran est la barrière d'accès expiré (§52 bis) : l'application devient inutilisable jusqu'à sa fermeture forcée.

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/PurchaseViewModel.kt:93-96 — `purchase()` pose `PurchaseScreenState.Purchasing` puis délègue à `billingRepo.launchBillingFlow()` sans rien attendre ; la seule sortie de cet état est `observePurchaseResults()` (PurchaseViewModel.kt:114-132), qui dépend d'une émission sur `purchaseResult`. Or core/data/BillingRepository.kt:158 ignore le `BillingResult` renvoyé par `billingClient.launchBillingFlow(activity, params)` : lorsqu'il n'est pas `OK` (service déconnecté, `DEVELOPER_ERROR`, fonctionnalité non prise en charge), `PurchasesUpdatedListener` n'est jamais appelé et aucun résultat n'est émis. Les deux UI dessinent alors un voile plein écran sans commande de fermeture : app-mobile/.../purchase/PurchaseScreen.kt:115-124, app-tv/.../purchase/TvPurchaseScreen.kt:148-156.

**Cause.** établie pour le chemin de code ; la fréquence réelle du `BillingResult` non-`OK` reste à mesurer, et §9 rappelle qu'une observation de facturation n'est interprétable que sur une build installée par Play.

**Piste.** `Purchasing` ne doit pas être un état sans issue — soit `launchBillingFlow` remonte son `BillingResult` et le `ViewModel` bascule en `PurchaseError` quand il n'est pas `OK`, soit le `ViewModel` borne l'attente comme `TrialViewModel` borne déjà `syncEntitlements` (TrialViewModel.kt:46). Ne pas se contenter d'ajouter un bouton d'annulation dans les deux UI : la décision se dupliquerait.


# MINEUR

## #110 — app-mobile/catalog : brancher le titre de `ContentHeader`, ou cesser de le calculer

`app-mobile/catalog`

**Symptôme.** les écrans Films et Séries n'affichent aucun titre ; le code laisse croire le contraire, et deux `stringResource` sont résolus à chaque recomposition pour rien.

**Preuve.** app-mobile/.../ui/movies/MoviesScreen.kt:268 — `fun ContentHeader(title: String, query: String, onQuery: (String) -> Unit)` ; le corps (lignes 269-300) ne contient qu'une icône de recherche, un `BasicTextField` et la croix d'effacement : `title` n'est lu nulle part. MoviesScreen.kt:89 et SeriesScreen.kt:88 résolvent pourtant `stringResource(R.string.nav_movies)` / `nav_series` pour le lui passer.

**Cause.** huitième occurrence du motif « déclaré mais jamais branché » relevé au §8.7 du CLAUDE.md.

**Piste.** décider si l'en-tête doit porter un titre (l'onglet est déjà nommé dans la barre du bas) ; s'il ne doit pas, retirer le paramètre et ses deux appelants — sinon un correctif futur croira le titre affiché.


## #111 — app-mobile/catalog : sortir en ressources les cinq libellés en dur, dont trois qui existent déjà traduits

`app-mobile/catalog`

**Symptôme.** en anglais, la vignette « Reprendre la lecture » affiche le badge « Séries » et la section s'intitule « REPRENDRE LA LECTURE ».

**Preuve.** app-mobile/.../ui/home/HomeScreen.kt:332-336 — `when (item.type) { "movie" -> "Films"; "series" -> "Séries"; else -> "Direct TV" }`, alors que `values/strings.xml:20-22` et `values-fr/strings.xml:20-22` définissent déjà `nav_live`/`nav_movies`/`nav_series` avec la traduction anglaise (« Series »). MoviesScreen.kt:106 et SeriesScreen.kt:105 — `SectionHeader("REPRENDRE LA LECTURE")`, sans ressource correspondante (aucune entrée « continue/watching » dans les deux `strings.xml`).

**Cause.** `tools/check_strings.py` ne voit pas ces littéraux — il ne contrôle que ceux passés en argument **nommé** (`label =`, `title =`, `text =`, `name =`), pas un `Text("…")` positionnel ni une branche de `when` ; exécuté à l'instant, il rend 113/113 et 7/7 et ne signale aucun de ces cinq.

**Piste.** réutiliser `nav_live`/`nav_movies`/`nav_series` pour le badge et ajouter une ressource pour la section. La même correspondance type → libellé est réécrite en dur dans `app-tv/.../movies/TvMoviesScreen.kt:969-971` (« FILMS » / « SÉRIES ») : c'est la décision, pas seulement le texte, qui est écrite deux fois — cf. #39 pour le côté TV.


## #112 — app-mobile/catalog : n'écrire qu'une fois la barre de recherche et la pastille de filtre, aujourd'hui recopiées dans HomeScreen

`app-mobile/catalog`

**Symptôme.** aucun aujourd'hui — la divergence est déjà amorcée (la copie de HomeScreen n'a pas le paramètre `title`), et tout correctif porté sur le champ de recherche (action IME, fermeture du clavier, effacement) n'atteindra que deux onglets sur trois.

**Preuve.** app-mobile/.../ui/home/HomeScreen.kt:107-138 reproduit `ContentHeader` (MoviesScreen.kt:268-300) modificateur par modificateur — seule la ressource de l'invite diffère (`search_channels` vs `search_generic`). HomeScreen.kt:141-164 reproduit `ActiveFilterPill` (MoviesScreen.kt:304-327) à l'identique, jusqu'au `spacedBy(6.dp)` et aux trois icônes. Films et Séries importent bien la version partagée (SeriesScreen.kt:34-35).

**Cause.** composants copiés au lieu d'être appelés ; motif §8.2 du CLAUDE.md, appliqué ici à l'intérieur d'app-mobile.

**Piste.** appeler `ContentHeader` et `ActiveFilterPill` depuis HomeScreen en paramétrant l'invite, et les sortir de `ui/movies` vers `ui/common` où vit déjà `ChannelRow`.


## #113 — app-mobile/catalog : afficher un état « aucun résultat » quand la recherche ou le thème ne rend rien

`app-mobile/catalog`

**Symptôme.** une recherche sans correspondance, ou un thème dont tous les titres ont été filtrés, laisse une page entièrement vide sous la barre de recherche — l'utilisateur ne peut pas distinguer « rien ne correspond » de « l'application est cassée ».

**Preuve.** app-mobile/.../ui/home/HomeScreen.kt:166-212 — quand `showThemes` est faux et que `grouped` est vide, la `LazyColumn` n'émet aucun item. Idem MoviesScreen.kt:156-171 et SeriesScreen.kt:158-173 : `items(filtered)` sur une liste vide ne rend rien. Les trois écrans sont dans la branche `else` du `when`, donc en `ContentState.Success`.

**Cause.** aucune branche pour la liste vide ; le cas n'est pas traité, ce n'est pas une régression.

**Piste.** même traitement que celui demandé pour « Ma liste » au ticket #91 — un état vide explicite, distinct du chargement et de l'erreur, et distinguant « catalogue vide » de « aucun résultat pour ce filtre » (la sortie du filtre doit rester à portée).


## #102 — app-mobile/detail : aligner l'affichage du bouton « Télécharger la saison » sur ce qu'il enfile réellement

`app-mobile/detail`

**Symptôme.** une saison entièrement en file d'attente, ou dont des épisodes ont échoué, garde le bouton « Télécharger la saison » affiché ; l'appui ne produit alors strictement rien — pas de reprise des échecs, aucun retour à l'écran. Le seul recours reste la pastille de reprise épisode par épisode (ligne 505).

**Preuve.** SeriesDetailScreen.kt:210 compte comme restant à télécharger tout épisode dont le téléchargement n'est pas `COMPLETED` ; SeriesDetailScreen.kt:227 n'enfile que les épisodes **absents** de `downloads`.

**Cause.** établie — deux critères différents pour « à télécharger » entre l'affichage et l'action.

**Piste.** un seul critère pour les deux, et trancher si ce bouton doit relancer les `FAILED`.


## #103 — app-mobile/detail : tester l'image réellement affichée dans le bandeau de la fiche série, pas la couverture

`app-mobile/detail`

**Symptôme.** une série sans `cover` mais avec un `backdrop_path` n'affiche aucun bandeau — seulement le dégradé sur fond vide — alors que l'image existe. Les deux champs sont indépendants (`XtreamApiClient.kt:257-258` : `cover` vient de `optString("cover").ifEmpty { null }`, `backdrop` de `backdropOrNull()`), et le backdrop est présent sur 6 337 des 8 467 séries du catalogue réel (SeriesItem.kt:22).

**Preuve.** SeriesDetailScreen.kt:96 — `if (!d.cover.isNullOrEmpty())` garde un `AsyncImage` dont le modèle est `d.backdrop?.takeIf { it.isNotBlank() } ?: d.cover` (ligne 100). La fiche film fait l'inverse et le fait bien : elle calcule d'abord l'image retenue puis la teste (MovieDetailScreen.kt:95-98).

**Cause.** établie.

**Piste.** reprendre la forme de la fiche film : calculer l'image retenue, puis conditionner l'affichage sur elle.


## #104 — app-mobile/detail : remettre à zéro l'accumulateur de glissement quand le geste de changement de saison est interrompu

`app-mobile/detail`

**Symptôme.** après un geste horizontal interrompu — typiquement quand le défilement vertical de la `LazyColumn` reprend la main en cours de mouvement — le glissement suivant démarre avec un reste non nul : un mouvement minuscule suffit alors à changer de saison, éventuellement dans la direction opposée à celle du doigt.

**Preuve.** SeriesDetailScreen.kt:284-313 — `dragOffset` n'est remis à zéro que dans `onDragEnd` (ligne 308) ; `detectHorizontalDragGestures` est appelé sans `onDragCancel` (valeur par défaut vide) et sans `onDragStart`.

**Cause.** établie par lecture pour l'absence de remise à zéro ; les conditions exactes d'annulation du geste restent à confirmer à l'écran.

**Piste.** remettre `dragOffset` à zéro à l'ouverture du geste (et sur annulation) plutôt qu'à sa seule fin.


## #105 — app-mobile/detail : faire porter par core le seuil « vu à 90 % », aujourd'hui écrit trois fois dans l'UI

`app-mobile/detail`

**Symptôme.** les trois copies ne disent déjà pas la même chose — le film considère « commencé » un média de durée inconnue (`savedDur == 0L`), l'épisode exige `totalDurationMs > 0` et retombe donc silencieusement sur « pas commencé » quand le fournisseur n'annonce pas de durée. Le jour où l'une des trois bouge, la pastille ✓ de la TV et celle du mobile divergeront sur le même épisode.

**Preuve.** MovieDetailScreen.kt:79, SeriesDetailScreen.kt:384 et app-tv/.../series/TvSeriesScreen.kt:1060 portent chacun leur `* 0.9f` ; aucune occurrence dans `core`.

**Cause.** établie — décision de logique métier dupliquée dans les deux UI, jamais descendue dans core, donc non couverte par la suite JVM.

**Piste.** une seule décision dans core (au voisinage de `RecentPolicy`), testée en JVM, appelée par les trois écrans. Même motif que les tickets #55 et #92.


## #106 — app-mobile/detail : retirer le PlayerViewModel déclaré et jamais utilisé de la fiche film

`app-mobile/detail`

**Symptôme.** aucun effet visible aujourd'hui — un `PlayerViewModel` est instancié pour la destination `movie_detail` puis détruit sans avoir servi. La ligne laisse surtout croire que la fiche film pilote le lecteur, alors qu'elle passe par la route : c'est exactement l'hypothèse fausse qui rend possible le défaut critique de la fiche série.

**Preuve.** MovieDetailScreen.kt:52 obtient un `PlayerViewModel` par `koinViewModel()` ; `playerVm` n'apparaît nulle part ailleurs dans le fichier.

**Cause.** établie.

**Piste.** supprimer la ligne ; la suite JVM et la compilation suffisent à prouver la non-régression.


## #107 — app-mobile/detail : faire des épisodes des items de la LazyColumn au lieu de tous les composer d'un bloc

`app-mobile/detail`

**Symptôme.** ouverture de la fiche et changement de saison d'autant plus lents que la saison est longue — aucune paresse ni recyclage, et autant de lectures de progression que d'épisodes émises d'un coup, doublées pendant l'animation.

**Preuve.** SeriesDetailScreen.kt:283-355 — toute la saison est composée dans un unique `item { … episodes.forEach { EpisodeRow(...) } }` ; l'`AnimatedContent` (ligne 285) compose en plus la saison sortante pendant la transition ; chaque `EpisodeRow` déclenche son propre `LaunchedEffect` + `progressRepo.getProgress` (lignes 378-380).

**Cause.** établie pour la composition non paresseuse ; le coût réel en millisecondes reste à mesurer sur une saison longue.

**Piste.** passer les épisodes en `items(...)` de la `LazyColumn` — l'animation de changement de saison devra alors être portée autrement qu'en enveloppant la liste entière.


## #92 — app-mobile/downloads : faire porter par core le format du sous-titre d'épisode, écrit à quatre endroits et déjà divergent

`app-mobile/downloads`

**Symptôme.** aucun sur mobile aujourd'hui — c'est un défaut qui rendra faux un correctif futur. La divergence est déjà consommée : les deux UI ne s'accordent plus sur le séparateur, et `app-tv` contredit le format documenté dans `core`. Toute retouche du libellé côté fiche série casse silencieusement l'affichage côté téléchargements, dans une seule des deux applications. Au passage, le repli `?: ep.title` (l.468, l.488) affiche le **nom de la série** et non le titre de l'épisode, `title` valant `d.name` au moment de la mise en file (SeriesDetailScreen.kt:231).

**Preuve.** le format est **produit** en `app-mobile/…/seriesdetail/SeriesDetailScreen.kt:232` et `:332` sous la forme `"S$season E$episodeNum · $title"`, puis **redécoupé** en `app-mobile/…/downloads/DownloadsScreen.kt:468` et `:488` par `ep.subtitle?.substringAfterLast("· ")`. Le même couple existe côté TV : produit en `app-tv/…/series/TvSeriesScreen.kt:845` et `:909` avec `" - "`, redécoupé en `app-tv/…/downloads/TvDownloadsScreen.kt:423` avec `substringAfterLast("- ")`. La documentation du modèle (`core/model/DownloadItem.kt:12`) fixe pourtant `"S1 E3 · Episode title"`.

**Cause.** établie — le titre d'épisode n'est pas porté par `DownloadItem` ; il est encodé dans une chaîne d'affichage puis reconstitué par découpage, décision dupliquée dans les deux UI (motif §8.2, ticket jumeau #24 côté app-tv).

**Piste.** transporter le titre d'épisode comme champ propre de `DownloadItem`, ou, à défaut, faire composer et décomposer ce libellé par une fonction unique de `core`, couverte par un test qui fixe le séparateur.


## #93 — app-mobile/downloads : sortir en ressource le compte d'épisodes d'un groupe téléchargé

`app-mobile/downloads`

**Symptôme.** en français, un groupe de séries téléchargées affiche « 3 episodes » — libellé anglais, non accentué, dans une interface traduite. Et « 1 episodes » au singulier, quelle que soit la langue.

**Preuve.** app-mobile/…/downloads/DownloadsScreen.kt:434 — `Text("${episodes.size} episodes", …)`. Aucun pluriel `count_episodes` n'existe : `app-mobile/src/main/res/values/plurals.xml` n'en déclare que sept (`trial_banner`, `premium_days`, `count_channels`, `count_movies`, `count_series`, `count_themes`, `count_titles`).

**Cause.** établie — littéral codé en dur. À noter pour celui qui prendra le ticket : `tools/check_strings.py` **ne le voit pas** (exécuté ce jour, il ne signale de ce fichier que les `label =` d'animation) car il n'inspecte que les littéraux passés en argument nommé ; la barrière du §48 ne protège donc pas ce cas.

**Piste.** ajouter un `<plurals name="count_episodes">` dans les deux `plurals.xml` (les catégories `one`/`other` ne se recopient pas d'une langue à l'autre, cf. l'en-tête du fichier) et le consommer via `pluralStringResource`, comme le fait déjà `MyListScreen.kt:219-221`. Le ticket #27 demande la même chose côté `app-tv` (`TvDownloadsScreen.kt:387`) : un pluriel commun aux deux modules serait cohérent.


## #94 — app-mobile/downloads : retirer l'animation infinie de progression, déclarée et jamais lue

`app-mobile/downloads`

**Symptôme.** pas d'effet visible — c'est bien le défaut. Tant que la carte de téléchargement actif est composée, une `InfiniteTransition` réclame une frame en boucle (`tween(300)`, `RepeatMode.Restart`) pour une valeur que personne ne lit : l'écran ne devient jamais inactif pendant tout un téléchargement, sur un appareil qui est par ailleurs en train d'écrire un fichier de plusieurs Go.

**Preuve.** app-mobile/…/downloads/DownloadsScreen.kt:183-189 — `rememberInfiniteTransition` puis `animatedProgress by infiniteTransition.animateFloat(...)`. La variable n'est lue nulle part dans le fichier : la barre de progression l.211-216 utilise directement `item.progress / 100f`. L'animation est de surcroît inerte par construction, `initialValue` et `targetValue` valant tous deux `item.progress / 100f`.

**Cause.** établie — huitième occurrence du motif « déclaré mais jamais branché » (§8.7). L'intention était probablement d'animer la transition de progression ; le branchement n'a pas été fait et les deux bornes ont été figées à la même valeur.

**Piste.** soit supprimer le bloc et garder `item.progress`, soit brancher réellement une interpolation vers la valeur courante — mais alors avec `animateFloatAsState`, pas une transition infinie. Vérifier ensuite que `tools/check_strings.py` ne signale plus les deux `label =` de ce bloc.


## #95 — app-mobile/downloads : conserver l'état plié/déplié d'un groupe de séries quand il sort de l'écran

`app-mobile/downloads`

**Symptôme.** l'utilisateur replie un groupe de séries pour dégager la liste ; il fait défiler au-delà, revient, le groupe est de nouveau déplié avec tous ses épisodes. Idem après une rotation de l'écran. Sur une série à plusieurs dizaines d'épisodes, replier est le seul moyen de garder la liste lisible — et ce moyen ne tient pas.

**Preuve.** app-mobile/…/downloads/DownloadsScreen.kt:400 — `var expanded by remember { mutableStateOf(true) }`, à l'intérieur d'un `item(key = "series_…")` d'une `LazyColumn` (l.136).

**Cause.** établie — une `LazyColumn` retire de la composition l'item qui sort de la fenêtre et son `remember` est jeté avec lui. La `LazyColumn` fournit pourtant un porteur d'état par clé : l'item étant déjà clé de façon stable (l.136), `rememberSaveable` y survivrait, exactement comme `SaveableStateProvider` a réglé le cas des onglets (§38).

**Piste.** passer `expanded` en `rememberSaveable`. Vérifier au passage que la clé de l'item est bien stable entre deux compositions — elle repose sur `seriesId ?: title`.


## #96 — app-mobile/downloads : remettre `clickable` après `clip` sur la carte de film terminé

`app-mobile/downloads`

**Symptôme.** la zone tactile de la carte déborde de la carte visible — les 12 dp de marge latérale et les 4 dp de marge verticale sont cliquables, si bien que les zones tactiles de deux cartes voisines se touchent : un appui dans l'espace entre deux films en lance un au hasard. L'onde de contact (`ripple`) n'étant pas rognée par le `clip`, qui vient après, elle s'affiche en rectangle par-dessus les coins arrondis et déborde dans l'interstice.

**Preuve.** app-mobile/…/downloads/DownloadsScreen.kt:350-357 — `fillMaxWidth().clickable{…}.padding(horizontal = 12.dp, vertical = 4.dp).clip(…).background(BgCard).padding(12.dp)`. Les trois autres cartes du même fichier n'ont pas de `clickable` au niveau de la ligne, et `ChannelRow.kt:60-63` écrit l'ordre inverse (`clip` → `background` → `clickable` → `padding`).

**Cause.** établie — ordre des modificateurs : `clickable` enveloppe le contenu **déjà pourvu** de sa marge, et précède le `clip` qui devrait borner son rendu. Même famille de défaut que le ticket #3 côté TV.

**Piste.** placer `clickable` après `clip`/`background`, comme `ChannelRow`. Vérifier à l'écran que l'onde de contact suit bien le coin arrondi et qu'un appui dans l'interstice ne déclenche plus rien.


## #85 — app-mobile/player : ne pas laisser le masquage automatique refermer le menu de vitesse

`app-mobile/player`

**Symptôme.** on ouvre le sélecteur de vitesse, on hésite quatre secondes : l'overlay disparaît, le menu avec lui, et il faut tout rouvrir. À la réouverture `showSpeedMenu` est reparti à `false` puisque le `remember` a été jeté.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:124-127 — `LaunchedEffect(lastInteractionMs) { delay(4_000); overlayVisible = false }`. `showSpeedMenu` est mémorisé **dans** `PlayerOverlay` (:378) et le menu est composé dans cet overlay (:428-447), lui-même conditionné par `overlayVisible` (:240).

**Cause.** établie — le minuteur de masquage ignore qu'un menu est ouvert ; seule la feuille de pistes a été mise à l'abri, en la composant hors de l'overlay (:304).

**Piste.** suspendre le masquage tant que `showSpeedMenu` est vrai (ou sortir le menu de l'overlay comme la feuille de pistes).


## #86 — app-mobile/player : faire porter par core la résolution du code de langue d'une piste, déjà divergente entre les deux UI

`app-mobile/player`

**Symptôme.** la même piste ne se nomme pas pareil selon l'appareil — mise en capitale d'un côté seulement, et pour un code que Java ne sait pas résoudre (les codes ISO à trois lettres, majoritaires dans ces flux) le mobile affiche le code en capitales tandis que la TV affiche la chaîne brute rendue par `displayLanguage`.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:963-968 — `Locale(code).displayLanguage`, première lettre passée en capitale, repli sur `code.uppercase()` si le résultat est vide ou égal au code. app-tv/.../TvPlayerScreen.kt:1022-1024 — même appel, **sans** mise en capitale et **sans** repli : la valeur brute est gardée dès qu'elle n'est pas vide. Les deux alimentent le même `TrackPolicy.label` de `core`, qui a précisément été extrait pour éviter ça.

**Cause.** établie — décision écrite deux fois (§8.2) ; la divergence est déjà là, elle n'est pas hypothétique.

**Piste.** remonter la résolution auprès de `TrackPolicy.label` dans `core` en lui passant la locale, et couvrir les codes à deux et trois lettres par un test.


## #87 — app-mobile/player : n'écrire qu'une fois la traduction des préférences de sous-titres en style de rendu

`app-mobile/player`

**Symptôme.** aucun aujourd'hui — c'est le motif de divergence de ce projet : ajouter une troisième couleur ou changer l'opacité du fond exige de retrouver trois `if` dans deux modules ; en oublier un donne un aperçu qui ne correspond pas au rendu.

**Preuve.** trois copies identiques du même `CaptionStyleCompat` : app-mobile/.../ui/player/PlayerScreen.kt:180-187 (rendu réel), :829-836 (aperçu de la feuille), app-tv/.../TvPlayerScreen.kt:204-211. Toutes reprennent la même règle : `subColor == "yellow"` → jaune, sinon blanc ; `subBg` → `#80000000`, sinon transparent. Le tableau des couleurs proposées (PlayerScreen.kt:869-870) doit rester cohérent avec ces trois `if`.

**Cause.** établie — décision de présentation dupliquée, jamais extraite.

**Piste.** exposer dans `core` la conversion (préférence stockée → couleur, couleur de fond) et la couvrir de tests ; les trois appelants ne construisent plus que le `CaptionStyleCompat` à partir de ce résultat.


## #88 — app-mobile/player : trancher entre quitter l'écran au démarrage du cast et y afficher un état « diffusion en cours »

`app-mobile/player`

**Symptôme.** l'utilisateur ne voit jamais cet état, ou tout au plus un éclair. Accessoirement, ce bloc mort porte le seul libellé **anglais en dur** du fichier, dans une UI par ailleurs traduite.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:116-121 — `LaunchedEffect(castInfo.isConnected) { if (isConnected) { vm.pause(); onBack() } }`. Et :228-237, sur la **même** condition, un bloc qui affiche une icône et `"Casting to ${castInfo.deviceName}"`. Le second n'est atteignable qu'à la frame qui précède la sortie de l'écran.

**Cause.** établie — deux réponses contradictoires câblées sur la même transition d'état ; la sortie de l'écran gagne. Ce que le produit veut (revenir en arrière, ou rester sur un écran de télécommande) reste à décider.

**Piste.** retirer l'un des deux. Si l'état « diffusion en cours » doit vivre, il faut d'abord lever le `onBack()` — et alors passer le libellé en ressource.


## #89 — app-mobile/player : déduire le direct du type de média plutôt que d'une durée pas encore connue

`app-mobile/player`

**Symptôme.** au lancement d'un film, tant que la durée n'est pas résolue, l'overlay — visible par défaut (:89) — affiche le pastille rouge **LIVE** et masque les boutons ±10 s, qui apparaissent ensuite. À l'inverse, une chaîne dont le flux annonce une durée finie perd sa carte EPG et gagne une barre d'avancement.

**Preuve.** app-mobile/.../ui/player/PlayerScreen.kt:93 — `val isLive = state.durationMs <= 0L`, alors que l'écran reçoit déjà un paramètre `type` (:69) qu'il transmet à `vm.playMedia(…, type)` (:99). `isLive` commande le badge LIVE (:399-408), la présence des boutons ±10 s (:458, :473), la carte EPG (:265) et la bascule VF/VOSTFR (:278).

**Cause.** établie pour le premier cas (durée à 0 avant préparation du média) ; le second dépend du flux du fournisseur et reste à observer.

**Piste.** fonder l'état « direct » sur `type`, et n'utiliser la durée que comme repli. La même ligne existe côté TV (TvPlayerScreen.kt:82) : la décision a sa place dans `core`.


## #130 — app-mobile/purchase : sortir en ressources les trois noms de formule, restés en anglais

`app-mobile/setup`

**Symptôme.** en français, la carte affiche « Monthly » au-dessus de « / mois » et « Lifetime » au-dessus de « paiement unique » — moitié traduite, moitié pas, dans l'écran qui vend l'abonnement.

**Preuve.** PurchaseScreen.kt:146-151 — `"Monthly"`, `"Yearly"`, `"Lifetime"` écrits en dur, tandis que la période affichée juste en dessous vient de `R.string.period_month` / `period_year` / `period_onetime` (lignes 152-157), traduites dans `values-fr/strings.xml:86-88`.

**Cause.** établie. À noter pour celui qui prendra le ticket #74 : sa formulation suppose que « le mobile les a déjà traduits », ce qui est faux — les deux UI codent ces trois libellés en dur de la même façon.

**Piste.** trois ressources dans les deux `strings.xml` d'`app-mobile`, et traiter le ticket #74 dans le même geste pour ne pas figer une divergence de vocabulaire entre les deux applications. `python3 tools/check_strings.py` pour contrôler la parité après ajout.


## #131 — app-mobile/setup : donner une réponse au bouton « SE CONNECTER » de l'onglet Fichier quand aucun fichier n'est choisi

`app-mobile/setup`

**Symptôme.** sur l'onglet « Fichier », appuyer sur le bouton violet sans avoir choisi de fichier ne produit strictement rien : ni message, ni indicateur. Le bouton paraît cassé.

**Preuve.** SetupScreen.kt:278 — `2 -> selectedFile?.let { vm.submitLocalFile(it) }` : si `selectedFile` est `null`, l'appui n'a aucun effet et aucun état n'est émis. Les deux autres modes appellent le `ViewModel` sans condition et obtiennent une `SetupState.Error` (SetupViewModel.kt:31, 37).

**Cause.** établie — le `?.let` avale le cas vide dans l'UI, alors que `SetupViewModel.submitLocalFile` sait déjà répondre « Please select a file. » sur une entrée vide (SetupViewModel.kt:45), branche aujourd'hui inatteignable.

**Piste.** appeler le `ViewModel` inconditionnellement et le laisser rendre son erreur, comme les deux autres modes.


## #132 — app-mobile/purchase : retirer la collecte de `isPro`, que l'écran ne lit jamais

`app-mobile/setup`

**Symptôme.** aucun effet visible ; l'écran s'abonne à un `StateFlow` de plus et se recompose quand il change.

**Preuve.** PurchaseScreen.kt:42 — `val isPro by vm.isPro.collectAsState()` ; le symbole n'apparaît nulle part ailleurs dans le fichier (le `isPro` des lignes 132+ est le `isLifetime` local de `PriceCard`, sans rapport).

**Cause.** établie — reste d'un état d'accès qui n'est plus consulté depuis que la barrière est décidée par la navigation (`blocking`, NavGraph.kt:111).

**Piste.** supprimer la collecte. Si l'intention était de ne pas revendre à un acheteur définitif, c'est une décision à écrire explicitement, pas à laisser sous forme d'état inerte.


## #133 — app-mobile/setup : cesser d'imposer un clavier d'URL aux champs identifiant et mot de passe

`app-mobile/setup`

**Symptôme.** sur les champs identifiant et mot de passe, le clavier propose « / » et « .com » au lieu d'une disposition normale, et rien n'indique au clavier qu'il s'agit d'un secret — les IME appliquent leurs suggestions et leur apprentissage personnalisé à un mot de passe saisi sous `KeyboardType.Uri`.

**Preuve.** SetupScreen.kt:358 — `KeyboardOptions(imeAction = imeAction, keyboardType = KeyboardType.Uri)` est écrit une seule fois dans `SetupField`, donc appliqué aux cinq champs, y compris `userText` (ligne 181) et `passText` (ligne 184) qui portent pourtant `PasswordVisualTransformation`.

**Cause.** établie — le type de clavier est figé dans le composable partagé au lieu d'être un paramètre, comme l'est déjà `imeAction`.

**Piste.** ajouter un paramètre `keyboardType` à `SetupField` (`Uri` pour l'URL et le serveur, `Text` pour l'identifiant, `Password` pour le mot de passe). Vérifier au passage `TvSetupScreen`, qui importe le même `KeyboardType`.


## #120 — app-mobile/common : remonter dans core les initiales d'une chaîne, écrites deux fois mot pour mot

`app-mobile/shell`

**Symptôme.** Aucun aujourd'hui. Le jour où l'on ajoutera un séparateur ou changera le repli, une seule des deux UI en profitera — le motif le plus récurrent du projet (§8.2). Les deux copies divergent déjà par leur commentaire : la version mobile documente que les décorations ont été nettoyées en amont (P7), la version TV non.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/common/ChannelRow.kt:140-146 et `app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/common/TvChannelRow.kt:156-162` — même fonction d'extension privée `Channel.initials()`, mêmes séparateurs `' ', '|', '-'`, même `take(2)`, même repli `"?"`, à l'identique.

**Cause.** Décision de présentation posée dans chaque UI au lieu de `core`, alors qu'elle ne dépend que du modèle `Channel`.

**Piste.** Une seule fonction dans `core` (à côté du modèle `Channel` ou d'un objet de présentation), couverte par un test JVM sur les cas réels : nom vide, nom d'un seul mot, séparateurs multiples.


## #121 — app-mobile/common : sortir en ressources les descriptions « Monter » et « Descendre » des flèches de réordonnancement

`app-mobile/shell`

**Symptôme.** En anglais, TalkBack annonce « Monter » et « Descendre » sur les deux boutons de réordonnancement de « Ma liste ». L'étoile de favori juste à côté (ligne 131) passe `contentDescription = null` : elle n'est pas annoncée du tout, ce qui laisse un bouton muet dans la même ligne.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/common/ChannelRow.kt:110 et 121 — `Icon(Icons.Rounded.KeyboardArrowUp, "Monter", …)` et `Icon(Icons.Rounded.KeyboardArrowDown, "Descendre", …)`, deux littéraux français en `contentDescription` positionnel.

**Cause.** Le garde-fou ne les voit pas : `tools/check_strings.py:59` saute toute ligne contenant `contentDescription`, et son motif (ligne 48) n'accepte que des arguments **nommés** (`label=`, `name=`, `title=`, `text=`, `hint=`, `message=`). Un littéral en position positionnelle lui est doublement invisible.

**Piste.** Deux `<string>` dans les deux `strings.xml`, plus une description pour l'étoile. Accessoirement, décider si le garde-fou doit couvrir `contentDescription` — sinon il continuera de laisser passer cette forme.


## #122 — app-mobile/main : traduire les libellés d'onglets restés en français dans le fichier par défaut

`app-mobile/shell`

**Symptôme.** En anglais, la barre du bas affiche « Direct TV » et « Films » à côté de « Series » et « Downloads ». « Direct TV » n'est pas la traduction de « direct » et collide avec une marque existante.

**Preuve.** cluster/iptv/native/app-mobile/src/main/res/values/strings.xml:20-21 — `nav_live` = « Direct TV » et `nav_movies` = « Films », valeurs **identiques** à `values-fr/strings.xml`, alors que `nav_series` (ligne 22) est bien traduit en « Series ». Consommés par `MainScreen.kt:473-474` (`BottomNav`).

**Cause.** Traduction incomplète du fichier par défaut. Le contrôle `tools/check_strings.py` ne peut pas la voir : il vérifie la **parité des clés**, pas le contenu ; les deux clés existent des deux côtés.

**Piste.** Corriger les deux valeurs dans `values/strings.xml` seulement. Le même symptôme existe sur d'autres clés hors de ce périmètre (`cast_info_title`, `cast_info_text`, `player_audio`, `purchase_title`) — le relevé complet s'obtient en comparant valeur à valeur les deux fichiers.


## #123 — app-mobile/main : retirer les deux collectes d'état que plus personne ne lit

`app-mobile/shell`

**Symptôme.** Aucun affichage faux, mais toute émission de ces deux flux recompose l'intégralité de `MainScreen`, y compris les cinq onglets, sans rien changer à l'écran.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/main/MainScreen.kt:78-79 — `remainingDays` et `isPro` sont collectés par `collectAsState()` et n'apparaissent nulle part ailleurs dans le fichier ; le bandeau est désormais entièrement piloté par `access` (ligne 80).

**Cause.** Reliquat de la refonte UX-1 : le bandeau a été réécrit autour d'`accessState`, les deux collectes précédentes n'ont pas été retirées. Conséquence documentaire : la note de `CLAUDE.md` §7 qui interdit de toucher à `isPro` « en `MainScreen.kt:163-181` » ne désigne plus rien dans ce fichier.

**Piste.** Supprimer les deux lignes. Si l'un des deux flux doit rester un instrument de mesure pour la vérification B1 (§7), le dire explicitement dans le code plutôt que de le collecter sans l'afficher.


## #124 — app-mobile/navigation : mesurer la hauteur réelle de la barre d'onglets au lieu de la recopier

`app-mobile/shell`

**Symptôme.** Sur un appareil à barre de navigation ou à navigation gestuelle, la télécommande de cast affichée par-dessus l'écran principal recouvre le bas de la barre d'onglets, de la hauteur de l'encoche système.

**Preuve.** cluster/iptv/native/app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/navigation/NavGraph.kt:58 — `BOTTOM_NAV_HEIGHT = 60.dp`, servi comme `bottomInset` à `CastRemoteSheet` (ligne 166). En face, `MainScreen.kt:483-489` : la `Row` de `BottomNav` applique `.navigationBarsPadding()` **avant** `.height(60.dp)`, sa hauteur mesurée vaut donc 60 dp **plus** l'encoche de barre de navigation.

**Cause.** Établie : la constante duplique une valeur qui n'est plus la hauteur totale depuis l'ajout de `navigationBarsPadding()`. Le commentaire de la ligne 57 (« cf. `MainScreen.BottomNav` ») signale lui-même le couplage sans le fermer.

**Piste.** Ajouter l'encoche de barre de navigation au décalage, ou faire remonter la hauteur mesurée de la barre plutôt que de la redéclarer.


## #62 — app-tv/home : rendre atteignable la croix d'effacement de la barre de recherche

`app-tv/home`

**Symptôme.** la croix « effacer la recherche » ne prend jamais le focus à la télécommande, donc son `onClick` n'est jamais atteint. Sur l'onglet Direct, `BackHandler` (ligne 109) offre une sortie ; `TvSearchBar` étant aussi utilisée par Films et Séries, la croix y est également inerte.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:390-396 — `Icon(..., modifier = Modifier.size(14.dp).clickable { onQuery("") })`, imbriquée dans la `Row` qui est elle-même `clickable` ligne 359 et dont le rectangle focalisé couvre toute la barre.

**Cause.** établie — §8.17 : la recherche directionnelle exige qu'un candidat **dépasse** le rectangle focalisé du côté visé ; la croix est **contenue** dans celui de la barre, donc candidate d'aucune direction. Haut et Bas sont par ailleurs interceptés en amont (lignes 340-347) et la barre refuse Gauche/Droite en entrée (ligne 332).

**Piste.** ne pas imbriquer un focalisable dans un focalisable qui le recouvre — soit exposer l'effacement hors du rectangle de la barre, soit en faire un vrai groupe à deux cibles côte à côte (le motif de `TvChannelRow`, ligne/étoile), soit rendre l'effacement à un geste de la barre elle-même.


## #63 — app-tv/home : ne pas désarmer la fermeture du clavier virtuel avec un KeyboardActions vide

`app-tv/home`

**Symptôme.** la saisie terminée, la touche « Rechercher » du clavier TV ne produit rien : le clavier reste affiché et continue d'avaler les touches directionnelles (§8.12). L'utilisateur ne peut sortir du champ que par RETOUR.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:382-383 — `keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search)` puis `keyboardActions = KeyboardActions(onSearch = {})`.

**Cause.** établie — une lambda non nulle **remplace** `defaultKeyboardAction(ImeAction.Search)`, qui est précisément ce qui masque l'IME ; une lambda vide supprime donc le comportement par défaut au lieu de s'y ajouter.

**Piste.** soit ne pas passer `keyboardActions` du tout, soit y écrire la sortie explicite (masquer l'IME, repasser `editing` à false et rendre le focus à la liste des résultats — le trajet que le §26 a déjà eu à reconstruire à la main).


## #64 — app-tv/home : remettre le panneau droit en haut quand le genre affiché change

`app-tv/home`

**Symptôme.** après être descendu de plusieurs dizaines de chaînes dans un genre puis être revenu à gauche pour en survoler un autre, le panneau droit affiche le nouveau genre **au milieu** de sa liste ; entrer dedans avec `▶` arrive donc sur une chaîne arbitraire au lieu de la première.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:277-286 — la `LazyColumn` des chaînes n'a aucun `LazyListState` explicite ni aucune remise à zéro liée à `currentGenre` ; seul son contenu change (`shown`, ligne 243-246).

**Cause.** établie — l'état de défilement est mémorisé dans la même position de composition d'un genre à l'autre ; les clés (`it.url`) du nouveau genre ne correspondant à aucune de l'ancien, la liste conserve l'**indice** de premier élément visible.

**Piste.** hisser un `LazyListState` et le ramener à 0 quand `currentGenre` change (ou le mémoriser par genre si l'on veut retrouver chaque genre là où on l'a laissé — c'est le choix fait pour les rangées de Films, cf. `TvRowFocus`) ; vérifier au passage l'interaction avec `dpadPageJump`.


## #65 — app-tv/home : passer les compteurs de l'en-tête en plurals, comme le mobile

`app-tv/home`

**Symptôme.** une recherche qui ne ramène qu'une chaîne — le cas courant quand on cherche une chaîne précise — affiche « 1 RÉSULTATS ». De même « 1 CHAÎNES - 1 GENRES ».

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/home/TvHomeScreen.kt:186-187 — `stringResource(R.string.count_results, …)` et `stringResource(R.string.count_channels, …)`, définis en `<string>` (app-tv/src/main/res/values-fr/strings.xml:112-113 « %1$d RÉSULTATS », « %1$d CHAÎNES - %2$d GENRES » ; values/strings.xml:116-117 pour l'anglais). Le mobile emploie `pluralStringResource(R.plurals.count_channels, …)` pour la même notion (app-mobile/.../ui/home/HomeScreen.kt:180).

**Cause.** établie — la ressource est un `<string>` sans forme singulière, dans les deux langues.

**Piste.** convertir en `<plurals>` dans `values/` et `values-fr/` (le second compteur de `count_channels` exige de scinder le libellé ou de choisir la quantité pilote), puis rejouer `python3 tools/check_strings.py` qui contrôle la parité des `<plurals>` (§48).


## #38 — app-tv/movies : ne pas refermer la fiche en lançant un film téléchargé

`app-tv/movies`

**Symptôme.** un film téléchargé lu depuis sa fiche ramène, à la sortie du lecteur, sur le catalogue ; le même film lu en streaming ramène sur sa fiche. Deux comportements pour le même geste, selon qu'on a téléchargé ou non.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:190-196 — `onPlayLocal` fait `onPlay("file://$it", …)` **puis** `selectedMovieId = null; anchor.restore()`. Quatre lignes plus bas dans le même fichier, TvMoviesScreen.kt:736-743, le bouton « Lire » ne le fait plus, avec le commentaire : « La fiche ne se referme PLUS en lançant la lecture. C'est cette ligne qui faisait qu'en quittant le lecteur on retombait sur la liste ».

**Cause.** établie — la correction signalée à l'usage n'a été appliquée qu'à la voie de lecture en streaming ; la voie locale a gardé la mise à `null` de `selectedMovieId`, qui vide l'état avant de partir et ne laisse rien à restaurer au retour.

**Piste.** aligner `onPlayLocal` sur le bouton « Lire » (ne pas toucher à `selectedMovieId`). Vérifier au passage l'état d'arrivée : `selectedMovieId` est `rememberSaveable`, c'est lui qui fait revenir sur la fiche.


## #39 — app-tv/movies : sortir en ressources les quatre libellés français écrits en dur

`app-tv/movies`

**Symptôme.** la locale par défaut du module est l'anglais (`values/` est anglais, `values-fr/` est la traduction). Sur un téléviseur en anglais, l'onglet Films affiche « REPRENDRE LA LECTURE », « 42 TITRES » et « SÉRIES » au milieu d'une interface anglaise.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:270 `"${filtered.size} TITRES"` ; :320 `"REPRENDRE LA LECTURE"` ; :970-972 `"FILMS"` / `"SÉRIES"` / `"DIRECT TV"`. Les deux branches voisines de la ligne 270 utilisent pourtant `stringResource(R.string.count_results, …)` et `count_titles`, qui existent dans les deux locales (`values/strings.xml:116-118`, `values-fr/strings.xml`).

**Cause.** établie — `tools/check_strings.py` ne détecte que les littéraux passés à un argument **nommé** (`label =`, `title =`, `name =`) : exécuté ce jour, il rend 10 avertissements dont aucun sur ce fichier. Un `Text("…")` positionnel lui échappe, donc la barrière qualité de §48 ne pouvait pas les voir.

**Piste.** quatre entrées dans `values/` + `values-fr/` (« N TITRES » a déjà sa forme dans `count_titles`), et élargir la détection du script aux premiers arguments positionnels de `Text(...)` — sinon le prochain libellé en dur passera aussi. Les mêmes littéraux existent à l'identique dans `TvSeriesScreen.kt:245` et `:295`, à traiter dans le même geste sous peine de divergence.


## #40 — app-tv/movies : porter par core le retrait de l'année suffixée au titre d'un film

`app-tv/movies`

**Symptôme.** le même film se lit « Le Film - 2024 » sur son affiche et dans l'appli mobile, « Le Film » sur la fiche TV. Le nettoyage n'est appliqué qu'à un des trois emplacements où le titre s'affiche.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:1406 — `private val YEAR_SUFFIX = Regex("""\s*[-–]\s*(19|20)\d{2}$""")`, appliqué au seul titre de la fiche (TvMoviesScreen.kt:699). L'affiche de la même liste rend `movie.name` brut (TvMoviesScreen.kt:561), et la fiche mobile aussi (`MovieDetailScreen.kt:123`, `Text(d.name, …)`).

**Cause.** établie pour le placement (règle de présentation écrite dans l'UI TV, donc invisible des deux autres sites d'affichage et non testable). Effet de bord à confirmer par test : la regex retire tout groupe de quatre chiffres commençant par 19 ou 20 précédé d'un tiret — un titre dont l'année **fait partie du nom** (« Blade Runner - 2049 ») serait amputé ; non observé sur catalogue réel, cause à établir.

**Piste.** même traitement que `EpisodeTitle.stripSeriesName` (core/model, couvert par `EpisodeTitleTest`) : un objet pur dans `core/model`, appelé par les deux UI et par les trois sites d'affichage, avec les cas limites en tests JVM.


## #41 — app-tv/movies : unifier la clé de thème, aujourd'hui normalisée de trois façons dans la même fonction

`app-tv/movies`

**Symptôme.** aujourd'hui aucun sur Xtream ni M3U — `cleanCat` (XtreamApiClient.kt:139-145, appelé par `buildCatMap` et par `IptvRepository.kt:103`) garantit un libellé déjà rogné et jamais vide, ce qui fait coïncider les trois normalisations. Deux catégories ne différant que par la casse produisent en revanche deux rangées distinctes sur TV là où le mobile n'en montre qu'une.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:205 `allMovies.mapNotNull { it.group }.distinct()` (brut, sert au compteur de genres de l'en-tête) ; :302-309 `.filter { !it.group.isNullOrBlank() }.groupBy { it.group!!.trim() }` (rogné, sert de clé de rangée, de favori de thème et de valeur de `selectedGenre`) ; :208 `allMovies.filter { it.group == selectedGenre }` (comparaison **brute** contre une clé rognée). Le mobile écrit une quatrième variante de la même règle : `MoviesScreen.kt:69` groupe sur `(it.group ?: "Other").trim().lowercase()` et `MoviesScreen.kt:77` filtre avec `equals(selectedGenre, ignoreCase = true)`.

**Cause.** établie — la règle de regroupement est écrite quatre fois au lieu d'une. La ligne 208 ne fonctionne que grâce à un invariant tenu dans un autre module ; le ticket #18 ouvert porte précisément sur `cleanCat`. Si cet invariant tombe, « Voir les N » ouvrira une grille vide sous un en-tête annonçant N titres, sans qu'aucun test ne le signale.

**Piste.** une seule fonction pure dans `core` (clé de thème + prédicat d'appartenance), appelée par les deux UI et couverte en JVM ; les filtres de l'écran s'y ramènent au lieu de comparer des chaînes brutes.


## #42 — app-tv/movies : cesser de recomposer tout le catalogue à chaque bloc reçu d'un téléchargement

`app-tv/movies`

**Symptôme.** pendant un téléchargement, l'onglet Films se recompose plusieurs dizaines de fois par seconde — l'écran entier plus toutes les affiches visibles, la liste passée en paramètre étant une nouvelle instance à chaque émission et empêchant donc leur skip. À vérifier à l'écran sur l'AVD : à-coups de défilement à la télécommande pendant qu'un film se télécharge.

**Preuve.** app-tv/.../ui/movies/TvMoviesScreen.kt:87 `val downloads by dlVm.downloads.collectAsState()` est lu au niveau de l'écran ; la liste entière est ensuite passée en paramètre à **chaque** carte (TvMoviesScreen.kt:390 et 432) qui n'en extrait qu'un statut (TvMoviesScreen.kt:457-458 `downloads.find { it.id == dlId }?.status`). Côté source, `DownloadRepository.kt:110-118` réaffecte `_items.value` dans le callback de progression, appelé à **chaque tampon de 64 Ko** lu (`DownloadRepository.kt:163-176`).

**Cause.** la fréquence d'émission vient de `core` (hors périmètre, non traitée par les tickets #1/#5 qui portent sur l'atomicité et la testabilité) ; l'amplification, elle, est ici : un paramètre instable là où un `DownloadStatus?` suffirait.

**Piste.** ne passer à `TvMoviePosterCard` que le statut du film concerné, et isoler la lecture de `downloads` derrière un `derivedStateOf` pour que l'écran ne se recompose que sur changement de statut, pas sur changement d'octets.


## #78 — app-tv/navigation : brancher TvPurchaseAccess.focusableCount, ou cesser de tester un invariant que rien n'observe

`app-tv/navigation`

**Symptôme.** aucun aujourd'hui — l'écran implémente bien le repli. Mais le test nommé « une barriere sans offre reste manipulable » n'interroge qu'une fonction que l'écran ne consulte pas : supprimer le repli de `TvPurchaseScreen` laisserait la suite entièrement verte, et un utilisateur à l'essai expiré se retrouverait devant une barrière à zéro focalisable, sans même pouvoir restaurer un achat déjà payé.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/navigation/TvNavPolicy.kt:213 définit `focusableCount(blocking, offerCount, loading)`. Les seuls appelants sont les tests : `app-tv/src/test/.../TvNavPolicyTest.kt:130,137,139,147`. Dans le code de production, `TvPurchaseScreen.kt:113` ne fait que la **citer en commentaire** (« Cf. TvPurchaseAccess.focusableCount ») ; le repli « Réessayer » + « Restaurer mes achats » de :123-133 est écrit à la main, indépendamment de la fonction.

**Cause.** décision extraite en objet pur (règle §4) mais jamais rebranchée sur le rendu — huitième occurrence du motif §8.7. Le test tombe alors sous §8.3 : il ne peut pas échouer sur le défaut qu'il prétend garder.

**Piste.** soit faire dériver le rendu du repli de `focusableCount` pour que la fonction devienne la source unique, soit remplacer le test par un test instrumenté qui compte les focalisables réellement composés. En l'état, la branche `loading` avec `blocking = true` rend d'ailleurs 0 focalisable, ce que la fonction assume mais que rien ne borne dans le temps.


## #79 — app-tv/navigation : remplacer le MainScope() jamais annulé de la déconnexion par le scope de la composition

`app-tv/navigation`

**Symptôme.** la coroutine survit à la sortie de composition de `TvNavGraph` et continue d'écrire `currentScreen` hors du cycle de vie de l'écran ; chaque déconnexion laisse un `SupervisorJob` derrière elle. Si `credRepo.clear()` lève, l'exception ne remonte à aucun parent et part au gestionnaire par défaut du thread principal.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/navigation/TvNavGraph.kt:103 — `kotlinx.coroutines.MainScope().launch { credRepo.clear(); currentScreen = TvScreen.Setup }`. Un `MainScope()` est créé à chaque clic et n'est jamais annulé : aucun `onDispose`, aucune référence conservée.

**Cause.** divergence avec le jumeau mobile, qui fait le même geste correctement : `app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/main/MainScreen.kt:240-244` utilise le `scope` remembered de l'écran. La décision « effacer les identifiants puis naviguer » est par ailleurs écrite deux fois, une par UI.

**Piste.** passer par `rememberCoroutineScope()` dans `TvNavGraph`, qui annule la coroutine quand la destination quitte la composition. Occasion de remonter la séquence « clear + retour au Setup » en un seul point plutôt que de la garder dupliquée.


## #80 — app-tv/common : mettre en commun KeepScreenOn, recopié mot pour mot depuis app-mobile

`app-tv/navigation`

**Symptôme.** rien de visible aujourd'hui, les deux copies sont encore en phase. C'est le motif §8.2 dans son état initial : le jour où l'une des deux apprend quelque chose — poser le drapeau seulement pendant la lecture effective plutôt que sur toute la durée de l'écran, ou ne pas effacer un drapeau qu'un autre composant aurait posé — l'autre ne l'apprendra pas.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/common/KeepScreenOn.kt:11-35 est identique, ligne pour ligne, à `app-mobile/src/main/kotlin/com/purple/iptvplayer/mobile/ui/common/ScreenMode.kt:14-42` — helper `findActivity()` compris, mêmes `addFlags`/`clearFlags`, même signature `enabled: Boolean = true`. Les deux sont appelés de la même façon et sans argument (`TvPlayerScreen.kt:148`, `PlayerScreen.kt:110`).

**Cause.** aucune raison technique de duplication, contrairement à `TvPremiumBadge` qui documente la sienne (deux `Text` différents) : ce code ne dépend que de `androidx.compose.runtime`, `LocalContext` et du framework Android, tous disponibles des deux côtés.

**Piste.** descendre `KeepScreenOn` et `findActivity` dans `core`. ⚠️ Vérifié : `core/build.gradle.kts` ne contient aucune dépendance Compose — la mise en commun impose donc d'y ajouter `compose.runtime` + `compose.ui`, ce qui est un choix d'architecture à trancher avant de prendre le ticket, pas un détail d'exécution.


## #34 — app-tv : sortir en ressources les quatre libellés du lecteur restés codés en dur

`app-tv/player`

**Symptôme.** en anglais, l'utilisateur lit « Lecture automatique dans 7s », « Chargement... » et « Normale » au milieu d'une interface traduite — le défaut du §17/§48, à quatre exemplaires de plus.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/player/TvPlayerScreen.kt:466 `"Lecture automatique dans ${autoPlayCountdown}s"`, :467 `"Chargement..."`, :1075 `"Normale"` — trois libellés français en dur dans un module qui possède `values/` **et** `values-fr/`. Et :374 `Text("LIVE", …)` alors que la clé existe et est utilisée vingt lignes plus loin, :653 `stringResource(R.string.player_live)` (app-tv/src/main/res/values/strings.xml:124).

**Cause.** établie, et l'on sait pourquoi le garde-fou ne les a pas vus : `tools/check_strings.py:47` ne reconnaît un littéral que sur un paramètre nommé (`label|name|title|text|hint|message`) et son motif exclut `$`. Les quatre sites sont soit des arguments positionnels de `Text(…)`, soit une expression `if` derrière `name =`, soit interpolés. Le contrôle est donc **aveugle à ce cas**, pas simplement non exécuté.

**Piste.** quatre clés dans `values/` et `values-fr/`, la première avec un paramètre `%1$d`. Élargir en même temps le motif de `check_strings.py` au premier argument positionnel de `Text(` — sans quoi le même défaut reviendra. À noter, :384 rend `"${playbackSpeed}×"` (donc « 2.0× ») alors que le dialogue écrit « 2.0x » (:1075) : deux glyphes pour la même grandeur.


## #35 — app-tv : remonter dans core le formatage de durée écrit à l'identique dans les deux lecteurs

`app-tv/player`

**Symptôme.** aucun aujourd'hui — les deux copies concordent. Le défaut est à venir : toute correction de ce formatage (chiffres non-ASCII produits par `String.format` sous une locale à chiffres indo-arabes, seuil d'affichage des heures, durée négative) n'atteindra qu'une des deux UI. C'est le motif §8.2, dont le journal recense déjà onze occurrences — chacune ayant commencé par deux copies concordantes.

**Preuve.** native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/player/TvPlayerScreen.kt:1086-1092 `private fun Long.toTimeString()` est **octet pour octet** la même fonction que app-mobile/…/ui/player/PlayerScreen.kt:970-976. Même constat pour la décision `isLive` : :82 `state.durationMs <= 0L`, identique à app-mobile/…/PlayerScreen.kt:93.

**Cause.** établie — décision pure laissée dans la couche de présentation, donc non couverte par `:core:testDebugUnitTest`.

**Piste.** un objet pur dans `core` (à côté de `EpgTimeline`, qui porte déjà `formatTime`), appelé par les deux écrans, avec ses cas limites en test JVM. Ne pas y remonter les composables — §38 tranche que les deux UI restent séparées ; seule la décision remonte.


## #75 — app-tv/purchase : cesser d'annoncer « Paiement en cours… » pendant une restauration, qui ne facture rien

`app-tv/purchase`

**Symptôme.** l'utilisateur appuie sur « Restaurer mes achats » et l'écran lui annonce qu'un paiement est en cours. Sur la barrière d'accès expiré, c'est précisément le geste censé lui éviter de repayer. Seule la TV est concernée : `app-mobile` n'expose aucun bouton de restauration.

**Preuve.** app-tv/.../purchase/TvPurchaseScreen.kt:148-153 — le voile modal rend `R.string.purchase_processing` (« Paiement en cours... ») pour tout `PurchaseScreenState.Purchasing`. Or `PurchaseViewModel.kt:98-99` pose ce même `Purchasing` à l'entrée de `restorePurchases()`, déclenché par le bouton :130-133.

**Cause.** établie : un seul état `Purchasing` sert deux opérations distinctes ; l'ambiguïté n'était pas visible tant qu'une seule UI l'utilisait.

**Piste.** distinguer les deux opérations — soit un état de restauration propre côté `PurchaseViewModel`, soit un libellé choisi par l'écran selon l'action qu'il a déclenchée. Ajouter la ressource manquante dans les deux `strings.xml` d'`app-tv`.


## #54 — app-tv/series : sortir en ressources les deux libellés français écrits en dur de l'écran séries

`app-tv/series`

**Symptôme.** en anglais, l'en-tête d'un genre affiche « 128 TITRES » là où les deux autres branches du même `when` affichent « 128 RESULTS » et « 8467 TITLES - 42 GENRES » (lignes 246-247, `R.string.count_results` / `R.string.count_titles` existent dans les deux locales). Le titre de la rangée de reprise reste français dans toute l'application.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:245 — `"${filtered.size} TITRES"` ; et TvSeriesScreen.kt:295 — `"REPRENDRE LA LECTURE"`

**Cause.** établie. `tools/check_strings.py` ne détecte que les littéraux passés à un argument nommé (`label =`, `title =`, `name =`) : un littéral passé en premier argument positionnel à `Text(...)` lui échappe. Ces deux-là n'ont donc jamais été signalés, alors que la parité des `strings.xml` est verte (116/116).

**Piste.** deux ressources dans les deux locales. Élargir en même temps le détecteur de `check_strings.py` au premier argument positionnel de `Text(` éviterait que le cas se reproduise — c'est le même angle mort pour tout l'`app-tv`.


## #55 — app-tv/series : faire porter par core l'analyse de la durée d'un épisode, aujourd'hui écrite à l'identique dans les deux UI

`app-tv/series`

**Symptôme.** aucun aujourd'hui — les deux copies sont identiques. Le jour où l'une est corrigée (un format `"1:23:45.5"`, `"90 min"` ou une durée en secondes rend `0L` et fait disparaître la pastille « vu »), l'autre reste fausse et la parité mobile/TV se rompt en silence.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:1204-1213 — `private fun String?.toMillis()`, copie caractère pour caractère de app-mobile/.../seriesdetail/SeriesDetailScreen.kt:511-520

**Cause.** établie. Cette fonction décide de la donnée qui sert à `isWatched` (TvSeriesScreen.kt:1058-1061) : c'est une règle métier, elle est privée à deux fichiers d'UI et donc hors de portée de la suite de tests JVM.

**Piste.** la déplacer dans `core` à côté de `EpisodeTitle`, qui a déjà été extrait pour exactement ce motif, et la couvrir de tests sur les formats réellement rencontrés dans le catalogue.


## #56 — app-tv/series : faire porter par core le décodage de l'identifiant d'une reprise de série

`app-tv/series`

**Symptôme.** le format `"<seriesId>_<episodeId>"` est désormais construit à un seul endroit (`EpisodeTitle.progressId`, core/model/EpisodeTitle.kt:39) et regroupé à un seul endroit (`RecentPolicy.groupKey`, qui utilise `substringBefore('_')`) — mais il est **relu** à la main ici, avec une troisième écriture. Si le décodage échoue, le repli `?: 0` ouvre la fiche de la série d'identifiant 0 : chargement, puis fiche en erreur, sans que rien n'indique que la carte était illisible.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:319 — `val sid = itm.id.split("_").firstOrNull()?.toIntOrNull() ?: 0`

**Cause.** établie pour la duplication (trois normalisations d'un même format, dont deux en dehors de `core`). Le déclenchement réel du repli `0` reste à établir : il suppose une entrée de reprise dont l'identifiant ne commence pas par un entier.

**Piste.** une fonction de décodage à côté de `EpisodeTitle.progressId`, rendant l'échec explicite plutôt qu'un `0` silencieux, et l'appeler depuis les deux UI — la même ligne existe dans app-mobile/.../series/SeriesScreen.kt:115.


## #57 — app-tv/series : lire le fichier local d'un épisode téléchargé depuis l'action principale de la ligne

`app-tv/series`

**Symptôme.** un épisode téléchargé se relit en diffusion quand on valide la ligne — la cible large, focalisée par défaut, et la seule qui porte la vignette et le titre. Hors ligne, cette action échoue alors que le fichier est sur l'appareil ; l'utilisateur doit deviner que la lecture locale passe par la petite coche à droite.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:1080 — la grande surface de la ligne appelle `onClick = onPlay`, qui diffuse toujours ; seul le bouton de 46 dp aiguille vers `onPlayLocal`, et uniquement sur le statut `COMPLETED` (ligne 1067)

**Cause.** établie. `onPlay` (lignes 899-905) ne consulte jamais `dlItem`, qui est pourtant déjà résolu deux lignes plus haut (`dlItem = downloads.find { it.id == dlId }`, ligne 877) et passé au composable.

**Piste.** faire choisir la source par la ligne — fichier local s'il existe, flux sinon — plutôt que par le bouton sur lequel l'utilisateur atterrit. Le bouton de droite garde alors son rôle de gestion du téléchargement.


## #58 — app-tv/series : unifier le test de recherche vide, écrit de deux façons dans la même fonction

`app-tv/series`

**Symptôme.** une simple espace saisie au clavier virtuel fait basculer l'écran de la vue par genres à la grille plate — mais sans filtrer quoi que ce soit, puisque le filtre, lui, considère la requête vide : la grille affiche l'intégralité du catalogue. L'en-tête continue pendant ce temps d'annoncer « N TITRES - M GENRES », le libellé de la vue par genres qui n'est plus à l'écran.

**Preuve.** app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/series/TvSeriesScreen.kt:274 — `isGroupedView = selectedGenre == null && searchQuery.isEmpty()`, alors que le filtrage (ligne 186) et l'en-tête (ligne 246) testent `searchQuery.isNotBlank()`

**Cause.** établie. Deux prédicats pour une même question dans la même fonction ; l'espace tombe entre les deux.

**Piste.** un seul test de « recherche active », utilisé par la mise en page, le filtrage et l'en-tête. Le `BackHandler` de la ligne 145 utilise encore un troisième test (`isNotEmpty`) : le reprendre au passage.


## #68 — app-tv : garder le bouton « Se connecter » focalisable pendant la validation

`app-tv/setup`

**Symptôme.** l'utilisateur valide, le bouton passe en `Loading` et perd le focus ; à l'échec, le bandeau d'erreur apparaît au-dessus mais plus rien n'est focalisé. Le premier appui directionnel ne sert qu'à réamorcer le focus, qui repart du haut de l'écran (les onglets) : il faut retraverser tout le formulaire pour réessayer.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/setup/TvSetupScreen.kt:254 — `enabled = state !is SetupState.Loading` sur un `Button` Material3, dont le `clickable` interne est le seul mécanisme qui le rend focalisable.

**Cause.** un nœud focalisé qui devient non focalisable fait remonter le focus à la racine ; rien ici ne le rattrape ni ne le rend au bouton une fois `enabled` revenu à `true`. Cause établie par lecture, effet exact à confirmer à l'écran.

**Piste.** laisser le bouton focalisable en permanence et neutraliser seulement l'action pendant `Loading` (ou réclamer le focus dessus au retour d'`Error`), au lieu de le retirer du parcours du focus.


## #69 — app-tv : poser un focus d'arrivée sur l'écran de connexion

`app-tv/setup`

**Symptôme.** c'est le tout premier écran vu à l'installation. Il s'ouvre sans focus : appuyer sur OK — le geste naturel quand l'URL est pré-remplie — ne fait rien, et le premier appui directionnel est consommé à établir le focus au lieu de déplacer quoi que ce soit. Aggravé par le ticket #3 (focus invisible sur cet écran), qui prive l'utilisateur du seul retour visuel lui indiquant où il est.

**Preuve.** cluster/iptv/native/app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/setup/TvSetupScreen.kt:54-282 — le seul `FocusRequester` de l'écran est `fieldFocus` (ligne 376), interne à un champ et réclamé uniquement quand `editing` passe à `true` (lignes 378-385). Aucun focalisable n'est visé à l'entrée, alors que les huit autres écrans de `app-tv` le font (`requestFocus()` présent dans `TvPurchaseScreen`, `TvHomeScreen`, `TvMoviesScreen`, `TvSeriesScreen`, `TvMyListScreen`, `TvDownloadsScreen`, `TvPlayerScreen`, `TvMainScreen`) et que `TvFocusKit.kt:189` expose déjà `Modifier.tvGroupEntry` pour cela.

**Cause.** aucune demande de focus à la composition de l'écran.

**Piste.** viser explicitement un focalisable d'arrivée (l'onglet actif, ou le champ du mode courant) avec l'idiome maison `tvGroupEntry` / `TvFocusEntry`, plutôt que d'ajouter un `FocusRequester` ad hoc. Attention au piège §8.8 : un `LaunchedEffect` clé sur `modeIndex` re-réclamerait le focus à chaque changement d'onglet.


## #48 — core/viewmodel : retenir et annuler la requête de fiche film/série, aujourd'hui laissée en vol

`core/viewmodel`

**Symptôme.** sur réseau lent, ouvrir une fiche, la refermer avant qu'elle n'arrive, puis en ouvrir une autre : si la première réponse revient en dernier, la fiche affichée se remplit avec le **synopsis, l'affiche et la durée d'un autre titre**. L'écran ne le corrige pas de lui-même, le `LaunchedEffect(selectedMovieId)` ayant déjà tiré ; il faut refermer et rouvrir.

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/ContentViewModel.kt:121-134 et :178-191 — `loadMovieDetail`/`loadSeriesDetail` lancent un `viewModelScope.launch` dont le `Job` n'est conservé nulle part, et écrivent `_movieDetail` à l'arrivée sans vérifier que l'identifiant demandé est toujours celui affiché. `clearMovieDetail()` (ContentViewModel.kt:136-139) et `clearSeriesDetail()` (:193-196) remettent l'état à `null` mais n'annulent rien. Les deux UI appellent bien ces fonctions à la fermeture : TvMoviesScreen.kt:147, TvMyListScreen.kt:105 et :109, TvSeriesScreen.kt:142, MovieDetailScreen.kt:60, SeriesDetailScreen.kt:68.

**Cause.** établie par lecture — deux requêtes concurrentes sur le même `MutableStateFlow`, sans garde d'identité à l'écriture. Le garde d'entrée `loadedMovieDetailId == id` (ContentViewModel.kt:122) ne protège que la relecture, pas la course.

**Piste.** conserver le `Job` et l'annuler à chaque nouvelle demande et dans `clear…Detail()`, ou vérifier l'identifiant courant avant d'affecter `_movieDetail`. La même correction vaut mot pour mot pour la fiche série — ne l'écrire qu'une fois.


## #49 — core/viewmodel : annuler le seek différé de playMedia, que stop() laisse survivre

`core/viewmodel`

**Symptôme.** deux lectures enchaînées à moins de 800 ms d'intervalle (retour puis choix d'une autre carte) — le second média est déplacé à la position enregistrée du **premier**, puis la boucle d'enregistrement écrit cette position sous l'identifiant du second, corrompant sa reprise.

**Preuve.** core/src/main/kotlin/com/purple/iptvplayer/core/viewmodel/PlayerViewModel.kt:60-65 — `playMedia()` lance un `viewModelScope.launch { delay(800); playerService.seekTo(startPositionMs) }` dont le `Job` n'est retenu par personne. `stop()` (PlayerViewModel.kt:196-208), dont le commentaire annonce « dernier enregistrement, puis **plus rien** », annule bien `progressSavingJob` et `transitionJob` mais ignore celui-ci, et le `ViewModel` est porté par l'Activity — la coroutine survit donc à la sortie du lecteur.

**Cause.** établie pour le mécanisme ; la fenêtre exacte de reproduction sur appareil reste à mesurer.

**Piste.** retenir ce `Job` comme les deux autres et l'annuler dans `playMedia()` et `stop()` — ou supprimer l'attente arbitraire en attendant que `PlayerService` signale le média prêt plutôt qu'en pariant sur 800 ms.

