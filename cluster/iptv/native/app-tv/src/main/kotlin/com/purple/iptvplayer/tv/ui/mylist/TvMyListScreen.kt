package com.purple.iptvplayer.tv.ui.mylist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
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
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.model.Movie
import com.purple.iptvplayer.core.model.SeriesItem
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.DownloadViewModel
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.movies.TvMovieDetailPage
import com.purple.iptvplayer.tv.ui.series.TvSeriesDetailPage
import com.purple.iptvplayer.tv.ui.common.TvChannelRow
import com.purple.iptvplayer.tv.ui.theme.*
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel
import com.purple.iptvplayer.tv.ui.common.dpadPageJump
import androidx.compose.runtime.withFrameNanos
import com.purple.iptvplayer.tv.ui.theme.TvSurfaceDefaults

private enum class ListFilter { ALL, CHANNELS, MOVIES, SERIES }

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvMyListScreen(
    /** M5 / G7 — cible de l'état vide : un écran TV ne doit jamais en compter zéro. */
    onBrowse:      () -> Unit,
    onPlayMovie:   (url: String, title: String, id: Int, cover: String) -> Unit,
    onPlaySeries:  (url: String, title: String, mediaId: String, cover: String) -> Unit,
    onPlayChannel: (url: String, title: String, streamId: Int) -> Unit,
) {
    val vm:   ContentViewModel  = koinViewModel()
    val dlVm: DownloadViewModel = koinViewModel()
    val playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel()

    // Les chaînes favorites n'étaient affichées nulle part : cet écran ne lisait que
    // movieFavorites et seriesFavorites. Combiné à showFavBtn = false dans la vue de
    // navigation par défaut, une chaîne mise en favori n'était retirable d'aucun écran.
    val channelsState   by vm.channels.collectAsState()
    val channelFavs     by vm.channelFavorites.collectAsState()
    val moviesState     by vm.movies.collectAsState()
    val seriesState     by vm.series.collectAsState()
    val movieDetail     by vm.movieDetail.collectAsState()
    val seriesDetail    by vm.seriesDetail.collectAsState()
    val movieWatchlist  by vm.movieFavorites.collectAsState()
    val seriesWatchlist by vm.seriesFavorites.collectAsState()
    val downloads       by dlVm.downloads.collectAsState()

    var filter           by remember { mutableStateOf(ListFilter.ALL) }

    // §16 — le rail se déplie dès que le focus y entre, et Compose TV l'y renvoie quand
    // l'élément focalisé disparaît : retirer ou déplacer un favori ouvrait donc le
    // panneau latéral « sans raison ». On ne rend le focus au contenu que si la mutation
    // vient d'ici — sans ce garde-fou, on le volerait à qui va délibérément au rail.
    val contentFocus = remember { FocusRequester() }
    var refocusAfterEdit by remember { mutableStateOf(false) }

    var selectedMovieId  by remember { mutableStateOf<Int?>(null) }
    var selectedSeriesId by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) {
        vm.loadChannels()
        vm.loadMovies()
        vm.loadSeries()
    }
    LaunchedEffect(selectedMovieId) {
        selectedMovieId?.let { vm.loadMovieDetail(it) }
        if (selectedMovieId == null) vm.clearMovieDetail()
    }
    LaunchedEffect(selectedSeriesId) {
        selectedSeriesId?.let { vm.loadSeriesDetail(it) }
        if (selectedSeriesId == null) vm.clearSeriesDetail()
    }

    // ── Movie detail overlay ─────────────────────────────────────────────────
    if (selectedMovieId != null) {
        val mid   = selectedMovieId!!
        val dlId  = "movie_$mid"
        val detail = (movieDetail as? ContentState.Success)?.data
        TvMovieDetailPage(
            detail            = detail,
            dlItem            = downloads.find { it.id == dlId },
            isInWatchlist     = movieWatchlist.contains(mid.toString()),
            onClose           = { selectedMovieId = null },
            onPlay            = { url, title, id, cover ->
                onPlayMovie(url, title, id, cover)
                selectedMovieId = null
            },
            onToggleWatchlist = { vm.toggleMovieFavorite(mid.toString()) },
            onDownload        = {
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
            onCancel   = { dlVm.remove(dlId) },
            onRetry    = { dlVm.retry(dlId) },
            onPlayLocal = {
                detail?.let { d ->
                    downloads.find { it.id == dlId }?.localPath?.let {
                        onPlayMovie("file://$it", d.name, d.id, d.cover ?: "")
                        selectedMovieId = null
                    }
                }
            },
        )
        return
    }

    // ── Series detail overlay ────────────────────────────────────────────────
    if (selectedSeriesId != null) {
        val sid = selectedSeriesId!!
        TvSeriesDetailPage(
            seriesId          = sid,
            detailState       = seriesDetail,
            downloads         = downloads,
            isInWatchlist     = seriesWatchlist.contains(sid.toString()),
            onClose           = { selectedSeriesId = null },
            onPlay            = { url, title, mediaId, cover ->
                onPlaySeries(url, title, mediaId, cover)
            },
            onToggleWatchlist = { vm.toggleSeriesFavorite(sid.toString()) },
            onEnqueue         = { item -> dlVm.enqueue(item) },
            onEnqueueAll      = { items -> dlVm.enqueueAll(items) },
            onCancel          = { id -> dlVm.remove(id) },
            onRetry           = { id -> dlVm.retry(id) },
            onPlayEpisodes    = { episodes, idx, seriesId, cover ->
                playerVm.playWithEpisodes(episodes, idx, seriesId, cover)
            },
        )
        return
    }

    val allChannels = (channelsState as? ContentState.Success)?.data ?: emptyList()

    // L'ordre vient des FAVORIS, pas du catalogue (cf. MyListScreen mobile).
    val favChannels = remember(allChannels, channelFavs) {
        val byName = allChannels.associateBy { it.name }
        channelFavs.mapNotNull { byName[it] }
    }
    LaunchedEffect(favChannels.size, refocusAfterEdit) {
        if (refocusAfterEdit) {
            refocusAfterEdit = false
            runCatching { contentFocus.requestFocus() }
        }
    }

    val allMovies  = (moviesState as? ContentState.Success)?.data ?: emptyList()
    val allSeries  = (seriesState as? ContentState.Success)?.data ?: emptyList()

    val watchlistMovies = remember(allMovies, movieWatchlist) {
        val byId = allMovies.associateBy { it.id.toString() }
        movieWatchlist.mapNotNull { byId[it] }
    }
    val watchlistSeries = remember(allSeries, seriesWatchlist) {
        val byId = allSeries.associateBy { it.id.toString() }
        seriesWatchlist.mapNotNull { byId[it] }
    }

    Column(modifier = Modifier.fillMaxSize().background(PurplePalette.Bg1)) {

        // ── Header ─────────────────────────────────────────────────────────
        Row(
            modifier          = Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(stringResource(R.string.mylist_title), style = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1))
                val total = when (filter) {
                    ListFilter.ALL      -> favChannels.size + watchlistMovies.size + watchlistSeries.size
                    ListFilter.CHANNELS -> favChannels.size
                    ListFilter.MOVIES   -> watchlistMovies.size
                    ListFilter.SERIES   -> watchlistSeries.size
                }
                Text(
                    "$total TITRE${if (total > 1) "S" else ""}",
                    style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    ListFilter.ALL      to stringResource(R.string.filter_all),
                    ListFilter.CHANNELS to stringResource(R.string.filter_channels),
                    ListFilter.MOVIES   to stringResource(R.string.filter_movies),
                    ListFilter.SERIES   to stringResource(R.string.filter_series),
                ).forEach { (f, label) ->
                    val active = filter == f
                    Surface(
                        onClick = { filter = f },
                        shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
                        colors  = ClickableSurfaceDefaults.colors(
                            containerColor        = if (active) PurplePalette.Purple400.copy(0.18f) else Color.Transparent,
                            focusedContainerColor = PurplePalette.Purple400.copy(0.25f),
                        ),
                        border  = ClickableSurfaceDefaults.border(
                            border = Border(
                                border = androidx.compose.foundation.BorderStroke(
                                    if (active) 2.dp else 1.dp,
                                    if (active) PurplePalette.Purple400 else PurplePalette.Line1,
                                ),
                                shape = PurpleShapes.Md,
                            ),
                            focusedBorder = Border(
                                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                                shape  = PurpleShapes.Md,
                            ),
                        ),
                        glow = ClickableSurfaceDefaults.glow(focusedGlow = Glow(PurplePalette.Purple400, 8.dp)),
                    ) {
                        Text(
                            label,
                            style    = LocalPurpleType.current.bodySmall.copy(
                                color      = if (active) PurplePalette.Purple300 else PurplePalette.Fg3,
                                fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                            ),
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                }
            }
        }

        // ── Content ────────────────────────────────────────────────────────
        val isEmpty = when (filter) {
            ListFilter.ALL      -> favChannels.isEmpty() && watchlistMovies.isEmpty() && watchlistSeries.isEmpty()
            ListFilter.CHANNELS -> favChannels.isEmpty()
            ListFilter.MOVIES   -> watchlistMovies.isEmpty()
            ListFilter.SERIES   -> watchlistSeries.isEmpty()
        }

        if (isEmpty) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Rounded.BookmarkBorder, null, tint = PurplePalette.Fg4, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(16.dp))
                    Text(stringResource(R.string.mylist_empty), style = LocalPurpleType.current.h3.copy(color = PurplePalette.Fg2))
                    Spacer(Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.mylist_empty_hint),
                        style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg4),
                    )
                    Spacer(Modifier.height(24.dp))
                    TvEmptyStateAction(
                        label   = stringResource(R.string.mylist_empty_cta),
                        onClick = onBrowse,
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                // Le focus revient ici après une modification de la liste.
                columns               = GridCells.Adaptive(minSize = 140.dp),
                modifier              = Modifier.fillMaxSize().dpadPageJump(pageSize = 3),   // G8
                contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),  // M6 — overscan
                verticalArrangement   = Arrangement.spacedBy(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // Pleine largeur : une chaîne est une ligne, pas une affiche 2:3.
                if (filter == ListFilter.ALL || filter == ListFilter.CHANNELS) {
                    itemsIndexed(favChannels, span = { _, _ -> GridItemSpan(maxLineSpan) }, key = { _, c -> "c_" + c.url }) { index, channel ->
                        TvChannelRow(
                            channel  = channel,
                            modifier = if (index == 0) Modifier.focusRequester(contentFocus) else Modifier,
                            onPlay   = { onPlayChannel(channel.url, channel.name, channel.streamId ?: 0) },
                            onFav    = { refocusAfterEdit = true; vm.toggleChannelFavorite(channel.name) },
                            onMoveUp   = if (index > 0) ({ refocusAfterEdit = true; vm.moveChannelFavorite(index, index - 1) }) else null,
                            onMoveDown = if (index < favChannels.lastIndex) ({ refocusAfterEdit = true; vm.moveChannelFavorite(index, index + 1) }) else null,
                        )
                    }
                }
                if (filter == ListFilter.ALL || filter == ListFilter.MOVIES) {
                    items(watchlistMovies, key = { "m_${it.id}" }) { movie ->
                        MyListMovieCard(movie = movie, onClick = { selectedMovieId = movie.id })
                    }
                }
                if (filter == ListFilter.ALL || filter == ListFilter.SERIES) {
                    items(watchlistSeries, key = { "s_${it.id}" }) { series ->
                        MyListSeriesCard(series = series, onClick = { selectedSeriesId = series.id })
                    }
                }
            }
        }
    }
}

// ── Movie card ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun MyListMovieCard(movie: Movie, onClick: () -> Unit) {
    val gradient = Brush.linearGradient(listOf(PurplePalette.Purple700.copy(0.9f), PurplePalette.Bg0))
    Column {
        Surface(
            onClick  = onClick,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f),
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Lg),
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = Color.Transparent,
            ),
            scale  = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
            border = ClickableSurfaceDefaults.border(
                border        = Border(border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1), shape = PurpleShapes.Lg),
                focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400), shape = PurpleShapes.Lg),
            ),
            glow = ClickableSurfaceDefaults.glow(focusedGlow = Glow(PurplePalette.Purple400, 28.dp)),
        ) {
            Box(Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxSize().background(gradient))
                if (!movie.cover.isNullOrEmpty()) {
                    AsyncImage(model = movie.cover, contentDescription = movie.name,
                        contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
                Box(
                    modifier = Modifier.align(Alignment.BottomStart).padding(6.dp)
                        .clip(PurpleShapes.Xs).background(PurplePalette.Purple500.copy(0.92f))
                        .padding(horizontal = 5.dp, vertical = 2.dp),
                ) {
                    androidx.compose.material3.Text(stringResource(R.string.badge_movie), color = Color.White, fontSize =  12.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
        Text(
            movie.name,
            style    = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp, start = 2.dp, end = 2.dp),
        )
    }
}

// ── Series card ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun MyListSeriesCard(series: SeriesItem, onClick: () -> Unit) {
    val gradient = Brush.linearGradient(listOf(PurplePalette.Purple700.copy(0.9f), PurplePalette.Bg0))
    Column {
        Surface(
            onClick  = onClick,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f),
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Lg),
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = Color.Transparent,
            ),
            scale  = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
            border = ClickableSurfaceDefaults.border(
                border        = Border(border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1), shape = PurpleShapes.Lg),
                focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400), shape = PurpleShapes.Lg),
            ),
            glow = ClickableSurfaceDefaults.glow(focusedGlow = Glow(PurplePalette.Purple400, 28.dp)),
        ) {
            Box(Modifier.fillMaxSize()) {
                Box(Modifier.fillMaxSize().background(gradient))
                if (!series.cover.isNullOrEmpty()) {
                    AsyncImage(model = series.cover, contentDescription = series.name,
                        contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
                Box(
                    modifier = Modifier.align(Alignment.BottomStart).padding(6.dp)
                        .clip(PurpleShapes.Xs).background(PurplePalette.Purple700.copy(0.92f))
                        .padding(horizontal = 5.dp, vertical = 2.dp),
                ) {
                    androidx.compose.material3.Text(stringResource(R.string.badge_series), color = Color.White, fontSize =  12.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
        Text(
            series.name,
            style    = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp, start = 2.dp, end = 2.dp),
        )
    }
}


/** Cible unique d'un état vide — même dispositif qu'en G7 (`TvDownloadsScreen`). */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvEmptyStateAction(label: String, onClick: () -> Unit) {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        withFrameNanos { }
        runCatching { focus.requestFocus() }
    }
    Surface(
        onClick  = onClick,
        modifier = Modifier.focusRequester(focus),
        shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
        colors   = TvSurfaceDefaults.onAccent(),
        scale    = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 13.dp),
            style    = LocalPurpleType.current.button,
        )
    }
}
