package com.purple.iptvplayer.mobile.ui.series

import com.purple.iptvplayer.mobile.ui.common.toDisplayString
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.*
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
import com.purple.iptvplayer.core.model.SeriesItem
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.mobile.ui.home.*
import com.purple.iptvplayer.mobile.ui.movies.ActiveFilterPill
import com.purple.iptvplayer.mobile.ui.movies.ContentHeader
import com.purple.iptvplayer.mobile.ui.movies.GenreRowHeader
import com.purple.iptvplayer.mobile.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import androidx.compose.ui.res.stringResource
import com.purple.iptvplayer.R

private val CARD_WIDTH = 130.dp

@Composable
fun SeriesScreen(
    onSeriesDetail: (id: Int) -> Unit,
    selectedGenre:  String?,
    onSelectGenre: (String?) -> Unit,
) {
    val vm: ContentViewModel = koinViewModel()
    val seriesState by vm.series.collectAsState()
    val favorites   by vm.seriesFavorites.collectAsState()
    val genreFavs   by vm.seriesGenreFavorites.collectAsState()
    val recentItems by vm.recentItems.collectAsState()

    // rememberSaveable et non remember : ouvrir une fiche depuis un résultat détruit la
    // composition de cet écran. Avec `remember`, la recherche était perdue et le retour
    // ramenait sur la liste complète au lieu des résultats.
    var query by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.loadSeries() }

    val allSeries = (seriesState as? ContentState.Success)?.data ?: emptyList()

    // Les thèmes favoris remontent en tête, comme sur l'onglet live.
    val allGrouped = remember(allSeries, genreFavs) {
        allSeries
            .groupBy { (it.group ?: "Other").trim().lowercase() }
            .entries
            .map { (_, items) -> (items.first().group ?: "Other").trim() to items }
            .sortedWith(compareBy({ !genreFavs.contains(it.first) }, { it.first.lowercase() }))
    }

    val filtered = remember(allSeries, query, selectedGenre) {
        allSeries
            .let { if (selectedGenre != null) it.filter { s -> s.group.equals(selectedGenre, ignoreCase = true) } else it }
            .let { if (query.isNotEmpty()) it.filter { s -> s.name.contains(query, ignoreCase = true) } else it }
    }

    val seriesRecents = remember(recentItems) { recentItems.filter { it.type == "series" } }

    // Deux vues, et l'état seul décide laquelle : les rangées par thème tant que rien
    // n'est filtré, la grille dès qu'un thème est choisi ou qu'une recherche est en
    // cours. Le sélecteur de disposition a disparu avec le tiroir.
    val isGroupedView = selectedGenre == null && query.isEmpty()

    Column(modifier = Modifier.fillMaxSize().background(BgHome)) {
        ContentHeader(title = stringResource(R.string.nav_series), query = query, onQuery = { query = it })

        if (selectedGenre != null) {
            ActiveFilterPill(genre = selectedGenre, onClear = { onSelectGenre(null) })
        }

        when (seriesState) {
            is ContentState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Purple) }
            is ContentState.Error   -> Box(Modifier.fillMaxSize(), Alignment.Center) { Text((seriesState as ContentState.Error).reason.toDisplayString(), color = ColorError) }
            else -> {
                if (isGroupedView) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 24.dp),
                    ) {
                        // Continue Watching
                        if (seriesRecents.isNotEmpty()) {
                            item { SectionHeader("REPRENDRE LA LECTURE") }
                            item {
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    items(seriesRecents, key = { it.id }) { itm ->
                                        RecentItemCard(
                                            item    = itm,
                                            onPlay  = {
                                                val seriesId = itm.id.split("_").firstOrNull()?.toIntOrNull() ?: 0
                                                onSeriesDetail(seriesId)
                                            },
                                            onClose = { vm.clearRecentItem(itm.id) },
                                        )
                                    }
                                }
                            }
                            item { Spacer(Modifier.height(8.dp)) }
                        }

                        // Grouped categories
                        allGrouped.forEach { (genre, list) ->
                            item(key = "header_$genre") {
                                GenreRowHeader(
                                    genre      = genre,
                                    count      = list.size,
                                    isFavorite = genreFavs.contains(genre),
                                    onFavorite = { vm.toggleSeriesGenreFavorite(genre) },
                                    onClick    = { onSelectGenre(genre) },
                                )
                            }
                            item(key = "row_$genre") {
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    items(list, key = { it.id }) { s ->
                                        Box(Modifier.width(CARD_WIDTH)) {
                                            SeriesGridItem(
                                                series  = s,
                                                isFav   = favorites.contains(s.id.toString()),
                                                onClick = { onSeriesDetail(s.id) },
                                                onFav   = { vm.toggleSeriesFavorite(s.id.toString()) },
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Grille (Petit) : la seule qui reste une fois le filtre appliqué.
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(100.dp),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(filtered, key = { it.id }) { s ->
                            SeriesGridItem(
                                series  = s,
                                isFav   = favorites.contains(s.id.toString()),
                                onClick = { onSeriesDetail(s.id) },
                                onFav   = { vm.toggleSeriesFavorite(s.id.toString()) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SeriesGridItem(series: SeriesItem, isFav: Boolean, onClick: () -> Unit, onFav: () -> Unit) {
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
                    Icon(Icons.Rounded.Tv, null, tint = TextSub.copy(0.3f), modifier = Modifier.size(40.dp))
                }
            }
            IconButton(
                onClick = onFav,
                modifier = Modifier.align(Alignment.TopEnd).size(32.dp),
            ) {
                Icon(
                    if (isFav) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                    null,
                    tint = if (isFav) PurpleGlow else TextPrimary.copy(0.6f),
                    modifier = Modifier.size(18.dp),
                )
            }
        }
        // Hauteur de titre réservée, comme sur la grille des films.
        Text(series.name, color = TextPrimary, fontSize = 11.sp, minLines = 2, maxLines = 2,
            overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(6.dp))
    }
}
