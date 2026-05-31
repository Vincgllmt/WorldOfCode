package com.purpleiptv.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.purpleiptv.tv.model.Channel
import com.purpleiptv.tv.model.ContinueWatchingItem
import com.purpleiptv.tv.model.FeaturedHero
import com.purpleiptv.tv.model.Movie
import com.purpleiptv.tv.model.Series
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleSpacing
import com.purpleiptv.tv.ui.components.*

/**
 * Home screen — the brand's marquee experience.
 *
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ ▌ rail │  HERO (immersive backdrop, title, actions)          │
 *  │        ├──────────────────────────────────────────────────── │
 *  │        │  ▮ continue watching (16:9 cards)                   │
 *  │        │  ▮ trending films    (2:3 posters)                  │
 *  │        │  ▮ top series        (2:3 posters)                  │
 *  │        │  ▮ new releases      (2:3 posters)                  │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * Focus model:
 *  - Vertical: between hero actions and content rows
 *  - Horizontal: between sibling cards in a row, OR back into the rail
 *  - Rail expands when entered, collapses on exit
 *
 * State is fully hoisted — caller supplies data + handlers, the screen
 * has no domain state of its own. Use this exactly as a `@Composable`
 * destination inside your `NavHost`.
 */
@Composable
fun HomeScreen(
    featuredHeroes: List<FeaturedHero>,
    continueWatching: List<ContinueWatchingItem>,
    trendingFilms: List<Movie>,
    topSeries: List<Series>,
    newReleases: List<Movie>,
    onPlay: (Movie) -> Unit,
    onOpenDetail: (Movie) -> Unit,
    onResumeContinue: (ContinueWatchingItem) -> Unit,
    onOpenSeries: (Series) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(36.dp),
    ) {
        HeroBanner(
            items = featuredHeroes,
            onPlay = { onPlay(it.movie) },
            onMoreInfo = { onOpenDetail(it.movie) },
            onAddToList = { /* hoist via callback in real wiring */ },
        )

        ContentRow(title = "Continue watching", items = continueWatching) { item, _, dim ->
            ContinueCard(item = item, onClick = { onResumeContinue(item) }, isAnySiblingFocused = dim)
        }

        ContentRow(title = "Trending films", items = trendingFilms) { movie, _, dim ->
            PosterCard(movie = movie, onClick = { onOpenDetail(movie) }, isAnySiblingFocused = dim)
        }

        ContentRow(title = "Top series", items = topSeries) { series, _, dim ->
            SeriesPosterCard(series = series, onClick = { onOpenSeries(series) }, isAnySiblingFocused = dim)
        }

        ContentRow(title = "New releases", items = newReleases) { movie, _, dim ->
            PosterCard(movie = movie, onClick = { onOpenDetail(movie) }, isAnySiblingFocused = dim)
        }

        Spacer(Modifier.height(PurpleSpacing.SectionLg))
    }
}

/** Thin wrapper around PosterCard for series — same visual contract. */
@Composable
private fun SeriesPosterCard(
    series: Series,
    onClick: () -> Unit,
    isAnySiblingFocused: Boolean,
) {
    // Reuse PosterCard by adapting Series → Movie shape for the visuals.
    val movieShape = Movie(
        id = series.id,
        title = series.title,
        year = 0,
        rating = 0.0,
        duration = "",
        genres = emptyList(),
        posterUrl = series.posterUrl,
        accentColor = series.accentColor,
    )
    PosterCard(movie = movieShape, onClick = onClick, isAnySiblingFocused = isAnySiblingFocused)
}
