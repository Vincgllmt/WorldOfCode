package com.purple.iptvplayer.tv.ui.mylist

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
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
import com.purple.iptvplayer.tv.ui.movies.TvMovieDetailPage
import com.purple.iptvplayer.tv.ui.series.TvSeriesDetailPage
import com.purple.iptvplayer.tv.ui.theme.*
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel

private enum class ListFilter { ALL, MOVIES, SERIES }

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvMyListScreen(
    onPlayMovie:  (url: String, title: String, id: Int, cover: String) -> Unit,
    onPlaySeries: (url: String, title: String, mediaId: String, cover: String) -> Unit,
) {
    val vm:   ContentViewModel  = koinViewModel()
    val dlVm: DownloadViewModel = koinViewModel()
    val playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel()

    val moviesState     by vm.movies.collectAsState()
    val seriesState     by vm.series.collectAsState()
    val movieDetail     by vm.movieDetail.collectAsState()
    val seriesDetail    by vm.seriesDetail.collectAsState()
    val movieWatchlist  by vm.movieFavorites.collectAsState()
    val seriesWatchlist by vm.seriesFavorites.collectAsState()
    val downloads       by dlVm.downloads.collectAsState()

    var filter           by remember { mutableStateOf(ListFilter.ALL) }
    var selectedMovieId  by remember { mutableStateOf<Int?>(null) }
    var selectedSeriesId by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) {
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
            onPlayEpisodes    = { episodes, idx, mediaId, cover ->
                playerVm.playWithEpisodes(episodes, idx, mediaId, cover)
            },
        )
        return
    }

    val allMovies  = (moviesState as? ContentState.Success)?.data ?: emptyList()
    val allSeries  = (seriesState as? ContentState.Success)?.data ?: emptyList()

    val watchlistMovies = remember(allMovies, movieWatchlist)  { allMovies.filter  { movieWatchlist.contains(it.id.toString())  } }
    val watchlistSeries = remember(allSeries, seriesWatchlist) { allSeries.filter  { seriesWatchlist.contains(it.id.toString()) } }

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
                Text("Ma liste", style = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1))
                val total = when (filter) {
                    ListFilter.ALL    -> watchlistMovies.size + watchlistSeries.size
                    ListFilter.MOVIES -> watchlistMovies.size
                    ListFilter.SERIES -> watchlistSeries.size
                }
                Text(
                    "$total TITRE${if (total > 1) "S" else ""}",
                    style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    ListFilter.ALL    to "Tout",
                    ListFilter.MOVIES to "Films",
                    ListFilter.SERIES to "Séries",
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
            ListFilter.ALL    -> watchlistMovies.isEmpty() && watchlistSeries.isEmpty()
            ListFilter.MOVIES -> watchlistMovies.isEmpty()
            ListFilter.SERIES -> watchlistSeries.isEmpty()
        }

        if (isEmpty) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Rounded.BookmarkBorder, null, tint = PurplePalette.Fg4, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("Votre liste est vide", style = LocalPurpleType.current.h3.copy(color = PurplePalette.Fg2))
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Ajoutez des films ou des séries depuis leurs fiches",
                        style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg4),
                    )
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
                    androidx.compose.material3.Text("FILM", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
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
                    androidx.compose.material3.Text("SÉRIE", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
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
