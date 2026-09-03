package com.purple.iptvplayer.tv.ui.series

import com.purple.iptvplayer.tv.ui.common.toDisplayString
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.focus.onFocusChanged
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
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Glow
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.data.ProgressPolicy
import com.purple.iptvplayer.core.GenrePolicy
import com.purple.iptvplayer.core.model.EpisodeTitle
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.model.Episode
import com.purple.iptvplayer.core.model.SeriesDetail
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.model.SeriesItem
import com.purple.iptvplayer.tv.ui.common.dpadPageJump
import com.purple.iptvplayer.tv.ui.common.focusAnchor
import com.purple.iptvplayer.tv.ui.common.rememberTvFocusAnchor
import com.purple.iptvplayer.tv.ui.common.rememberTvRowFocus
import com.purple.iptvplayer.tv.ui.common.tvRowEntry
import com.purple.iptvplayer.tv.ui.common.tvRowItem
import com.purple.iptvplayer.tv.ui.common.TvRowFocus
import com.purple.iptvplayer.tv.ui.common.TvRowRemovalFocus
import com.purple.iptvplayer.tv.ui.common.TvScrollableBlock
import com.purple.iptvplayer.tv.ui.common.tvGroupEntry
import com.purple.iptvplayer.tv.ui.common.tvModalTrap
import com.purple.iptvplayer.tv.ui.common.TvErrorContent
import com.purple.iptvplayer.tv.ui.home.TvSearchBar
import com.purple.iptvplayer.tv.ui.movies.TvRecentCard
import com.purple.iptvplayer.tv.ui.movies.TvSectionHeader
import com.purple.iptvplayer.core.viewmodel.DownloadViewModel
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvSeriesScreen(onPlay: (url: String, title: String, mediaId: String, cover: String) -> Unit) {
    val vm:       ContentViewModel  = koinViewModel()
    val dlVm:     DownloadViewModel = koinViewModel()
    val playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel()
    val seriesState      by vm.series.collectAsState()
    val detailState      by vm.seriesDetail.collectAsState()
    val downloads        by dlVm.downloads.collectAsState()
    val recentItems      by vm.recentItems.collectAsState()
    val seriesFavorites  by vm.seriesFavorites.collectAsState()
    val seriesGenreFavs  by vm.seriesGenreFavorites.collectAsState()

    var selectedSeriesId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedGenre    by rememberSaveable { mutableStateOf<String?>(null) }
    // Conservé quand on quitte l'onglet, cf. le porteur d'état de TvMainScreen.
    var searchQuery      by rememberSaveable { mutableStateOf("") }

    // G5 / G6 — même dispositif que TvMoviesScreen : ancre de focus, états de liste hissés
    // au-dessus du `return` anticipé de la fiche, point d'entrée explicite.
    val anchor      = rememberTvFocusAnchor()
    // L'ancre est un `remember` : elle ne survit pas à l'aller-retour au lecteur. Si la
    // fiche est restaurée, on lui redonne son origine — sinon la refermer retomberait sur
    // la première affiche au lieu de celle d'où l'on venait.
    LaunchedEffect(Unit) { selectedSeriesId?.let { anchor.rememberOrigin(it) } }
    val columnState = rememberSaveable(saver = LazyListState.Saver) { LazyListState() }
    val gridState   = rememberSaveable(saver = LazyGridState.Saver) { LazyGridState() }
    val rowStates   = remember { mutableMapOf<String, LazyListState>() }
    // Un point d'entrée par rangée, hissé pour la même raison que `rowStates`.
    val rowFocuses  = remember { mutableMapOf<String, TvRowFocus>() }
    val recentsRow  = rememberTvRowFocus()
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

    // Retirer une entrée de « Reprendre la lecture » emportait le focus avec la carte
    // détruite — cf. §71.
    TvRowRemovalFocus(recentsRow, firstCardFocus, firstCardReady)


    LaunchedEffect(Unit) { vm.loadSeries() }
    LaunchedEffect(selectedSeriesId) {
        selectedSeriesId?.let { vm.loadSeriesDetail(it) }
        if (selectedSeriesId == null) vm.clearSeriesDetail()
    }

    BackHandler(enabled = selectedGenre != null || searchQuery.isNotEmpty()) {
        if (searchQuery.isNotEmpty()) searchQuery = ""
        else selectedGenre = null
    }

    val seriesRecents = remember(recentItems) { recentItems.filter { it.type == "series" } }
    val focusManager  = LocalFocusManager.current

    // G5 — `focusManager.clearFocus()` RETIRÉ : il rendait le focus à la racine, et
    // Compose redescendait au premier focalisable de l'arbre, le rail (G2).

    // ── Full-screen series detail page ────────────────────────────────────────
    if (selectedSeriesId != null) {
        val seriesId = selectedSeriesId!!
        TvSeriesDetailPage(
            seriesId          = seriesId,
            detailState       = detailState,
            downloads         = downloads,
            isInWatchlist     = seriesFavorites.contains(seriesId.toString()),
            // Les deux voies de fermeture passent par le même point (G5).
            onClose           = { selectedSeriesId = null; anchor.restore() },
            onPlay            = onPlay,
            onToggleWatchlist = { vm.toggleSeriesFavorite(seriesId.toString()) },
            onEnqueue        = { item -> dlVm.enqueue(item) },
            onEnqueueAll     = { items -> dlVm.enqueueAll(items) },
            onCancel         = { id -> dlVm.remove(id) },
            onRetry          = { id -> dlVm.retry(id) },
            onPlayEpisodes   = { episodes, idx, seriesId, cover ->
                playerVm.playWithEpisodes(episodes, idx, seriesId, cover)
            },
        )
        return
    }

    // ── Series list ───────────────────────────────────────────────────────────
    val allSeries = (seriesState as? ContentState.Success)?.data ?: emptyList()
    val allGroups = remember(allSeries) {
        GenrePolicy.distinctSorted(allSeries.map { it.group })
    }
    val filtered = remember(allSeries, selectedGenre, searchQuery, seriesFavorites) {
        val base = if (selectedGenre != null) allSeries.filter { it.group == selectedGenre } else allSeries
        val searched = if (searchQuery.isNotBlank()) base.filter { it.name.contains(searchQuery, ignoreCase = true) } else base
        searched.sortedByDescending { seriesFavorites.contains(it.id.toString()) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            // G6 — la première affiche, pas la barre de recherche.
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
                    selectedGenre ?: stringResource(R.string.nav_series),
                    style = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1),
                )
                if (allSeries.isNotEmpty()) {
                    val countLabel = when {
                        selectedGenre != null    -> pluralStringResource(R.plurals.count_titles, filtered.size, filtered.size)
                        searchQuery.isNotBlank() -> pluralStringResource(R.plurals.count_results, filtered.size, filtered.size)
                        else -> {
                            val titlesLabel = pluralStringResource(R.plurals.count_titles, allSeries.size, allSeries.size)
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
                hint     = stringResource(R.string.search_series),
                modifier = Modifier.widthIn(max = 280.dp),
            )
        }

        // ── Content ───────────────────────────────────────────────────────────
        when (seriesState) {
            is ContentState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                CircularProgressIndicator(color = PurplePalette.Purple400)
            }
            is ContentState.Error -> TvErrorContent(
                failure = (seriesState as ContentState.Error).reason,
            )
            else -> {
                val isGroupedView = selectedGenre == null && searchQuery.isEmpty()
                val grouped = remember(allSeries, seriesGenreFavs) {
                    GenrePolicy.groupAndSort(
                        allSeries,
                        { it.group },
                        seriesGenreFavs,
                    )
                }
                if (isGroupedView) {
                    LazyColumn(
                        state          = columnState,
                        modifier       = Modifier.fillMaxSize().dpadPageJump(pageSize = 4),
                        contentPadding = PaddingValues(bottom = 32.dp),
                    ) {
                        if (seriesRecents.isNotEmpty()) {
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
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    lazyItems(seriesRecents, key = { it.id }) { itm ->
                                        TvRecentCard(
                                            item    = itm,
                                            onPlay  = {
                                                val sid = itm.id.split("_").firstOrNull()?.toIntOrNull() ?: 0
                                                selectedSeriesId = sid
                                            },
                                            onRemove = { vm.clearRecentItem(itm.id) },
                                            row      = recentsRow,
                                            modifier = Modifier.tvRowItem(
                                                row     = recentsRow,
                                                key     = itm.id,
                                                isFirst = itm.id == seriesRecents.firstOrNull()?.id,
                                            ),
                                        )
                                    }
                                }
                            }
                        }
                        grouped.forEach { (genre, series) ->
                            item("hdr_$genre") {
                                TvSeriesGenreHeader(
                                    genre       = genre,
                                    count       = series.size,
                                    isFav       = seriesGenreFavs.contains(genre),
                                    onSelect    = { selectedGenre = genre },
                                    onToggleFav = { vm.toggleSeriesGenreFavorite(genre) },
                                )
                            }
                            item("row_$genre") {
                                val sorted = remember(series, seriesFavorites) {
                                    series.sortedByDescending { seriesFavorites.contains(it.id.toString()) }
                                }
                                val isFirstRow = genre == grouped.firstOrNull()?.first
                                val rowFocus   = rowFocuses.getOrPut(genre) { TvRowFocus() }
                                LazyRow(
                                    state                 = rowStates.getOrPut(genre) { LazyListState() },
                                    // `▼` depuis l'en-tête de genre entre par la PREMIÈRE
                                    // affiche, plus par celle du milieu — cf. TvRowFocus.
                                    modifier              = Modifier.tvRowEntry(rowFocus),
                                    contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    lazyItems(sorted, key = { it.id }) { s ->
                                        val isEntryPoint = isFirstRow && s.id == sorted.firstOrNull()?.id
                                        if (isEntryPoint) {
                                            DisposableEffect(Unit) {
                                                firstCardReady = true
                                                onDispose { firstCardReady = false }
                                            }
                                        }
                                        TvSeriesPosterCard(
                                            series        = s,
                                            isInWatchlist = seriesFavorites.contains(s.id.toString()),
                                            onClick       = { anchor.rememberOrigin(s.id); selectedSeriesId = s.id },
                                            modifier      = Modifier
                                                .width(100.dp)
                                                .tvRowItem(
                                                    row     = rowFocus,
                                                    key     = s.id,
                                                    isFirst = s.id == sorted.firstOrNull()?.id,
                                                )
                                                .focusAnchor(anchor, s.id)
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
                            .tvGroupEntry(target = { firstCardFocus.takeIf { firstCardReady && anchor.pending == null } })
                            .dpadPageJump(pageSize = 3),
                        contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),
                        verticalArrangement   = Arrangement.spacedBy(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(filtered, key = { it.id }) { s ->
                            val isEntryPoint = s.id == filtered.firstOrNull()?.id
                            if (isEntryPoint) {
                                DisposableEffect(Unit) {
                                    firstCardReady = true
                                    onDispose { firstCardReady = false }
                                }
                            }
                            TvSeriesPosterCard(
                                series        = s,
                                isInWatchlist = seriesFavorites.contains(s.id.toString()),
                                onClick       = { anchor.rememberOrigin(s.id); selectedSeriesId = s.id },
                                modifier      = Modifier
                                    .fillMaxWidth()
                                    .focusAnchor(anchor, s.id)
                                    .then(if (isEntryPoint) Modifier.focusRequester(firstCardFocus) else Modifier),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── Series poster card ────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSeriesPosterCard(series: SeriesItem, isInWatchlist: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val gradient  = cardGradient(series.name)

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
                if (!series.cover.isNullOrEmpty()) {
                    AsyncImage(
                        model              = series.cover,
                        contentDescription = series.name,
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.fillMaxSize(),
                    )
                }
                // Rating badge
                val rating = series.rating?.takeIf { it.isNotEmpty() && it != "0" && it != "0.0" }
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
                // Watchlist badge
                if (isInWatchlist) {
                    Box(
                        modifier         = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .size(22.dp)
                            .clip(PurpleShapes.Xs)
                            .background(PurplePalette.Bg1.copy(0.9f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Rounded.Bookmark, null, tint = PurplePalette.Purple300, modifier = Modifier.size(13.dp))
                    }
                }
            }
        }
        Text(
            series.name,
            style    = LocalPurpleType.current.bodySmall.copy(
                color = if (isFocused) PurplePalette.Fg1 else PurplePalette.Fg2,
            ),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp, start = 2.dp, end = 2.dp),
        )
    }
}

// ── Series genre header ───────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSeriesGenreHeader(genre: String, count: Int, isFav: Boolean, onSelect: () -> Unit, onToggleFav: () -> Unit) {
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

// ── Full-screen series detail page ────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun TvSeriesDetailPage(
    seriesId:         Int,
    detailState:      ContentState<SeriesDetail>?,
    downloads:        List<DownloadItem>,
    isInWatchlist:    Boolean,
    onClose:          () -> Unit,
    onPlay:           (url: String, title: String, mediaId: String, cover: String) -> Unit,
    onToggleWatchlist: () -> Unit,
    onEnqueue:        (DownloadItem) -> Unit,
    onEnqueueAll:     (List<DownloadItem>) -> Unit,
    onCancel:         (String) -> Unit,
    onRetry:          (String) -> Unit,
    onPlayEpisodes:   (episodes: List<Episode>, idx: Int, seriesId: Int, cover: String?) -> Unit,
) {
    BackHandler(enabled = true) { onClose() }

    val firstDetailFocus = remember { FocusRequester() }
    /**
     * La première ligne d'épisode est-elle **composée** ?
     *
     * Hissé au-dessus du `when (detailState)` : la branche `Success` entre et sort de la
     * composition à chaque rechargement, un `remember` posé dedans repartirait de zéro.
     *
     * Ce drapeau est la clé des deux corrections de focus de la fiche : réclamer un
     * `FocusRequester` détaché lève, et le point d'entrée du groupe doit s'effacer tant
     * que sa cible n'existe pas — même dispositif que G6/G9 sur la grille (§43).
     */
    var firstEpisodeReady by remember { mutableStateOf(false) }
    var episodeFocusClaimed by remember(seriesId) { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            // G4 — même piège modal que la fiche film : le rail restait focalisable
            // derrière, et un `◀` depuis « Lire » l'ouvrait par-dessus la fiche.
            .tvModalTrap(),
    ) {
        when (val ds = detailState) {
            null, is ContentState.Loading -> CircularProgressIndicator(
                color    = PurplePalette.Purple400,
                modifier = Modifier.align(Alignment.Center),
            )
            is ContentState.Error -> TvErrorContent(
                failure = ds.reason,
            )
            is ContentState.Success -> {
                val d             = ds.data
                val sortedSeasons = d.seasons.keys.sortedBy { it.toIntOrNull() ?: 0 }
                var selectedSeason by remember { mutableStateOf(sortedSeasons.firstOrNull()) }
                val focusManager   = LocalFocusManager.current

                // ⚠️ **L'ancien effet ne pouvait pas aboutir** — c'est pour cela que le
                // focus arrivait sur « Ma liste » alors que le code visait déjà le premier
                // épisode. Il partait dès que le détail était chargé ; la `LazyColumn` des
                // épisodes, elle, ne compose ses lignes qu'à la **mise en page** suivante.
                // `firstDetailFocus` n'était donc rattaché à aucun nœud, `requestFocus()`
                // levait, le `catch` avalait — et Compose retombait sur le premier
                // focalisable de l'arbre, le bouton « Ma liste » de la colonne gauche.
                // Piège du G6, mot pour mot (§43).
                //
                // On attend donc que la ligne se compose et le dise. Une seule fois
                // (`episodeFocusClaimed`) : rejouer la demande volerait ensuite le focus à
                // l'utilisateur, le défaut du §40.
                // ⚠️ **Le verrou se pose sur le focus REÇU, jamais sur la demande émise.**
                // La version précédente écrivait `episodeFocusClaimed = true` *avant*
                // `withFrameNanos { }`, donc avant une suspension. Mesuré à l'émulateur
                // (§57) : l'effet est annulé pendant cette suspension et relancé aussitôt
                // — `requestFocus()` n'était jamais atteint, et au second passage le
                // verrou déjà posé faisait sauter la demande. La fiche restait alors
                // **sans aucun focalisable** : `tvModalTrap()` ci-dessus rend le rail
                // inatteignable, donc il n'existe aucun repli, et plus une seule touche
                // ne répondait — seul RETOUR, qui passe par le `BackHandler`.
                //
                // En verrouillant sur `onFocusChanged` de la première ligne, une
                // annulation ne coûte plus rien : l'effet suivant refait la demande, et
                // la protection du §40 — ne pas voler le focus à l'utilisateur — tient
                // toujours, puisque le verrou est posé dès que le focus est arrivé.
                LaunchedEffect(firstEpisodeReady) {
                    if (firstEpisodeReady && !episodeFocusClaimed) {
                        withFrameNanos { }
                        runCatching { firstDetailFocus.requestFocus() }
                    }
                }

                // Ambient background
                if (!d.cover.isNullOrEmpty()) {
                    AsyncImage(
                        model              = d.cover,
                        contentDescription = null,
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.fillMaxSize().alpha(0.10f),
                    )
                }
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(
                            listOf(PurplePalette.Bg1.copy(0.5f), PurplePalette.Bg1),
                        )
                    )
                )

                Row(modifier = Modifier.fillMaxSize()) {
                    // ── Left: cover + info ──────────────────────────────────
                    Column(
                        modifier = Modifier
                            // 280 et non 220 : à 220, « + My list » et « Fermer » côte à
                            // côte ne tenaient pas et le second se repliait une lettre par
                            // ligne. Les lignes d'épisodes ont de la marge de reste, cet
                            // élargissement ne leur coûte rien.
                            .width(280.dp)
                            .fillMaxHeight()
                            .background(PurplePalette.Bg0)
                            .padding(18.dp),
                    ) {
                        if (!d.cover.isNullOrEmpty()) {
                            // Hauteur plafonnée, affiche centrée. En `fillMaxWidth`, le
                            // ratio 2:3 lui donnait 366 dp de haut dans une colonne de
                            // 280 — près de 70 % de la hauteur d'écran — et ne laissait
                            // au synopsis que deux ou trois lignes.
                            Box(
                                modifier         = Modifier.fillMaxWidth(),
                                contentAlignment = Alignment.Center,
                            ) {
                                AsyncImage(
                                    model              = d.cover,
                                    contentDescription = d.name,
                                    contentScale       = ContentScale.Crop,
                                    modifier           = Modifier
                                        .height(228.dp)
                                        .aspectRatio(2f / 3f)
                                        .clip(PurpleShapes.Md),
                                )
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                        Text(
                            d.name,
                            style    = LocalPurpleType.current.h3.copy(color = PurplePalette.Fg1),
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis,
                        )
                        d.plot?.let {
                            Spacer(Modifier.height(10.dp))
                            // `weight` et non une hauteur fixe : le synopsis prend la place
                            // *restante*, donc les boutons d'action tiennent toujours dans
                            // l'écran. Avec une hauteur en dur, un long synopsis les
                            // repoussait hors du cadre.
                            //
                            // Le `verticalScroll` était posé sur le `Text`, qui n'est pas
                            // focalisable : à la télécommande il ne recevait aucune touche
                            // et le synopsis restait coupé net. `TvScrollableBlock` porte
                            // la cible de focus, donc les touches.
                            TvScrollableBlock(modifier = Modifier.weight(1f, fill = false)) {
                                Text(
                                    it,
                                    style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3),
                                )
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        // Les deux actions sur une seule ligne : empilées, elles
                        // mangeaient une hauteur que le synopsis utilise mieux.
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            TvSeriesActionButton(
                                label    = if (isInWatchlist) stringResource(R.string.btn_watchlist_in)
                                           else stringResource(R.string.btn_watchlist_add),
                                icon     = if (isInWatchlist) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                                onClick  = onToggleWatchlist,
                            )
                            // La touche Retour ferme déjà la fiche ; ce bouton n'est là
                            // que pour qui ne le sait pas, d'où sa forme réduite.
                            TvSeriesActionButton(
                                label   = stringResource(R.string.btn_close),
                                icon    = Icons.Rounded.Close,
                                onClick = onClose,
                            )
                        }
                    }

                    // ── Right: seasons + episodes ───────────────────────────
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .padding(18.dp),
                    ) {
                        // Le bouton de téléchargement était au bout de cette rangée pour
                        // économiser une ligne. Sur une série à 37 saisons, l'atteindre
                        // imposait de traverser toutes les saisons : il repasse donc en
                        // dessous, où un simple « bas » y mène.
                        // Season tabs
                        if (sortedSeasons.size > 1) {
                            LazyRow(
                                modifier = Modifier.onPreviewKeyEvent { event ->
                                    if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionDown) {
                                        focusManager.moveFocus(FocusDirection.Down); true
                                    } else false
                                },
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                contentPadding        = PaddingValues(bottom = 12.dp),
                            ) {
                                lazyItems(sortedSeasons) { season ->
                                    TvSeasonTab(
                                        label    = stringResource(R.string.label_season, season),
                                        selected = season == selectedSeason,
                                        onClick  = { selectedSeason = season },
                                    )
                                }
                            }
                        }

                        // Download season button
                        selectedSeason?.let { season ->
                            val eps = d.seasons[season] ?: emptyList()
                            if (eps.isNotEmpty()) {
                                val doneCount = eps.count { ep ->
                                    val id = "ep_${seriesId}_${ep.id}"
                                    downloads.find { it.id == id }?.status?.let {
                                        it == DownloadStatus.COMPLETED ||
                                        it == DownloadStatus.DOWNLOADING ||
                                        it == DownloadStatus.QUEUED
                                    } == true
                                }
                                val allDone = doneCount == eps.size
                                TvSeriesActionButton(
                                    label = buildString {
                                        append(
                                            if (allDone) stringResource(R.string.download_done)
                                            else stringResource(R.string.btn_download_season)
                                        )
                                        if (doneCount > 0 && !allDone) append(" ($doneCount/${eps.size})")
                                    },
                                    icon    = if (allDone) Icons.Rounded.CheckCircle else Icons.Rounded.Download,
                                    enabled = !allDone,
                                    onClick = {
                                        if (!allDone) onEnqueueAll(eps.map { ep ->
                                            DownloadItem(
                                                id         = "ep_${seriesId}_${ep.id}",
                                                type       = DownloadType.EPISODE,
                                                title      = d.name,
                                                subtitle   = "S${ep.season} E${ep.episodeNum} - ${ep.title}",
                                                url        = ep.url,
                                                cover      = d.cover,
                                                seriesId   = seriesId,
                                                seriesName = d.name,
                                                season     = ep.season,
                                                episodeNum = ep.episodeNum,
                                            )
                                        })
                                    },
                                    modifier = Modifier.padding(bottom = 10.dp),
                                )
                            }
                        }


                        // Episode list
                        val episodes = d.seasons[selectedSeason] ?: emptyList()
                        // `▶` depuis « Ma liste » tombait au **milieu** de la liste : à
                        // distance horizontale égale, la recherche directionnelle départage
                        // par l'écart des centres sur l'axe vertical, et « Ma liste » est en
                        // bas d'une colonne de 280 dp. C'est le défaut du §49.3, transposé
                        // de l'axe horizontal à l'axe vertical — et il se corrige de la même
                        // façon : en imposant le point d'entrée.
                        LazyColumn(
                            modifier            = Modifier.tvGroupEntry(
                                target = { firstDetailFocus.takeIf { firstEpisodeReady } },
                            ),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            lazyItems(episodes, key = { it.id }) { ep ->
                                val dlId   = "ep_${seriesId}_${ep.id}"
                                val dlItem = downloads.find { it.id == dlId }
                                val isFirstEpisode = ep.id == episodes.firstOrNull()?.id
                                if (isFirstEpisode) {
                                    DisposableEffect(Unit) {
                                        firstEpisodeReady = true
                                        onDispose { firstEpisodeReady = false }
                                    }
                                }
                                TvEpisodeRow(
                                    // L'action premiere d'une serie est de regarder un
                                    // episode : le focus d'arrivee va donc au premier,
                                    // et non au bouton « Ma liste » comme auparavant —
                                    // depuis lequel aucune direction ne menait aux
                                    // episodes.
                                    modifier         = if (isFirstEpisode)
                                                           Modifier
                                                               .focusRequester(firstDetailFocus)
                                                               // Le verrou du point d'entrée : posé quand le
                                                               // focus est effectivement là, pas quand on l'a
                                                               // demandé. Cf. le commentaire de l'effet.
                                                               .onFocusChanged {
                                                                   if (it.isFocused) episodeFocusClaimed = true
                                                               }
                                                       else Modifier,
                                    seriesId         = seriesId,
                                    seriesName       = d.name,
                                    seriesCover      = d.cover,
                                    episode          = ep,
                                    dlItem           = dlItem,
                                    onPlay           = {
                                        // Cf. la fiche film : ne pas refermer la fiche en
                                        // lançant un épisode, sinon quitter le lecteur ne
                                        // rend pas la liste des épisodes.
                                        onPlayEpisodes(episodes, episodes.indexOf(ep), seriesId, d.cover)
                                        onPlay("", "", "", "")
                                    },
                                    onDownload       = {
                                        onEnqueue(DownloadItem(
                                            id         = dlId,
                                            type       = DownloadType.EPISODE,
                                            title      = d.name,
                                            subtitle   = "S${ep.season} E${ep.episodeNum} - ${ep.title}",
                                            url        = ep.url,
                                            cover      = d.cover,
                                            seriesId   = seriesId,
                                            seriesName = d.name,
                                            season     = ep.season,
                                            episodeNum = ep.episodeNum,
                                        ))
                                    },
                                    onCancelDownload = { onCancel(dlId) },
                                    onRetryDownload  = { onRetry(dlId) },
                                    onPlayLocal      = {
                                        dlItem?.localPath?.let {
                                            // #98 — jumeau du chemin mobile : `onPlayEpisodes`
                                            // amorçait le flux **distant** avant de basculer sur le
                                            // fichier local, et le contexte qu'il posait était
                                            // aussitôt effacé par `playMedia`. Retiré des deux
                                            // côtés le même jour, pour qu'ils ne divergent pas.
                                            onPlay("file://$it", ep.title, EpisodeTitle.progressId(seriesId, ep.id), d.cover ?: "")
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Season tab ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSeasonTab(label: String, selected: Boolean, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Surface(
        onClick           = onClick,
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Pill),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) PurplePalette.Purple400.copy(0.25f) else PurplePalette.Bg3,
            focusedContainerColor = PurplePalette.Purple400.copy(0.35f),
        ),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    if (selected) 2.dp else 1.dp,
                    if (selected) PurplePalette.Purple400 else PurplePalette.Line1,
                ),
                shape = PurpleShapes.Pill,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Pill,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Text(
            label,
            style    = LocalPurpleType.current.meta.copy(
                color      = if (selected || isFocused) PurplePalette.Purple300 else PurplePalette.Fg3,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            ),
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
    }
}

// ── Action button (close / download season) ────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSeriesActionButton(
    label:    String,
    icon:     androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    enabled:  Boolean  = true,
    onClick:  () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    Surface(
        onClick           = { if (enabled) onClick() },
        modifier          = modifier,
        shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = if (enabled) PurplePalette.Bg3 else PurplePalette.Bg2,
            focusedContainerColor = if (enabled) PurplePalette.Bg4 else PurplePalette.Bg2,
        ),
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
            focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 12.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                icon, null,
                tint     = if (isFocused && enabled) PurplePalette.Purple300 else PurplePalette.Fg3,
                modifier = Modifier.size(18.dp),
            )
            Text(
                label,
                style = LocalPurpleType.current.meta.copy(
                    color = if (isFocused && enabled) PurplePalette.Purple300 else PurplePalette.Fg3,
                ),
            )
        }
    }
}

// ── Episode row ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvEpisodeRow(
    modifier:         Modifier = Modifier,
    seriesId:         Int,
    seriesName:       String,
    seriesCover:      String?,
    episode:          Episode,
    dlItem:           DownloadItem?,
    onPlay:           () -> Unit,
    onDownload:       () -> Unit,
    onCancelDownload: () -> Unit,
    onRetryDownload:  () -> Unit,
    onPlayLocal:      () -> Unit,
) {
    val progressRepo: com.purple.iptvplayer.core.data.ProgressRepository = org.koin.compose.koinInject()
    var watchedProgress by remember(episode.id) { mutableLongStateOf(0L) }
    LaunchedEffect(episode.id) {
        watchedProgress = progressRepo.getProgress(EpisodeTitle.progressId(seriesId, episode.id))
    }
    val totalDurationMs = remember(episode.duration) { episode.duration.toMillis() }
    // Même règle de « vu jusqu'au bout » que « Reprendre la lecture » et que la fiche
    // mobile : elle vit dans core, elle n'est plus recopiée ici (#43, §8.2).
    val isWatched = remember(watchedProgress, totalDurationMs) {
        ProgressPolicy.isComplete(watchedProgress, totalDurationMs)
    }

    val (dlIcon, dlTint, dlAction) = when (dlItem?.status) {
        null                       -> Triple(Icons.Rounded.Download,     PurplePalette.Fg4,                 onDownload)
        DownloadStatus.QUEUED      -> Triple(Icons.Rounded.Schedule,     PurplePalette.Purple300.copy(0.6f), onCancelDownload)
        DownloadStatus.DOWNLOADING -> Triple(Icons.Rounded.Downloading,  PurplePalette.Purple300,           onCancelDownload)
        DownloadStatus.COMPLETED   -> Triple(Icons.Rounded.CheckCircle,  PurplePalette.Success,             onPlayLocal)
        DownloadStatus.FAILED      -> Triple(Icons.Rounded.ErrorOutline, PurplePalette.Danger,              onRetryDownload)
    }
    val dlInteraction = remember { MutableInteractionSource() }
    val dlFocused by dlInteraction.collectIsFocusedAsState()

    Row(
        modifier              = modifier.fillMaxWidth(),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        // ── Play surface (thumbnail + title) ─────────────────────────────────
        Surface(
            onClick  = onPlay,
            modifier = Modifier.weight(1f),
            shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
            // Rendu adouci : plus de contour 1 dp autour de chaque ligne — c'est ce
            // liseré, répété sur toute la liste, qui donnait un aspect de tableau. La
            // surface se distingue par un fond translucide, et le focus par un
            // remplissage franc plus une lueur, sans bordure.
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = PurplePalette.Fg1.copy(alpha = 0.04f),
                focusedContainerColor = PurplePalette.Purple400.copy(alpha = 0.28f),
                pressedContainerColor = PurplePalette.Purple400.copy(alpha = 0.36f),
            ),
            scale    = ClickableSurfaceDefaults.scale(focusedScale = 1.015f),
            glow     = ClickableSurfaceDefaults.glow(
                focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 18.dp),
            ),
        ) {
            Row(
                modifier              = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                val coverUrl = episode.cover?.takeIf { it.isNotEmpty() } ?: seriesCover
                Box(modifier = Modifier.width(104.dp).height(58.dp)) {
                    if (!coverUrl.isNullOrEmpty()) {
                        AsyncImage(
                            model              = coverUrl,
                            contentDescription = null,
                            contentScale       = ContentScale.Crop,
                            modifier           = Modifier.fillMaxSize().clip(PurpleShapes.Md),
                        )
                    } else {
                        Box(
                            modifier         = Modifier.fillMaxSize().clip(PurpleShapes.Md).background(PurplePalette.Bg2),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Rounded.PlayCircle, null, tint = PurplePalette.Fg4, modifier = Modifier.size(20.dp))
                        }
                    }
                    // Pastille « vu », comme sur mobile : barrer un titre se lit
                    // « annulé », pas « déjà regardé ».
                    if (isWatched) {
                        Box(
                            modifier = Modifier.fillMaxSize().clip(PurpleShapes.Md)
                                .background(Color.Black.copy(alpha = 0.55f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Box(
                                modifier = Modifier.size(26.dp).clip(CircleShape).background(TvPurple),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Rounded.Check, null, tint = Color.White,
                                    modifier = Modifier.size(17.dp))
                            }
                        }
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        // Le fournisseur prefixe le titre d'episode par le nom de la
                        // serie : « E1 - The Walking Dead : Dead City De vieilles
                        // connaissances ». Repete a chaque ligne, il noyait le vrai
                        // titre en fin de texte. On ne garde que l'episode.
                        "E${episode.episodeNum}  ·  ${EpisodeTitle.stripSeriesName(episode.title, seriesName)}",
                        style    = LocalPurpleType.current.bodySmall.copy(
                            color = if (isWatched) PurplePalette.Fg4 else PurplePalette.Fg2,
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (dlItem?.status == DownloadStatus.DOWNLOADING) {
                        Spacer(Modifier.height(3.dp))
                        LinearProgressIndicator(
                            progress   = { dlItem.progress / 100f },
                            modifier   = Modifier.fillMaxWidth(0.5f).height(2.dp).clip(RoundedCornerShape(1.dp)),
                            color      = PurplePalette.Purple300,
                            trackColor = PurplePalette.Bg2,
                        )
                    }
                }
                Icon(
                    Icons.Rounded.PlayArrow, null,
                    tint     = PurplePalette.Fg4,
                    modifier = Modifier.size(18.dp),
                )
            }
        }

        // ── Download action button ────────────────────────────────────────────
        Surface(
            onClick           = { dlAction() },
            modifier          = Modifier.size(46.dp),
            shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
            colors            = ClickableSurfaceDefaults.colors(
                containerColor        = PurplePalette.Fg1.copy(alpha = 0.04f),
                focusedContainerColor = dlTint.copy(alpha = 0.22f),
            ),
            scale             = ClickableSurfaceDefaults.scale(focusedScale = 1.06f),
            glow              = ClickableSurfaceDefaults.glow(
                focusedGlow = Glow(elevationColor = dlTint, elevation = 10.dp),
            ),
            interactionSource = dlInteraction,
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                if (dlItem?.status == DownloadStatus.DOWNLOADING) {
                    CircularProgressIndicator(
                        progress    = { dlItem.progress / 100f },
                        modifier    = Modifier.size(18.dp),
                        color       = PurplePalette.Purple300,
                        trackColor  = PurplePalette.Bg2,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Icon(
                        dlIcon, null,
                        tint     = if (dlFocused) dlTint else dlTint.copy(0.65f),
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

private fun String?.toMillis(): Long {
    if (this == null) return 0L
    val parts = this.split(":").mapNotNull { it.trim().toLongOrNull() }
    return when (parts.size) {
        3    -> (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
        2    -> (parts[0] * 60 + parts[1]) * 1000
        1    -> parts[0] * 1000
        else -> 0L
    }
}

/**
 * Retire le nom de la série que le fournisseur préfixe au titre d'épisode.
 *
 * Comparaison insensible à la casse et tolérante aux séparateurs (« : », « - », « – »),
 * les panneaux Xtream n'étant pas réguliers. Si le retrait laisse une chaîne vide — un
 * épisode dont le titre *est* le nom de la série — on rend le titre d'origine plutôt
 * qu'une ligne muette.
 */
