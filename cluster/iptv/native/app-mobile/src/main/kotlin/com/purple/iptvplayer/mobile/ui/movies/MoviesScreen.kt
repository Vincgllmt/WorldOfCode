package com.purple.iptvplayer.mobile.ui.movies

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.koin.androidx.compose.koinViewModel
import coil.compose.AsyncImage
import com.purple.iptvplayer.R
import com.purple.iptvplayer.core.model.Movie
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.mobile.ui.home.*
import com.purple.iptvplayer.mobile.ui.theme.*

private val CARD_WIDTH = 130.dp

@Composable
fun MoviesScreen(
    onPlayMovie:   (url: String, title: String, id: Int, cover: String) -> Unit,
    onMovieDetail: (id: Int) -> Unit,
    selectedGenre: String?,
    onSelectGenre: (String?) -> Unit,
    layoutMode:    LayoutMode,
) {
    val vm: ContentViewModel = koinViewModel()
    val moviesState by vm.movies.collectAsState()
    val favorites   by vm.movieFavorites.collectAsState()
    val recentItems by vm.recentItems.collectAsState()

    // rememberSaveable et non remember : ouvrir une fiche depuis un résultat détruit la
    // composition de cet écran. Avec `remember`, la recherche était perdue et le retour
    // ramenait sur la liste complète au lieu des résultats.
    var query by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.loadMovies() }

    val allMovies = (moviesState as? ContentState.Success)?.data ?: emptyList()

    val allGrouped = remember(allMovies) {
        allMovies
            .groupBy { (it.group ?: "Other").trim().lowercase() }
            .entries.sortedBy { it.key }
            .map { (_, items) -> (items.first().group ?: "Other").trim() to items }
    }

    val filtered = remember(allMovies, query, selectedGenre) {
        allMovies
            .let { if (selectedGenre != null) it.filter { m -> m.group.equals(selectedGenre, ignoreCase = true) } else it }
            .let { if (query.isNotEmpty()) it.filter { m -> m.name.contains(query, ignoreCase = true) } else it }
    }

    val movieRecents = remember(recentItems) { recentItems.filter { it.type == "movie" } }

    val isGroupedView = selectedGenre == null && query.isEmpty()

    Column(modifier = Modifier.fillMaxSize().background(BgHome)) {
        ContentHeader(title = "Films", query = query, onQuery = { query = it })

        if (selectedGenre != null) {
            ActiveFilterPill(genre = selectedGenre, onClear = { onSelectGenre(null) })
        }

        when (moviesState) {
            is ContentState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Purple) }
            is ContentState.Error   -> Box(Modifier.fillMaxSize(), Alignment.Center) { Text((moviesState as ContentState.Error).message, color = ColorError) }
            else -> {
                if (isGroupedView) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 24.dp),
                    ) {
                        // Continue Watching
                        if (movieRecents.isNotEmpty()) {
                            item { SectionHeader("REPRENDRE LA LECTURE") }
                            item {
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    items(movieRecents, key = { it.id }) { itm ->
                                        RecentItemCard(
                                            item    = itm,
                                            onPlay  = { onPlayMovie(itm.url, itm.title, itm.id.toIntOrNull() ?: 0, itm.cover ?: "") },
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
                                GenreRowHeader(genre = genre, count = list.size, onClick = { onSelectGenre(genre) })
                            }
                            item(key = "row_$genre") {
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    items(list, key = { it.id }) { movie ->
                                        Box(Modifier.width(CARD_WIDTH)) {
                                            MovieGridItem(
                                                movie   = movie,
                                                isFav   = favorites.contains(movie.id.toString()),
                                                onClick = { onMovieDetail(movie.id) },
                                                onFav   = { vm.toggleMovieFavorite(movie.id.toString()) },
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    val adaptiveSize = when (layoutMode) {
                        LayoutMode.GRID_SMALL -> 100.dp
                        else                  -> 140.dp
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(adaptiveSize),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(filtered, key = { it.id }) { movie ->
                            MovieGridItem(
                                movie   = movie,
                                isFav   = favorites.contains(movie.id.toString()),
                                onClick = { onMovieDetail(movie.id) },
                                onFav   = { vm.toggleMovieFavorite(movie.id.toString()) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GenreRowHeader(genre: String, count: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(start = 16.dp, end = 12.dp, top = 20.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = genre.uppercase(),
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 0.5.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Spacer(Modifier.width(6.dp))
        Text("($count)", color = TextSub, fontSize = 12.sp)
        Spacer(Modifier.width(2.dp))
        Icon(Icons.Rounded.ChevronRight, null, tint = TextSub, modifier = Modifier.size(16.dp))
    }
}

@Composable
fun MovieGridItem(movie: Movie, isFav: Boolean, onClick: () -> Unit, onFav: () -> Unit) {
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
                    Icon(Icons.Rounded.Movie, null, tint = TextSub.copy(0.3f), modifier = Modifier.size(40.dp))
                }
            }
            IconButton(onClick = onFav, modifier = Modifier.align(Alignment.TopEnd).size(32.dp)) {
                Icon(
                    imageVector = if (isFav) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                    contentDescription = null,
                    tint = if (isFav) PurpleGlow else TextPrimary.copy(0.6f),
                    modifier = Modifier.size(18.dp),
                )
            }
            movie.rating?.let { rating ->
                Box(
                    modifier = Modifier.align(Alignment.BottomStart).padding(4.dp)
                        .clip(RoundedCornerShape(4.dp)).background(Purple.copy(alpha = 0.85f))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text("★ $rating", color = TextPrimary, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        // minLines = 2 : sans hauteur réservée, un titre sur deux lignes rendait sa carte
        // plus haute que ses voisines et la grille devenait irrégulière.
        Text(movie.name, color = TextPrimary, fontSize = 11.sp, minLines = 2, maxLines = 2,
            overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(6.dp))
    }
}

@Composable
fun ContentHeader(title: String, query: String, onQuery: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BgCard)
            .padding(horizontal = 12.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(BgHome)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Rounded.Search, null, tint = Purple, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        androidx.compose.foundation.text.BasicTextField(
            value = query,
            onValueChange = onQuery,
            singleLine = true,
            textStyle = TextStyle(color = TextPrimary, fontSize = 14.sp),
            cursorBrush = SolidColor(Purple),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                if (query.isEmpty()) {
                    Text(stringResource(R.string.search_generic), color = TextSub.copy(0.4f), fontSize = 14.sp)
                }
                inner()
            },
        )
        if (query.isNotEmpty()) {
            IconButton(onClick = { onQuery("") }, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Rounded.Close, null, tint = TextSub, modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
fun ActiveFilterPill(genre: String, onClear: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BgCard)
            .padding(start = 12.dp, end = 12.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .background(Purple.copy(0.2f))
                .clickable { onClear() }
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(Icons.Rounded.FilterList, null, tint = PurpleGlow, modifier = Modifier.size(14.dp))
            Text(genre, color = PurpleGlow, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            Icon(Icons.Rounded.Close, null, tint = PurpleGlow, modifier = Modifier.size(12.dp))
        }
    }
}
