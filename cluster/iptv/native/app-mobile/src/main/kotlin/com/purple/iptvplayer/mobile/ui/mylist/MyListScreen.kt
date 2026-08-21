package com.purple.iptvplayer.mobile.ui.mylist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import androidx.compose.foundation.lazy.grid.GridItemSpan
import com.purple.iptvplayer.R
import com.purple.iptvplayer.core.model.Channel
import com.purple.iptvplayer.core.model.Movie
import com.purple.iptvplayer.core.model.SeriesItem
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.mobile.ui.common.ChannelRow
import com.purple.iptvplayer.mobile.ui.theme.*
import org.koin.androidx.compose.koinViewModel

private enum class ListFilter { ALL, CHANNELS, MOVIES, SERIES }

@Composable
fun MyListScreen(
    onMovieDetail:  (id: Int) -> Unit,
    onSeriesDetail: (id: Int) -> Unit,
    onPlayChannel:  (url: String, title: String, cover: String, streamId: Int) -> Unit,
) {
    val vm: ContentViewModel = koinViewModel()

    // Les favoris de chaînes étaient écrits par FavoritesRepository et lus par personne :
    // cet écran ne consommait que movieFavorites et seriesFavorites. L'étoile de la liste
    // des chaînes n'avait donc aucun effet visible.
    val channelsState   by vm.channels.collectAsState()
    val channelFavs     by vm.channelFavorites.collectAsState()
    val moviesState     by vm.movies.collectAsState()
    val seriesState     by vm.series.collectAsState()
    val movieWatchlist  by vm.movieFavorites.collectAsState()
    val seriesWatchlist by vm.seriesFavorites.collectAsState()

    // L'ordinal plutôt que l'enum : le sauveur par défaut ne couvre que les types
    // supportés par Bundle.
    var filterIndex by rememberSaveable { mutableIntStateOf(ListFilter.ALL.ordinal) }
    var filter by remember(filterIndex) { mutableStateOf(ListFilter.entries[filterIndex]) }

    LaunchedEffect(Unit) {
        vm.loadChannels()
        vm.loadMovies()
        vm.loadSeries()
    }

    val allChannels = (channelsState as? ContentState.Success)?.data ?: emptyList()
    // L'ordre vient des FAVORIS, pas du catalogue : parcourir allChannels et filtrer
    // redonnerait l'ordre du fournisseur et rendrait le réordonnancement sans effet.
    val favChannels = remember(allChannels, channelFavs) {
        val byName = allChannels.associateBy { it.name }
        channelFavs.mapNotNull { byName[it] }
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

    Column(modifier = Modifier.fillMaxSize().background(BgApp)) {

        // ── Header ──────────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(BgCard)
                .statusBarsPadding()
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp),
        ) {
            val total = when (filter) {
                ListFilter.ALL      -> favChannels.size + watchlistMovies.size + watchlistSeries.size
                ListFilter.CHANNELS -> favChannels.size
                ListFilter.MOVIES   -> watchlistMovies.size
                ListFilter.SERIES   -> watchlistSeries.size
            }
            Text(stringResource(R.string.mylist_title), color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            if (total > 0) {
                Text(
                    "$total titre${if (total > 1) "s" else ""}",
                    color = TextSub, fontSize = 13.sp,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    ListFilter.ALL to stringResource(R.string.filter_all),
                    ListFilter.CHANNELS to stringResource(R.string.filter_channels),
                    ListFilter.MOVIES to stringResource(R.string.filter_movies),
                    ListFilter.SERIES to stringResource(R.string.filter_series),
                ).forEach { (f, label) ->
                    val active = filter == f
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(if (active) Purple else BgHome)
                            .clickable { filter = f }
                            .padding(horizontal = 14.dp, vertical = 7.dp),
                    ) {
                        Text(
                            label,
                            color      = if (active) TextPrimary else TextSub,
                            fontSize   = 13.sp,
                            fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                }
            }
        }

        // ── Content ──────────────────────────────────────────────────────────
        val isEmpty = when (filter) {
            ListFilter.ALL      -> favChannels.isEmpty() && watchlistMovies.isEmpty() && watchlistSeries.isEmpty()
            ListFilter.CHANNELS -> favChannels.isEmpty()
            ListFilter.MOVIES   -> watchlistMovies.isEmpty()
            ListFilter.SERIES   -> watchlistSeries.isEmpty()
        }

        if (isEmpty) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                    Icon(Icons.Rounded.BookmarkBorder, null, tint = TextSub.copy(0.4f), modifier = Modifier.size(56.dp))
                    Spacer(Modifier.height(16.dp))
                    Text(stringResource(R.string.mylist_empty), color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    // M5 — c'était un littéral français codé en dur : le même défaut que
                    // M1, sur l'autre application. La formulation est désormais partagée
                    // avec `app-tv`, et elle cite bien les trois types.
                    Text(
                        stringResource(R.string.mylist_empty_hint),
                        color = TextSub, fontSize = 14.sp, lineHeight = 20.sp,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                columns               = GridCells.Fixed(3),
                modifier              = Modifier.fillMaxSize(),
                contentPadding        = PaddingValues(horizontal = 12.dp, vertical = 12.dp),
                verticalArrangement   = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Pleine largeur : une chaîne est une ligne, pas une affiche 2:3.
                if (filter == ListFilter.ALL || filter == ListFilter.CHANNELS) {
                    itemsIndexed(favChannels, span = { _, _ -> GridItemSpan(maxLineSpan) }, key = { _, c -> "c_" + c.url }) { index, channel ->
                        ChannelRow(
                            channel = channel,
                            isFav   = true,
                            onPlay  = { onPlayChannel(channel.url, channel.name, channel.logo ?: "", channel.streamId ?: 0) },
                            onFav   = { vm.toggleChannelFavorite(channel.name) },
                            // Les extrémités n'ont pas de voisin : le bouton correspondant
                            // est désactivé plutôt que d'échouer en silence.
                            onMoveUp   = if (index > 0) ({ vm.moveChannelFavorite(index, index - 1) }) else null,
                            onMoveDown = if (index < favChannels.lastIndex) ({ vm.moveChannelFavorite(index, index + 1) }) else null,
                        )
                    }
                }
                if (filter == ListFilter.ALL || filter == ListFilter.MOVIES) {
                    items(watchlistMovies, key = { "m_${it.id}" }) { movie ->
                        MyListMovieCard(movie = movie, onClick = { onMovieDetail(movie.id) })
                    }
                }
                if (filter == ListFilter.ALL || filter == ListFilter.SERIES) {
                    items(watchlistSeries, key = { "s_${it.id}" }) { series ->
                        MyListSeriesCard(series = series, onClick = { onSeriesDetail(series.id) })
                    }
                }
            }
        }
    }
}

// ── Movie card ────────────────────────────────────────────────────────────────

@Composable
private fun MyListMovieCard(movie: Movie, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(BgCard)
            .clickable { onClick() },
    ) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f)) {
            if (!movie.cover.isNullOrEmpty()) {
                AsyncImage(model = movie.cover, contentDescription = movie.name,
                    contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Box(Modifier.fillMaxSize().background(BgSurface), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.Movie, null, tint = TextSub.copy(0.3f), modifier = Modifier.size(32.dp))
                }
            }
            Box(
                modifier = Modifier.align(Alignment.BottomStart).padding(4.dp)
                    .clip(RoundedCornerShape(4.dp)).background(Purple.copy(0.88f))
                    .padding(horizontal = 4.dp, vertical = 2.dp),
            ) {
                Text(stringResource(R.string.badge_movie), color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
        Text(
            movie.name,
            color    = TextPrimary,
            fontSize = 11.sp,
            minLines = 2,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(6.dp),
        )
    }
}

// ── Series card ───────────────────────────────────────────────────────────────

@Composable
private fun MyListSeriesCard(series: SeriesItem, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(BgCard)
            .clickable { onClick() },
    ) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f)) {
            if (!series.cover.isNullOrEmpty()) {
                AsyncImage(model = series.cover, contentDescription = series.name,
                    contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Box(Modifier.fillMaxSize().background(BgSurface), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.Tv, null, tint = TextSub.copy(0.3f), modifier = Modifier.size(32.dp))
                }
            }
            Box(
                modifier = Modifier.align(Alignment.BottomStart).padding(4.dp)
                    .clip(RoundedCornerShape(4.dp)).background(PurpleDark.copy(0.88f))
                    .padding(horizontal = 4.dp, vertical = 2.dp),
            ) {
                Text(stringResource(R.string.badge_series), color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
        Text(
            series.name,
            color    = TextPrimary,
            fontSize = 11.sp,
            minLines = 2,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(6.dp),
        )
    }
}
