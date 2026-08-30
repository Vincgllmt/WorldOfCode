package com.purple.iptvplayer.tv.ui.movies

import com.purple.iptvplayer.tv.ui.common.toDisplayString
import androidx.activity.compose.BackHandler
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.runtime.withFrameNanos
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Glow
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.GenrePolicy
import com.purple.iptvplayer.core.MovieTitleCleaner
import com.purple.iptvplayer.core.data.RecentItem
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.model.Movie
import com.purple.iptvplayer.core.model.MovieDetail
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.DownloadViewModel
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.common.dpadPageJump
import com.purple.iptvplayer.tv.ui.common.focusAnchor
import com.purple.iptvplayer.tv.ui.common.rememberTvFocusAnchor
import com.purple.iptvplayer.tv.ui.common.rememberTvRowFocus
import com.purple.iptvplayer.tv.ui.common.tvRowEntry
import com.purple.iptvplayer.tv.ui.common.tvRowItem
import com.purple.iptvplayer.tv.ui.common.TvErrorContent
import com.purple.iptvplayer.tv.ui.common.TvRowFocus
import com.purple.iptvplayer.tv.ui.common.TvScrollableBlock
import com.purple.iptvplayer.tv.ui.navigation.TvLongPressGuard
import com.purple.iptvplayer.tv.ui.common.tvGroupEntry
import com.purple.iptvplayer.tv.ui.common.tvModalTrap
import com.purple.iptvplayer.tv.ui.home.TvSearchBar
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvMoviesScreen(onPlay: (url: String, title: String, id: Int, cover: String) -> Unit) {
    val vm:   ContentViewModel  = koinViewModel()
    val dlVm: DownloadViewModel = koinViewModel()
    val moviesState       by vm.movies.collectAsState()
    val detailState       by vm.movieDetail.collectAsState()
    val downloads         by dlVm.downloads.collectAsState()
    val recentItems       by vm.recentItems.collectAsState()
    val movieFavorites    by vm.movieFavorites.collectAsState()
    val movieGenreFavs    by vm.movieGenreFavorites.collectAsState()

    var selectedMovieId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedGenre   by rememberSaveable { mutableStateOf<String?>(null) }
    // Conservé quand on quitte l'onglet, cf. le porteur d'état de TvMainScreen.
    var searchQuery     by rememberSaveable { mutableStateOf("") }

    // G5 — rendre le focus à l'affiche qui a ouvert la fiche.
    val anchor = rememberTvFocusAnchor()
    // L'ancre est un `remember` : elle ne survit pas à l'aller-retour au lecteur. Si la
    // fiche est restaurée, on lui redonne son origine — sinon la refermer retomberait sur
    // la première affiche au lieu de celle d'où l'on venait.
    LaunchedEffect(Unit) { selectedMovieId?.let { anchor.rememberOrigin(it) } }

    // Hissés AU-DESSUS du `return` anticipé de la fiche : sinon la LazyColumn et ses
    // LazyRow quittent la composition avec elle, et leurs LazyListState — créés
    // implicitement à l'intérieur — meurent avec elles. À la réouverture tout repartait du
    // haut, et l'ancre n'avait plus de nœud composé à qui rendre le focus.
    val columnState = rememberSaveable(saver = LazyListState.Saver) { LazyListState() }
    val gridState   = rememberSaveable(saver = LazyGridState.Saver) { LazyGridState() }
    val rowStates   = remember { mutableMapOf<String, LazyListState>() }
    // Un point d'entrée par rangée, hissé pour la même raison que `rowStates` : il doit
    // survivre à l'ouverture d'une fiche, sinon la rangée oublie où on l'avait laissée.
    val rowFocuses  = remember { mutableMapOf<String, TvRowFocus>() }
    val recentsRow  = rememberTvRowFocus()

    // G6 — point d'entrée de l'onglet. `enter` ne doit rendre un requester QUE s'il est
    // attaché : sur un catalogue en chargement aucune carte n'est composée, et réclamer un
    // requester détaché lève `IllegalStateException`.
    val firstCardFocus = remember { FocusRequester() }
    var firstCardReady by remember { mutableStateOf(false) }

    // G6 — `tvGroupEntry` ne suffit pas seul, constaté à l'émulateur.
    //
    // La boucle de reprise de focus de `TvMainScreen` s'arrête dès que **n'importe quel**
    // focalisable du contenu a le focus. Pendant le chargement du catalogue, le seul
    // composé est la barre de recherche : elle prend le focus, la boucle s'arrête, et
    // `enter` n'est plus jamais réévalué. Le point d'entrée doit donc se réclamer lui-même
    // au moment où il devient disponible.
    //
    // ⚠️ Une seule fois (`entryClaimed`), et jamais après : rejouer cette demande à chaque
    // recomposition volerait le focus à l'utilisateur — c'est le défaut du §40, dont la
    // clé était `selectedIndex` et non un événement ponctuel. Ici la clé bascule une fois,
    // quand la première carte se compose.
    var entryClaimed by remember { mutableStateOf(false) }
    LaunchedEffect(firstCardReady) {
        if (firstCardReady && !entryClaimed) {
            entryClaimed = true
            withFrameNanos { }
            runCatching { firstCardFocus.requestFocus() }
        }
    }


    LaunchedEffect(Unit) { vm.loadMovies() }
    LaunchedEffect(selectedMovieId) {
        selectedMovieId?.let { vm.loadMovieDetail(it) }
        if (selectedMovieId == null) vm.clearMovieDetail()
    }

    BackHandler(enabled = selectedGenre != null || searchQuery.isNotEmpty()) {
        if (searchQuery.isNotEmpty()) searchQuery = ""
        else selectedGenre = null
    }

    val movieRecents = remember(recentItems) { recentItems.filter { it.type == "movie" } }
    val focusManager = LocalFocusManager.current

    // G5 — `focusManager.clearFocus()` a été RETIRÉ d'ici. Il rendait le focus à la
    // racine à chaque fermeture de fiche ; Compose redescendait alors au premier
    // focalisable de l'arbre — le rail — qui se dépliait « tout seul » (G2).

    // ── Full-screen detail page ───────────────────────────────────────────────
    if (selectedMovieId != null) {
        val detail    = (detailState as? ContentState.Success)?.data
        val dlId      = "movie_${selectedMovieId}"
        val dlItem    = downloads.find { it.id == dlId }
        val isInWatchlist = movieFavorites.contains(selectedMovieId?.toString())
        TvMovieDetailPage(
            detail           = detail,
            dlItem           = dlItem,
            isInWatchlist    = isInWatchlist,
            // Les DEUX voies de fermeture (RETOUR et « Fermer ») passent par le même
            // point : c'est ce qui manquait, elles donnaient deux résultats différents.
            onClose          = { selectedMovieId = null; anchor.restore() },
            onPlay           = onPlay,
            onToggleWatchlist = { selectedMovieId?.let { vm.toggleMovieFavorite(it.toString()) } },
            onDownload       = {
                detail?.let { d ->
                    dlVm.enqueue(DownloadItem(
                        id    = dlId,
                        type  = DownloadType.MOVIE,
                        title = d.name,
                        url   = d.url,
                        cover = d.cover ?: d.coverBig,
                    ))
                }
            },
            onCancel    = { dlVm.remove(dlId) },
            onRetry     = { dlVm.retry(dlId) },
            onPlayLocal = {
                detail?.let { d ->
                    dlItem?.localPath?.let {
                        onPlay("file://$it", d.name, d.id, d.cover ?: "")
                    }
                }
            },
        )
        return
    }

    // ── Movies list ───────────────────────────────────────────────────────────
    val allMovies = (moviesState as? ContentState.Success)?.data ?: emptyList()
    val allGroups = remember(allMovies) {
        GenrePolicy.distinctSorted(allMovies.map { it.group })
    }
    val filtered = remember(allMovies, selectedGenre, searchQuery, movieFavorites) {
        val base = if (selectedGenre != null) allMovies.filter { it.group == selectedGenre } else allMovies
        val searched = if (searchQuery.isNotBlank()) base.filter { it.name.contains(searchQuery, ignoreCase = true) } else base
        searched.sortedByDescending { movieFavorites.contains(it.id.toString()) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            // G6 — la barre de recherche était le premier focalisable dans l'ordre de
            // composition, donc le point d'entrée par défaut de l'onglet. La recherche est
            // une action secondaire : elle ne doit pas être ce qu'on trouve en arrivant.
            .tvGroupEntry(target = {
                // ⚠️ G6 et G5 visent le même nœud et se disputaient le focus. Mesuré :
                // fermer une fiche détruit l'élément focalisé, Compose ré-entre dans le
                // groupe, `enter` rendait la PREMIÈRE carte — et l'ancre de G5 n'avait
                // plus rien à restaurer. La rangée repartait du début avec elle.
                //
                // Le point d'entrée s'efface donc tant qu'une restauration est en attente.
                firstCardFocus.takeIf { firstCardReady && anchor.pending == null }
            }),
    ) {

        // ── Header ────────────────────────────────────────────────────────────
        Row(
            modifier          = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (selectedGenre != null) {
                Surface(
                    onClick  = { selectedGenre = null },
                    shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
                    colors   = ClickableSurfaceDefaults.colors(
                        containerColor        = PurplePalette.Bg2,
                        focusedContainerColor = PurplePalette.Bg3,
                    ),
                    border   = ClickableSurfaceDefaults.border(
                        border        = Border(border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1), shape = PurpleShapes.Md),
                        focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400), shape = PurpleShapes.Md),
                    ),
                    modifier = Modifier.padding(end = 16.dp),
                ) {
                    Row(
                        modifier              = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Icon(Icons.Rounded.ArrowBack, null, tint = PurplePalette.Fg2, modifier = Modifier.size(18.dp))
                        Text(stringResource(R.string.action_back), style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2))
                    }
                }
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    selectedGenre ?: stringResource(R.string.nav_movies),
                    style = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1),
                )
                if (allMovies.isNotEmpty()) {
                    val countLabel = when {
                        selectedGenre != null    -> pluralStringResource(R.plurals.count_titles, filtered.size, filtered.size)
                        searchQuery.isNotBlank() -> pluralStringResource(R.plurals.count_results, filtered.size, filtered.size)
                        else -> {
                            val titlesLabel = pluralStringResource(R.plurals.count_titles, allMovies.size, allMovies.size)
                            val genresLabel = pluralStringResource(R.plurals.count_genres, allGroups.size, allGroups.size)
                            "$titlesLabel - $genresLabel"
                        }
                    }
                    Text(
                        countLabel,
                        style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            TvSearchBar(
                query    = searchQuery,
                onQuery  = { q -> searchQuery = q; if (q.isNotEmpty()) selectedGenre = null },
                hint     = stringResource(R.string.search_movies),
                modifier = Modifier.widthIn(max = 280.dp),
            )
        }

        // ── Content ───────────────────────────────────────────────────────────
        when (moviesState) {
            is ContentState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                CircularProgressIndicator(color = PurplePalette.Purple400)
            }
            is ContentState.Error -> TvErrorContent(
                failure = (moviesState as ContentState.Error).reason,
            )
            else -> {
                val isGroupedView = selectedGenre == null && searchQuery.isEmpty()
                val grouped = remember(allMovies, movieGenreFavs) {
                    GenrePolicy.groupAndSort(
                        allMovies,
                        { it.group },
                        movieGenreFavs,
                    )
                }
                if (isGroupedView) {
                    LazyColumn(
                        state          = columnState,
                        modifier       = Modifier.fillMaxSize().dpadPageJump(pageSize = 4),
                        contentPadding = PaddingValues(bottom = 32.dp),
                    ) {
                        if (movieRecents.isNotEmpty()) {
                            item("recents_hdr") {
                                Text(
                                    stringResource(R.string.resume_playback),
                                    style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Purple300),
                                    modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 14.dp, bottom = 6.dp),
                                )
                            }
                            item("recents_row") {
                                LazyRow(
                                    modifier = Modifier.onPreviewKeyEvent { event ->
                                        if (event.type == KeyEventType.KeyDown) when (event.key) {
                                            Key.DirectionUp   -> { focusManager.moveFocus(FocusDirection.Up);   true }
                                            Key.DirectionDown -> { focusManager.moveFocus(FocusDirection.Down); true }
                                            else -> false
                                        } else false
                                    }.tvRowEntry(recentsRow),
                                    // M6 — marge de FIN portée à 48 dp : les guides Android TV demandent 5 % de la
                                    // largeur (96 px sur 1920) en zone d'overscan. Départ inchangé, il aligne
                                    // le contenu sur le titre.
                                    contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                                ) {
                                    lazyItems(movieRecents, key = { it.id }) { itm ->
                                        TvRecentCard(
                                            item    = itm,
                                            onPlay  = { onPlay(itm.url, itm.title, itm.id.toIntOrNull() ?: 0, itm.cover ?: "") },
                                            onRemove = { vm.clearRecentItem(itm.id) },
                                            modifier = Modifier.tvRowItem(
                                                row     = recentsRow,
                                                key     = itm.id,
                                                isFirst = itm.id == movieRecents.firstOrNull()?.id,
                                            ),
                                        )
                                    }
                                }
                            }
                        }
                        grouped.forEach { (genre, movies) ->
                            item("hdr_$genre") {
                                TvMovieGenreHeader(
                                    genre        = genre,
                                    count        = movies.size,
                                    isFav        = movieGenreFavs.contains(genre),
                                    onSelect     = { selectedGenre = genre },
                                    onToggleFav  = { vm.toggleMovieGenreFavorite(genre) },
                                )
                            }
                            item("row_$genre") {
                                val sorted = remember(movies, movieFavorites) {
                                    movies.sortedByDescending { movieFavorites.contains(it.id.toString()) }
                                }
                                val isFirstRow = genre == grouped.firstOrNull()?.first
                                val rowFocus   = rowFocuses.getOrPut(genre) { TvRowFocus() }
                                LazyRow(
                                    // État hissé : la position horizontale survit à
                                    // l'ouverture d'une fiche (G5).
                                    state                 = rowStates.getOrPut(genre) { LazyListState() },
                                    // `▼` depuis l'en-tête de genre entre par la PREMIÈRE
                                    // affiche, plus par celle du milieu — cf. TvRowFocus.
                                    modifier              = Modifier.tvRowEntry(rowFocus),
                                    contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    lazyItems(sorted, key = { it.id }) { movie ->
                                        val isEntryPoint = isFirstRow && movie.id == sorted.firstOrNull()?.id
                                        if (isEntryPoint) {
                                            DisposableEffect(Unit) {
                                                firstCardReady = true
                                                onDispose { firstCardReady = false }
                                            }
                                        }
                                        TvMoviePosterCard(
                                            movie         = movie,
                                            downloads     = downloads,
                                            isInWatchlist = movieFavorites.contains(movie.id.toString()),
                                            onClick       = { anchor.rememberOrigin(movie.id); selectedMovieId = movie.id },
                                            modifier      = Modifier
                                                .width(100.dp)
                                                .tvRowItem(
                                                    row     = rowFocus,
                                                    key     = movie.id,
                                                    isFirst = movie.id == sorted.firstOrNull()?.id,
                                                )
                                                .focusAnchor(anchor, movie.id)
                                                .then(if (isEntryPoint) Modifier.focusRequester(firstCardFocus) else Modifier),
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    LazyVerticalGrid(
                        columns               = GridCells.Adaptive(minSize = 140.dp),
                        state                 = gridState,
                        modifier              = Modifier
                            .fillMaxSize()
                            // G9 — le `▼` depuis la barre de recherche doit tomber sur le
                            // PREMIER résultat, pas sur le plus proche en abscisse.
                            .tvGroupEntry(target = { firstCardFocus.takeIf { firstCardReady && anchor.pending == null } })
                            .dpadPageJump(pageSize = 3),
                        contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),
                        verticalArrangement   = Arrangement.spacedBy(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(filtered, key = { it.id }) { movie ->
                            val isEntryPoint = movie.id == filtered.firstOrNull()?.id
                            if (isEntryPoint) {
                                DisposableEffect(Unit) {
                                    firstCardReady = true
                                    onDispose { firstCardReady = false }
                                }
                            }
                            TvMoviePosterCard(
                                movie         = movie,
                                downloads     = downloads,
                                isInWatchlist = movieFavorites.contains(movie.id.toString()),
                                onClick       = { anchor.rememberOrigin(movie.id); selectedMovieId = movie.id },
                                modifier      = Modifier
                                    .fillMaxWidth()
                                    .focusAnchor(anchor, movie.id)
                                    .then(if (isEntryPoint) Modifier.focusRequester(firstCardFocus) else Modifier),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── Movie poster card ─────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvMoviePosterCard(movie: Movie, downloads: List<DownloadItem>, isInWatchlist: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val gradient  = cardGradient(movie.name)
    val dlId      = "movie_${movie.id}"
    val dlStatus  = downloads.find { it.id == dlId }?.status

    Column(modifier = modifier) {
        Surface(
            onClick           = onClick,
            modifier          = Modifier.fillMaxWidth().aspectRatio(2f / 3f),
            shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Lg),
            colors            = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = Color.Transparent,
            ),
            scale             = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
            border            = ClickableSurfaceDefaults.border(
                border = Border(
                    border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1),
                    shape  = PurpleShapes.Lg,
                ),
                focusedBorder = Border(
                    border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                    shape  = PurpleShapes.Lg,
                ),
            ),
            glow              = ClickableSurfaceDefaults.glow(
                focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 28.dp),
            ),
            interactionSource = interactionSource,
        ) {
            Box(Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxSize().background(gradient))
                if (!movie.cover.isNullOrEmpty()) {
                    AsyncImage(
                        model              = movie.cover,
                        contentDescription = movie.name,
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.fillMaxSize(),
                    )
                }
                // Rating badge
                val rating = movie.rating?.takeIf { it.isNotEmpty() && it != "0" && it != "0.0" }
                if (rating != null) {
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                            .clip(PurpleShapes.Xs)
                            .background(PurplePalette.Purple500.copy(alpha = 0.9f))
                            .padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment     = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                    ) {
                        Icon(
                            Icons.Rounded.Star, null,
                            tint     = PurplePalette.Rating,
                            modifier = Modifier.size(10.dp),
                        )
                        androidx.compose.material3.Text(
                            text       = rating.take(3),
                            color      = Color.White,
                            fontSize   =  12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                // Watchlist + download badges (top-end column)
                Column(
                    modifier              = Modifier.align(Alignment.TopEnd).padding(8.dp),
                    verticalArrangement   = Arrangement.spacedBy(4.dp),
                    horizontalAlignment   = Alignment.End,
                ) {
                    if (isInWatchlist) {
                        Box(
                            modifier         = Modifier.size(22.dp).clip(PurpleShapes.Xs).background(PurplePalette.Bg1.copy(0.9f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Rounded.Bookmark, null, tint = PurplePalette.Purple300, modifier = Modifier.size(13.dp))
                        }
                    }
                    if (dlStatus != null) {
                        Box(
                            modifier         = Modifier.size(22.dp).clip(PurpleShapes.Xs).background(PurplePalette.Bg1.copy(0.9f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = when (dlStatus) {
                                    DownloadStatus.COMPLETED   -> Icons.Rounded.CheckCircle
                                    DownloadStatus.DOWNLOADING -> Icons.Rounded.Downloading
                                    DownloadStatus.QUEUED      -> Icons.Rounded.Schedule
                                    DownloadStatus.FAILED      -> Icons.Rounded.ErrorOutline
                                },
                                contentDescription = null,
                                tint = when (dlStatus) {
                                    DownloadStatus.COMPLETED -> PurplePalette.Success
                                    DownloadStatus.FAILED    -> PurplePalette.Danger
                                    else                     -> PurplePalette.Purple300
                                },
                                modifier = Modifier.size(14.dp),
                            )
                        }
                    }
                }
            }
        }
        Text(
            movie.name,
            style    = LocalPurpleType.current.bodySmall.copy(
                color = if (isFocused) PurplePalette.Fg1 else PurplePalette.Fg2,
            ),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp, start = 2.dp, end = 2.dp),
        )
    }
}

// ── Full-screen movie detail page ─────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun TvMovieDetailPage(
    detail:            MovieDetail?,
    dlItem:            DownloadItem?,
    isInWatchlist:     Boolean,
    onClose:           () -> Unit,
    onPlay:            (url: String, name: String, id: Int, cover: String) -> Unit,
    onToggleWatchlist: () -> Unit,
    onDownload:        () -> Unit,
    onCancel:          () -> Unit,
    onRetry:          () -> Unit,
    onPlayLocal:      () -> Unit,
) {
    // Contrat de `tvModalTrap` : un BackHandler DOIT exister, sinon le focus est enfermé
    // sans issue. Il est là — mais il ne recevait jamais la touche avant B4.
    BackHandler(enabled = true) { onClose() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            // G4 — la fiche se PRÉSENTE comme une modale mais n'en est pas une : elle est
            // rendue à l'intérieur du Box de contenu de TvMainScreen, donc le rail reste un
            // frère focalisable. Un `◀` depuis « Lire » ne trouvait rien à gauche, la
            // recherche s'élargissait au parent, et le rail était là.
            //
            // Le garde-fou du §30, posé côté rail, ne couvre que Haut/Bas : il ne pouvait
            // rien contre l'axe horizontal, qui est justement l'axe de sortie d'une fiche.
            .tvModalTrap(),
    ) {
        if (detail == null) {
            CircularProgressIndicator(
                color    = PurplePalette.Purple400,
                modifier = Modifier.align(Alignment.Center),
            )
        } else {
            val playFocusRequester = remember { FocusRequester() }
            LaunchedEffect(Unit) {
                try { playFocusRequester.requestFocus() } catch (_: IllegalStateException) {}
            }

            // Ambient background — blurred cover art at very low opacity
            if (!detail.coverBig.isNullOrEmpty()) {
                AsyncImage(
                    model              = detail.coverBig,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize().alpha(0.12f),
                )
            }
            Box(
                Modifier.fillMaxSize().background(
                    Brush.verticalGradient(
                        listOf(PurplePalette.Bg1.copy(alpha = 0.5f), PurplePalette.Bg1),
                    )
                )
            )

            Row(modifier = Modifier.fillMaxSize()) {
                // Affiche — en 2:3, son ratio réel.
                //
                // Elle occupait auparavant 24 % de largeur sur toute la hauteur, soit un
                // cadre de ratio 0,43 pour une image de 0,667 : avec ContentScale.Crop,
                // les côtés étaient rognés — d'où l'impression d'affiche étroite et
                // écrasée. Un dégradé la recouvrait en outre par-dessus.
                Box(
                    modifier = Modifier.fillMaxHeight().padding(start = 32.dp, end = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier
                            // 0,62 et non 0,72 : au-delà, l'affiche mangeait assez de
                            // largeur pour que le dernier bouton d'action ne tienne plus
                            // et que son libellé s'écrive verticalement.
                            .fillMaxHeight(0.62f)
                            .aspectRatio(2f / 3f)
                            .shadow(28.dp, PurpleShapes.Lg, clip = false)
                            .clip(PurpleShapes.Lg)
                            .background(PurplePalette.Bg2),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (!detail.coverBig.isNullOrEmpty()) {
                            AsyncImage(
                                model              = detail.coverBig,
                                contentDescription = detail.name,
                                contentScale       = ContentScale.Crop,
                                modifier           = Modifier.fillMaxSize(),
                            )
                        } else {
                            Icon(
                                Icons.Rounded.Movie, null,
                                tint     = PurplePalette.Fg4,
                                modifier = Modifier.size(64.dp),
                            )
                        }
                    }
                }

                // Info + action buttons
                //
                // Le texte vit dans un bloc défilable et les boutons restent **hors** de
                // lui : mis dans le défilement, arriver sur « Lire » aurait fait sauter la
                // vue en bas de fiche, titre compris. Ils gardent leur place, le texte
                // bouge dessous.
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .padding(horizontal = 36.dp, vertical = 40.dp),
                    verticalArrangement = Arrangement.Center,
                ) {
                    TvScrollableBlock(modifier = Modifier.weight(1f, fill = false)) {
                        detail.genre?.let {
                            Text(
                                it.uppercase(),
                                style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Purple300),
                            )
                            Spacer(Modifier.height(10.dp))
                        }
                        Text(
                            // Le fournisseur suffixe souvent « - 2024 » au titre, alors qu'une
                            // puce affiche déjà la date : on retire le doublon. Comparer à
                            // `detail.year` ne suffisait pas — ce champ porte la date
                            // complète (« 2024-01-15 »), jamais la seule année.
                            MovieTitleCleaner.clean(detail.name),
                            style    = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            detail.year?.let     { TvMetaChip(it) }
                            detail.duration?.let { TvMetaChip(it) }
                            detail.rating?.let   { TvMetaChip(stringResource(R.string.label_rating, it)) }
                        }
                        detail.description?.let {
                            Spacer(Modifier.height(20.dp))
                            // Plus de `heightIn` ni de `verticalScroll` ici : le pavé entier
                            // défile, et il est focalisable — un `verticalScroll` posé sur un
                            // `Text` ne recevait aucune touche, faute d'être focalisable.
                            Text(
                                it,
                                style = LocalPurpleType.current.body.copy(color = PurplePalette.Fg2),
                            )
                        }
                        detail.director?.takeIf { it.isNotBlank() }?.let {
                            Spacer(Modifier.height(12.dp))
                            TvMovieMetaRow(stringResource(R.string.label_director), it)
                        }
                        detail.cast?.takeIf { it.isNotBlank() }?.let {
                            Spacer(Modifier.height(6.dp))
                            TvMovieMetaRow(stringResource(R.string.label_cast), it)
                        }
                    }
                    Spacer(Modifier.height(28.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        TvDetailButton(
                            label    = stringResource(R.string.btn_play),
                            icon     = Icons.Rounded.PlayArrow,
                            primary  = true,
                            modifier = Modifier.focusRequester(playFocusRequester),
                            onClick  = {
                                // La fiche ne se referme PLUS en lançant la lecture.
                                // C'est cette ligne qui faisait qu'en quittant le lecteur
                                // on retombait sur la liste : l'état était mis à null
                                // *avant* de partir, il n'y avait donc rien à restaurer.
                                // Signalé à l'usage — l'attente est de revenir sur la fiche.
                                onPlay(detail.url, detail.name, detail.id, detail.cover ?: detail.coverBig ?: "")
                            },
                        )
                        TvDownloadActionButton(
                            dlItem     = dlItem,
                            onDownload = onDownload,
                            onCancel   = onCancel,
                            onRetry    = onRetry,
                            onPlay     = onPlayLocal,
                        )
                        TvDetailButton(
                            label   = if (isInWatchlist) stringResource(R.string.btn_watchlist_in)
                                      else stringResource(R.string.btn_watchlist_add),
                            icon    = if (isInWatchlist) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                            primary = false,
                            onClick = onToggleWatchlist,
                        )
                        TvDetailButton(
                            label   = stringResource(R.string.btn_close),
                            icon    = Icons.Rounded.Close,
                            primary = false,
                            onClick = onClose,
                        )
                    }
                }
            }
        }
    }
}

// ── Shared public components ──────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvSectionHeader(title: String, modifier: Modifier = Modifier) {
    Text(
        text     = title.uppercase(),
        style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Purple300),
        modifier = modifier.padding(bottom = 6.dp, top = 4.dp),
    )
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvThemeCard(
    label:    String,
    count:    Int,
    itemType: String,
    onClick:  () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Surface(
        onClick           = onClick,
        modifier          = modifier.fillMaxWidth(),
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Bg2,
            focusedContainerColor = PurplePalette.Bg3,
            pressedContainerColor = PurplePalette.Bg4,
        ),
        scale             = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1),
                shape  = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Md,
            ),
        ),
        glow              = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 16.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier          = Modifier.fillMaxWidth().padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier         = Modifier
                    .size(48.dp)
                    .clip(PurpleShapes.Sm)
                    .background(PurplePalette.Purple400.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Rounded.Folder, null,
                    tint     = PurplePalette.Purple300,
                    modifier = Modifier.size(24.dp),
                )
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    label.uppercase(),
                    style    = LocalPurpleType.current.bodySmall.copy(
                        color      = PurplePalette.Fg1,
                        fontWeight = FontWeight.Bold,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "$count $itemType",
                    style = LocalPurpleType.current.meta.copy(color = PurplePalette.Fg3),
                )
            }
            Icon(
                Icons.Rounded.ChevronRight, null,
                tint     = if (isFocused) PurplePalette.Purple300 else PurplePalette.Fg4,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

/**
 * Carte de la rangée « Reprendre la lecture ».
 *
 * **Le défaut corrigé.** `onClose` était déclaré, transmis par les deux écrans… et jamais
 * branché : rien, dans la carte, ne l'appelait. Sur mobile le retrait passe par une croix
 * qu'on touche ; sur TV il n'existait tout simplement **aucun** moyen de retirer une
 * entrée. Huitième occurrence du motif §8.7 — devant un contrôle inerte, chercher d'abord
 * s'il est câblé.
 *
 * **Pourquoi un appui long plutôt qu'une croix.** Une croix focalisable ajoute un
 * focalisable par carte dans une rangée horizontale : `▶` ne passerait plus d'une affiche
 * à la suivante mais de l'affiche à sa croix, doublant le nombre d'appuis pour parcourir la
 * rangée (§8.10). L'appui long est le geste des lanceurs Android TV pour la même action, et
 * `androidx.tv.material3.Surface` le gère nativement (`onLongClick` = `repeatCount` 1 sur
 * `DPAD_CENTER`). Il n'est en revanche pas découvrable seul : la carte focalisée l'annonce.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvRecentCard(
    item: RecentItem,
    onPlay: () -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    var confirming by remember { mutableStateOf(false) }

    if (confirming) {
        TvConfirmDialog(
            title      = stringResource(R.string.recent_remove_title),
            message    = item.title,
            confirm    = stringResource(R.string.action_remove),
            cancel     = stringResource(R.string.action_cancel),
            onConfirm  = { confirming = false; onRemove() },
            onDismiss  = { confirming = false },
        )
    }

    Surface(
        onClick           = onPlay,
        onLongClick       = { confirming = true },
        modifier          = modifier.size(width = 260.dp, height = 146.dp),
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Bg2,
            focusedContainerColor = PurplePalette.Bg2,
        ),
        scale             = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1),
                shape  = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Md,
            ),
        ),
        glow              = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 20.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Box(Modifier.fillMaxSize()) {
            if (!item.cover.isNullOrEmpty()) {
                AsyncImage(
                    model              = item.cover,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize().alpha(0.5f),
                )
            }
            Box(
                Modifier.fillMaxSize().background(
                    Brush.verticalGradient(listOf(Color.Transparent, PurplePalette.Bg1.copy(0.9f))),
                )
            )
            Column(
                modifier            = Modifier.fillMaxSize().padding(14.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        item.title,
                        style    = LocalPurpleType.current.bodySmall.copy(
                            color      = Color.White,
                            fontWeight = FontWeight.Bold,
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    // La carte focalisée annonce l'appui long **à la place** de sa
                    // pastille de type : la hauteur est fixe (146 dp), un troisième
                    // élément dans cette colonne la ferait déborder. La pastille est
                    // informative, l'indication est actionnable — c'est elle qui prime
                    // au moment où l'utilisateur peut agir.
                    if (isFocused) {
                        Text(
                            stringResource(R.string.recent_hint_remove),
                            style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Purple200),
                        )
                    } else {
                        val typeLabel = when (item.type) {
                            "movie"  -> stringResource(R.string.tab_movies)
                            "series" -> stringResource(R.string.tab_series)
                            else     -> stringResource(R.string.tab_live)
                        }
                        Box(
                            Modifier
                                .clip(PurpleShapes.Xs)
                                .background(PurplePalette.Purple400.copy(0.35f))
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        ) {
                            Text(
                                typeLabel,
                                style = LocalPurpleType.current.capsLabel.copy(color = Color.White),
                            )
                        }
                    }
                    if (item.duration > 0) {
                        LinearProgressIndicator(
                            progress    = { item.progress.toFloat() / item.duration },
                            modifier    = Modifier.fillMaxWidth().height(3.dp).clip(PurpleShapes.Pill),
                            color       = PurplePalette.Purple400,
                            trackColor  = Color.White.copy(0.2f),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Confirmation à deux boutons, pour une action destructive à la télécommande.
 *
 * Le focus arrive sur **Annuler** : un appui long mal maîtrisé ne doit pas pouvoir
 * enchaîner sur une suppression au coup d'`OK` suivant.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvConfirmDialog(
    title: String,
    message: String,
    confirm: String,
    cancel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val cancelFocus = remember { FocusRequester() }

    /**
     * ⚠️ **Le relâchement de l'appui long arrive dans le dialogue.**
     *
     * Signalé à l'usage : « l'encart s'ouvre bien mais lorsque je lâche le bouton il
     * disparaît ». Ce n'est pas un défaut d'affichage. `onLongClick` part au **`repeatCount`
     * 1** de `DPAD_CENTER`, c'est-à-dire pendant que la touche est encore enfoncée ; le
     * dialogue s'ouvre, prend le focus de fenêtre, et c'est **lui** qui reçoit l'`ACTION_UP`
     * quand l'utilisateur relâche. `androidx.tv.material3.Surface` déclenche son `onClick`
     * sur cet `ACTION_UP` — sans avoir jamais vu l'`ACTION_DOWN` correspondant — donc
     * « Annuler », qui porte le focus d'arrivée, se valide tout seul.
     *
     * On avale donc tout relâchement d'`OK` tant qu'aucun appui n'a été vu **dans le
     * dialogue**. Un relâchement sans appui n'appartient pas à cette fenêtre.
     */
    var enterArmed by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Box(
            Modifier
                .widthIn(max = 460.dp)
                .onPreviewKeyEvent { event ->
                    if (!TvLongPressGuard.isConfirmKey(event.key)) return@onPreviewKeyEvent false
                    // Seul un appui NEUF arme (`repeatCount == 0`). Les répétitions
                    // automatiques qui arrivent ici appartiennent à la pression encore
                    // tenue qui vient d'ouvrir ce dialogue : les compter armait le garde
                    // et laissait « Annuler » se valider au relâchement.
                    if (TvLongPressGuard.arms(event.key, event.type, event.nativeKeyEvent.repeatCount)) {
                        enterArmed = true
                    }
                    TvLongPressGuard.swallows(event.key, event.type, enterArmed)
                }
                .clip(PurpleShapes.Lg)
                .background(PurplePalette.Bg2)
                .border(1.dp, PurplePalette.Line1, PurpleShapes.Lg),
        ) {
            Column(Modifier.padding(24.dp)) {
                Text(title, style = LocalPurpleType.current.h2.copy(color = PurplePalette.Fg1))
                Spacer(Modifier.height(8.dp))
                Text(
                    message,
                    style    = LocalPurpleType.current.body.copy(color = PurplePalette.Fg3),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(20.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TvDialogButton(
                        label    = cancel,
                        onClick  = onDismiss,
                        modifier = Modifier.focusRequester(cancelFocus),
                    )
                    TvDialogButton(label = confirm, danger = true, onClick = onConfirm)
                }
            }
        }
    }
    LaunchedEffect(Unit) {
        withFrameNanos { }
        runCatching { cancelFocus.requestFocus() }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvDialogButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    danger: Boolean = false,
) {
    val accent = if (danger) PurplePalette.Danger else PurplePalette.Purple400
    Surface(
        onClick  = onClick,
        modifier = modifier,
        shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Bg3,
            focusedContainerColor = accent,
            contentColor          = PurplePalette.Fg2,
            focusedContentColor   = Color.White,
        ),
        border   = ClickableSurfaceDefaults.border(
            border        = Border(border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1), shape = PurpleShapes.Md),
            focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, accent), shape = PurpleShapes.Md),
        ),
    ) {
        Text(
            label,
            style    = LocalPurpleType.current.body,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvActiveFilterChip(genre: String, onClear: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    Surface(
        onClick           = onClear,
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Pill),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Purple400.copy(alpha = 0.2f),
            focusedContainerColor = PurplePalette.Purple400.copy(alpha = 0.3f),
        ),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Purple400.copy(0.4f)),
                shape  = PurpleShapes.Pill,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Pill,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(Icons.Rounded.FilterList, null, tint = PurplePalette.Purple300, modifier = Modifier.size(16.dp))
            Text(genre, style = LocalPurpleType.current.meta.copy(color = PurplePalette.Purple300))
            Icon(Icons.Rounded.Close, null, tint = PurplePalette.Purple300, modifier = Modifier.size(14.dp))
        }
    }
}

// ── Movie meta row (director / cast) ─────────────────────────────────────────

@Composable
private fun TvMovieMetaRow(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(
            "$label :",
            style = LocalPurpleType.current.bodySmall.copy(
                color      = PurplePalette.Fg4,
                fontWeight = FontWeight.SemiBold,
            ),
        )
        Text(
            value,
            style    = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// ── Movie genre header ────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvMovieGenreHeader(genre: String, count: Int, isFav: Boolean, onSelect: () -> Unit, onToggleFav: () -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Surface(
            onClick  = onSelect,
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Sm),
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = PurplePalette.Purple400.copy(0.12f),
            ),
            border   = ClickableSurfaceDefaults.border(
                border        = Border(border = androidx.compose.foundation.BorderStroke(0.dp, Color.Transparent), shape = PurpleShapes.Sm),
                focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400), shape = PurpleShapes.Sm),
            ),
            glow     = ClickableSurfaceDefaults.glow(
                focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 8.dp),
            ),
            modifier = Modifier.weight(1f),
        ) {
            Row(
                modifier              = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (isFav) {
                    Icon(Icons.Rounded.Bookmark, null, tint = PurplePalette.Purple300, modifier = Modifier.size(14.dp))
                }
                Text(
                    genre.uppercase(),
                    style    = LocalPurpleType.current.capsLabel.copy(
                        color      = PurplePalette.Fg1,
                        fontWeight = FontWeight.ExtraBold,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                // G12 — l'en-tête EST une action : elle ouvre la vue complète du genre,
                // seule échappatoire aux 566 appuis `▶` d'une rangée d'ANIMATION. Mais
                // rien ne le signalait : elle ressemblait à un titre de section, et le
                // chevron de 16 dp à 32 % d'opacité ne se lit pas à trois mètres.
                Text(
                    stringResource(R.string.action_see_all, count),
                    style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Purple300),
                )
                Icon(
                    Icons.Rounded.ChevronRight, null,
                    tint     = PurplePalette.Purple300,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        Surface(
            onClick  = onToggleFav,
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = if (isFav) PurplePalette.Purple400.copy(0.15f) else Color.Transparent,
                focusedContainerColor = PurplePalette.Purple400.copy(0.25f),
            ),
            border   = ClickableSurfaceDefaults.border(
                border        = Border(
                    border = androidx.compose.foundation.BorderStroke(if (isFav) 1.dp else 0.dp, PurplePalette.Purple400.copy(0.4f)),
                    shape  = PurpleShapes.Xs,
                ),
                focusedBorder = Border(
                    border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                    shape  = PurpleShapes.Xs,
                ),
            ),
            modifier = Modifier.size(32.dp),
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(
                    if (isFav) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                    null,
                    tint     = if (isFav) PurplePalette.Purple300 else PurplePalette.Fg3,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

// ── Private helpers ───────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvDetailButton(
    label:    String,
    icon:     androidx.compose.ui.graphics.vector.ImageVector,
    primary:  Boolean,
    modifier: Modifier = Modifier,
    onClick:  () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    Surface(
        onClick           = onClick,
        modifier          = modifier,
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = if (primary) PurplePalette.Purple400 else PurplePalette.Bg3,
            focusedContainerColor = if (primary) PurplePalette.Purple400 else PurplePalette.Bg3,
            pressedContainerColor = if (primary) PurplePalette.Purple600 else PurplePalette.Bg4,
        ),
        scale             = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    1.5.dp,
                    if (primary) Color.Transparent else PurplePalette.Line1,
                ),
                shape = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Md,
            ),
        ),
        glow              = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevationColor = PurplePalette.Purple400,
                elevation      = if (primary) 24.dp else 12.dp,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 22.dp, vertical = 14.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(22.dp))
            Text(label, style = LocalPurpleType.current.button.copy(color = Color.White))
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvDownloadActionButton(
    dlItem:     DownloadItem?,
    onDownload: () -> Unit,
    onCancel:   () -> Unit,
    onRetry:    () -> Unit,
    onPlay:     () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val (icon, label, accentColor) = when (dlItem?.status) {
        null                       -> Triple(Icons.Rounded.Download,    R.string.btn_download,    PurplePalette.Purple300)
        DownloadStatus.QUEUED      -> Triple(Icons.Rounded.Schedule,    R.string.download_queued, PurplePalette.Fg3)
        DownloadStatus.DOWNLOADING -> Triple(Icons.Rounded.Downloading, R.string.download_active, PurplePalette.Purple300)
        DownloadStatus.COMPLETED   -> Triple(Icons.Rounded.CheckCircle, R.string.download_done,   PurplePalette.Success)
        DownloadStatus.FAILED      -> Triple(Icons.Rounded.Refresh,     R.string.btn_retry,       PurplePalette.Danger)
    }
    val onClick = when (dlItem?.status) {
        null                       -> onDownload
        DownloadStatus.QUEUED      -> onCancel
        DownloadStatus.DOWNLOADING -> onCancel
        DownloadStatus.COMPLETED   -> onPlay
        DownloadStatus.FAILED      -> onRetry
    }

    Surface(
        onClick           = onClick,
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Bg3,
            focusedContainerColor = PurplePalette.Bg3,
        ),
        scale             = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(1.5.dp, PurplePalette.Line1),
                shape  = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(3.dp, accentColor),
                shape  = PurpleShapes.Md,
            ),
        ),
        glow              = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(elevationColor = accentColor, elevation = 16.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 22.dp, vertical = 14.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (dlItem?.status == DownloadStatus.DOWNLOADING) {
                CircularProgressIndicator(
                    progress    = { dlItem.progress / 100f },
                    modifier    = Modifier.size(22.dp),
                    color       = accentColor,
                    trackColor  = PurplePalette.Bg1,
                    strokeWidth = 2.dp,
                )
            } else {
                Icon(
                    icon, null,
                    tint     = if (isFocused) accentColor else PurplePalette.Fg3,
                    modifier = Modifier.size(22.dp),
                )
            }
            Text(
                stringResource(label),
                style = LocalPurpleType.current.button.copy(
                    color = if (isFocused) accentColor else PurplePalette.Fg3,
                ),
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvMetaChip(text: String) {
    Box(
        modifier = Modifier
            .clip(PurpleShapes.Sm)
            .background(PurplePalette.Bg3)
            .border(1.dp, PurplePalette.Line1, PurpleShapes.Sm)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(text, style = LocalPurpleType.current.meta.copy(color = PurplePalette.Fg2))
    }
}

