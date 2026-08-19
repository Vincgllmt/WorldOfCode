package com.purple.iptvplayer.tv.ui.series

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.*
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
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.model.Episode
import com.purple.iptvplayer.core.model.SeriesDetail
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.model.SeriesItem
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

    var selectedSeriesId by remember { mutableStateOf<Int?>(null) }
    var selectedGenre    by remember { mutableStateOf<String?>(null) }
    var searchQuery      by remember { mutableStateOf("") }

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

    LaunchedEffect(selectedSeriesId) {
        if (selectedSeriesId == null) {
            delay(30)
            focusManager.clearFocus()
        }
    }

    // ── Full-screen series detail page ────────────────────────────────────────
    if (selectedSeriesId != null) {
        val seriesId = selectedSeriesId!!
        TvSeriesDetailPage(
            seriesId          = seriesId,
            detailState       = detailState,
            downloads         = downloads,
            isInWatchlist     = seriesFavorites.contains(seriesId.toString()),
            onClose           = { selectedSeriesId = null },
            onPlay            = onPlay,
            onToggleWatchlist = { vm.toggleSeriesFavorite(seriesId.toString()) },
            onEnqueue        = { item -> dlVm.enqueue(item) },
            onEnqueueAll     = { items -> dlVm.enqueueAll(items) },
            onCancel         = { id -> dlVm.remove(id) },
            onRetry          = { id -> dlVm.retry(id) },
            onPlayEpisodes   = { episodes, idx, mediaId, cover ->
                playerVm.playWithEpisodes(episodes, idx, mediaId, cover)
            },
        )
        return
    }

    // ── Series list ───────────────────────────────────────────────────────────
    val allSeries = (seriesState as? ContentState.Success)?.data ?: emptyList()
    val allGroups = remember(allSeries) {
        allSeries.mapNotNull { it.group }.distinct().sorted()
    }
    val filtered = remember(allSeries, selectedGenre, searchQuery, seriesFavorites) {
        val base = if (selectedGenre != null) allSeries.filter { it.group == selectedGenre } else allSeries
        val searched = if (searchQuery.isNotBlank()) base.filter { it.name.contains(searchQuery, ignoreCase = true) } else base
        searched.sortedByDescending { seriesFavorites.contains(it.id.toString()) }
    }

    Column(modifier = Modifier.fillMaxSize().background(PurplePalette.Bg1)) {

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
                    Text(
                        when {
                            selectedGenre != null    -> "${filtered.size} TITRES"
                            searchQuery.isNotBlank() -> stringResource(R.string.count_results, filtered.size)
                            else                     -> stringResource(R.string.count_titles, allSeries.size, allGroups.size)
                        },
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
            is ContentState.Error -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text(
                    (seriesState as ContentState.Error).message,
                    style = LocalPurpleType.current.body.copy(color = PurplePalette.Danger),
                )
            }
            else -> {
                val isGroupedView = selectedGenre == null && searchQuery.isEmpty()
                val grouped = remember(allSeries, seriesGenreFavs) {
                    allSeries
                        .filter { !it.group.isNullOrBlank() }
                        .groupBy { it.group!!.trim() }
                        .entries
                        .sortedWith(compareBy(
                            { !seriesGenreFavs.contains(it.key) },
                            { it.key.lowercase() },
                        ))
                        .map { it.key to it.value }
                }
                if (isGroupedView) {
                    LazyColumn(
                        modifier       = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 32.dp),
                    ) {
                        if (seriesRecents.isNotEmpty()) {
                            item("recents_hdr") {
                                Text(
                                    "REPRENDRE LA LECTURE",
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
                                    },
                                    contentPadding        = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    lazyItems(seriesRecents, key = { it.id }) { itm ->
                                        TvRecentCard(
                                            item    = itm,
                                            onPlay  = {
                                                val sid = itm.id.split("_").firstOrNull()?.toIntOrNull() ?: 0
                                                selectedSeriesId = sid
                                            },
                                            onClose = { vm.clearRecentItem(itm.id) },
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
                                LazyRow(
                                    contentPadding        = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    lazyItems(sorted, key = { it.id }) { s ->
                                        TvSeriesPosterCard(
                                            series        = s,
                                            isInWatchlist = seriesFavorites.contains(s.id.toString()),
                                            onClick       = { selectedSeriesId = s.id },
                                            modifier      = Modifier.width(100.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    LazyVerticalGrid(
                        columns               = GridCells.Adaptive(minSize = 140.dp),
                        modifier              = Modifier.fillMaxSize(),
                        contentPadding        = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                        verticalArrangement   = Arrangement.spacedBy(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(filtered, key = { it.id }) { s ->
                            TvSeriesPosterCard(
                                series        = s,
                                isInWatchlist = seriesFavorites.contains(s.id.toString()),
                                onClick       = { selectedSeriesId = s.id },
                                modifier      = Modifier.fillMaxWidth(),
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
                            fontSize   = 10.sp,
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
                Text(
                    "($count)",
                    style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
                )
                Icon(
                    Icons.Rounded.ChevronRight, null,
                    tint     = PurplePalette.Purple300,
                    modifier = Modifier.size(16.dp),
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
    onPlayEpisodes:   (episodes: List<Episode>, idx: Int, mediaId: String, cover: String?) -> Unit,
) {
    BackHandler(enabled = true) { onClose() }

    val firstDetailFocus = remember { FocusRequester() }

    Box(modifier = Modifier.fillMaxSize().background(PurplePalette.Bg1)) {
        when (val ds = detailState) {
            null, is ContentState.Loading -> CircularProgressIndicator(
                color    = PurplePalette.Purple400,
                modifier = Modifier.align(Alignment.Center),
            )
            is ContentState.Error -> Text(
                ds.message,
                style    = LocalPurpleType.current.body.copy(color = PurplePalette.Danger),
                modifier = Modifier.align(Alignment.Center),
            )
            is ContentState.Success -> {
                val d             = ds.data
                val sortedSeasons = d.seasons.keys.sortedBy { it.toIntOrNull() ?: 0 }
                var selectedSeason by remember { mutableStateOf(sortedSeasons.firstOrNull()) }
                val focusManager   = LocalFocusManager.current

                LaunchedEffect(Unit) {
                    try { firstDetailFocus.requestFocus() } catch (_: Exception) {}
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
                            // Défilable plutôt que tronqué à 5 lignes : le synopsis était
                            // coupé sans aucun moyen d'en lire la fin.
                            Text(
                                it,
                                style    = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3),
                                // `weight` et non une hauteur fixe : le synopsis prend
                                // la place *restante*, donc les boutons d'action tiennent
                                // toujours dans l'écran. Avec une hauteur en dur, un long
                                // synopsis les repoussait hors du cadre.
                                modifier = Modifier
                                    .weight(1f, fill = false)
                                    .verticalScroll(rememberScrollState()),
                            )
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
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            lazyItems(episodes, key = { it.id }) { ep ->
                                val dlId   = "ep_${seriesId}_${ep.id}"
                                val dlItem = downloads.find { it.id == dlId }
                                TvEpisodeRow(
                                    // L'action premiere d'une serie est de regarder un
                                    // episode : le focus d'arrivee va donc au premier,
                                    // et non au bouton « Ma liste » comme auparavant —
                                    // depuis lequel aucune direction ne menait aux
                                    // episodes.
                                    modifier         = if (ep == episodes.firstOrNull())
                                                           Modifier.focusRequester(firstDetailFocus)
                                                       else Modifier,
                                    seriesId         = seriesId,
                                    seriesName       = d.name,
                                    seriesCover      = d.cover,
                                    episode          = ep,
                                    dlItem           = dlItem,
                                    onPlay           = {
                                        onPlayEpisodes(episodes, episodes.indexOf(ep), "${seriesId}_${ep.id}", d.cover)
                                        onPlay("", "", "", "")
                                        onClose()
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
                                            onPlayEpisodes(episodes, episodes.indexOf(ep), "${seriesId}_${ep.id}", d.cover)
                                            onPlay("file://$it", ep.title, "${seriesId}_${ep.id}", d.cover ?: "")
                                            onClose()
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
    enabled:  Boolean  = true,
    modifier: Modifier = Modifier,
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
        watchedProgress = progressRepo.getProgress("${seriesId}_${episode.id}")
    }
    val totalDurationMs = remember(episode.duration) { episode.duration.toMillis() }
    val isWatched = remember(watchedProgress, totalDurationMs) {
        totalDurationMs > 0 && (watchedProgress >= totalDurationMs * 0.9f)
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
                if (!coverUrl.isNullOrEmpty()) {
                    AsyncImage(
                        model              = coverUrl,
                        contentDescription = null,
                        contentScale       = ContentScale.Crop,
                        modifier           = Modifier.width(104.dp).height(58.dp).clip(PurpleShapes.Md),
                    )
                } else {
                    Box(
                        modifier         = Modifier.width(104.dp).height(58.dp).clip(PurpleShapes.Md).background(PurplePalette.Bg2),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Rounded.PlayCircle, null, tint = PurplePalette.Fg4, modifier = Modifier.size(20.dp))
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        // Le fournisseur prefixe le titre d'episode par le nom de la
                        // serie : « E1 - The Walking Dead : Dead City De vieilles
                        // connaissances ». Repete a chaque ligne, il noyait le vrai
                        // titre en fin de texte. On ne garde que l'episode.
                        "E${episode.episodeNum}  ·  ${episode.title.stripSeriesName(seriesName)}",
                        style    = LocalPurpleType.current.bodySmall.copy(
                            color          = if (isWatched) PurplePalette.Fg4 else PurplePalette.Fg2,
                            textDecoration = if (isWatched) androidx.compose.ui.text.style.TextDecoration.LineThrough
                                             else androidx.compose.ui.text.style.TextDecoration.None,
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
private fun String.stripSeriesName(seriesName: String): String {
    val cleaned = trim()
    if (seriesName.isBlank()) return cleaned
    if (!cleaned.startsWith(seriesName, ignoreCase = true)) return cleaned
    return cleaned.drop(seriesName.length)
        .trimStart(' ', ':', '-', '\u2013', '\u00A0')
        .ifBlank { cleaned }
}
