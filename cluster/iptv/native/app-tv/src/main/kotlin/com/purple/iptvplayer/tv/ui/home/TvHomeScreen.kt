package com.purple.iptvplayer.tv.ui.home

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
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
import com.purple.iptvplayer.core.model.Channel
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel

private fun cleanLabel(s: String): String =
    s.replace(Regex("[^\\p{L}\\p{N}\\s|\\-+.&'()/]+"), " ")
        .replace(Regex("\\s{2,}"), " ")
        .trim()

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvHomeScreen(onPlay: (url: String, title: String, streamId: Int) -> Unit) {
    val vm: ContentViewModel = koinViewModel()
    val channelsState by vm.channels.collectAsState()
    val channelFavs   by vm.channelFavorites.collectAsState()
    val genreFavs     by vm.liveGenreFavorites.collectAsState()
    var searchQuery   by remember { mutableStateOf("") }
    var selectedGroup by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { vm.loadChannels() }

    BackHandler(enabled = selectedGroup != null || searchQuery.isNotEmpty()) {
        if (searchQuery.isNotEmpty()) searchQuery = ""
        else selectedGroup = null
    }

    when (channelsState) {
        is ContentState.Loading -> Box(
            Modifier.fillMaxSize().background(PurplePalette.Bg1), Alignment.Center,
        ) { CircularProgressIndicator(color = PurplePalette.Purple400) }

        is ContentState.Error -> Box(
            Modifier.fillMaxSize().background(PurplePalette.Bg1), Alignment.Center,
        ) {
            Text(
                (channelsState as ContentState.Error).message,
                style = LocalPurpleType.current.body.copy(color = PurplePalette.Danger),
            )
        }

        else -> {
            val allChannels = (channelsState as? ContentState.Success)?.data ?: emptyList()

            val grouped = remember(allChannels, genreFavs) {
                allChannels
                    .groupBy { (it.group ?: "Autres").trim() }
                    .entries
                    .sortedWith(compareBy({ !genreFavs.contains(cleanLabel(it.key)) }, { cleanLabel(it.key).lowercase() }))
                    .map { cleanLabel(it.key) to it.value }
                    .filter { it.first.isNotBlank() }
            }

            val searchResults = remember(allChannels, searchQuery, channelFavs) {
                if (searchQuery.isBlank()) emptyList()
                else allChannels
                    .filter { it.name.contains(searchQuery, ignoreCase = true) }
                    .sortedByDescending { channelFavs.contains(it.name) }
            }

            val filteredChannels = remember(grouped, selectedGroup, channelFavs) {
                (grouped.find { it.first == selectedGroup }?.second ?: emptyList())
                    .sortedByDescending { channelFavs.contains(it.name) }
            }

            Column(modifier = Modifier.fillMaxSize().background(PurplePalette.Bg1)) {

                // ── Header ────────────────────────────────────────────────────
                Row(
                    modifier          = Modifier
                        .fillMaxWidth()
                        .padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (selectedGroup != null) {
                        Surface(
                            onClick  = { selectedGroup = null },
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
                                Text("Retour", style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2))
                            }
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            selectedGroup ?: "Direct TV",
                            style = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1),
                        )
                        Text(
                            when {
                                selectedGroup != null        -> "${filteredChannels.size} CHAÎNES"
                                searchQuery.isNotEmpty()     -> "${searchResults.size} RÉSULTATS"
                                else                         -> "${allChannels.size} CHAÎNES - ${grouped.size} GENRES"
                            },
                            style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    TvSearchBar(
                        query    = searchQuery,
                        onQuery  = { q -> searchQuery = q; if (q.isNotEmpty()) selectedGroup = null },
                        hint     = "Rechercher une chaîne...",
                        modifier = Modifier.widthIn(max = 280.dp),
                    )
                }

                when {
                    // ── Search results ────────────────────────────────────────
                    searchQuery.isNotEmpty() -> LazyVerticalGrid(
                        columns               = GridCells.Adaptive(minSize = 195.dp),
                        modifier              = Modifier.fillMaxSize(),
                        contentPadding        = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                        verticalArrangement   = Arrangement.spacedBy(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        gridItems(searchResults, key = { it.url }) { channel ->
                            TvChannelCard(
                                channel      = channel,
                                isFav        = channelFavs.contains(channel.name),
                                showFavBtn   = true,
                                modifier     = Modifier.fillMaxWidth(),
                                onClick      = { onPlay(channel.url, channel.name, channel.streamId ?: 0) },
                                onToggleFav  = { vm.toggleChannelFavorite(channel.name) },
                            )
                        }
                    }

                    // ── Filtered view (genre selected) ────────────────────────
                    selectedGroup != null -> LazyVerticalGrid(
                        columns               = GridCells.Adaptive(minSize = 195.dp),
                        modifier              = Modifier.fillMaxSize(),
                        contentPadding        = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                        verticalArrangement   = Arrangement.spacedBy(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        gridItems(filteredChannels, key = { it.url }) { channel ->
                            TvChannelCard(
                                channel      = channel,
                                isFav        = channelFavs.contains(channel.name),
                                showFavBtn   = true,
                                modifier     = Modifier.fillMaxWidth(),
                                onClick      = { onPlay(channel.url, channel.name, channel.streamId ?: 0) },
                                onToggleFav  = { vm.toggleChannelFavorite(channel.name) },
                            )
                        }
                    }

                    // ── Grouped view (Netflix style) ──────────────────────────
                    else -> LazyColumn(
                        modifier       = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 32.dp),
                    ) {
                        grouped.forEach { (genre, channels) ->
                            val isFav = genreFavs.contains(genre)

                            // Genre header
                            item(key = "hdr_$genre") {
                                TvGenreHeader(
                                    genre       = genre,
                                    count       = channels.size,
                                    isFav       = isFav,
                                    onSelect    = { selectedGroup = genre },
                                    onToggleFav = { vm.toggleLiveGenreFavorite(genre) },
                                )
                            }

                            // Horizontal channel row
                            item(key = "row_$genre") {
                                val sorted = remember(channels, channelFavs) {
                                    channels.sortedByDescending { channelFavs.contains(it.name) }
                                }
                                LazyRow(
                                    contentPadding        = PaddingValues(horizontal = 24.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    items(sorted, key = { it.url }) { channel ->
                                        TvChannelCard(
                                            channel     = channel,
                                            isFav       = channelFavs.contains(channel.name),
                                            showFavBtn  = false,
                                            modifier    = Modifier.width(185.dp),
                                            onClick     = { onPlay(channel.url, channel.name, channel.streamId ?: 0) },
                                            onToggleFav = { vm.toggleChannelFavorite(channel.name) },
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ── Genre header ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvGenreHeader(
    genre:       String,
    count:       Int,
    isFav:       Boolean,
    onSelect:    () -> Unit,
    onToggleFav: () -> Unit,
) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Clickable genre title → filtered view
        Surface(
            onClick = onSelect,
            shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Sm),
            colors  = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = PurplePalette.Purple400.copy(0.12f),
            ),
            border  = ClickableSurfaceDefaults.border(
                border        = Border(border = androidx.compose.foundation.BorderStroke(0.dp, Color.Transparent), shape = PurpleShapes.Sm),
                focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400), shape = PurpleShapes.Sm),
            ),
            glow    = ClickableSurfaceDefaults.glow(
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
                    style = LocalPurpleType.current.capsLabel.copy(
                        color      = PurplePalette.Fg1,
                        fontWeight = FontWeight.ExtraBold,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
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

        // Bookmark toggle button
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
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Icon(
                    if (isFav) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                    null,
                    tint     = if (isFav) PurplePalette.Purple300 else PurplePalette.Fg4,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

// ── Search bar (exported — used by Movies/Series) ─────────────────────────────

@Composable
fun TvSearchBar(query: String, onQuery: (String) -> Unit, hint: String, modifier: Modifier = Modifier) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier              = modifier
            .clip(PurpleShapes.Md)
            .background(PurplePalette.Bg2)
            .border(
                width = if (isFocused) 2.dp else 1.dp,
                color = if (isFocused) PurplePalette.Purple400 else PurplePalette.Line1,
                shape = PurpleShapes.Md,
            )
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            Icons.Rounded.Search, null,
            tint     = if (isFocused) PurplePalette.Purple400 else PurplePalette.Fg4,
            modifier = Modifier.size(16.dp),
        )
        Box(modifier = Modifier.weight(1f)) {
            if (query.isEmpty()) {
                androidx.compose.material3.Text(
                    hint,
                    style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg4),
                )
            }
            BasicTextField(
                value           = query,
                onValueChange   = onQuery,
                singleLine      = true,
                textStyle       = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg1),
                cursorBrush     = SolidColor(PurplePalette.Purple400),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = {}),
                modifier        = Modifier.fillMaxWidth().onFocusChanged { isFocused = it.isFocused },
            )
        }
        if (query.isNotEmpty()) {
            Icon(
                Icons.Rounded.Close, null,
                tint     = PurplePalette.Fg4,
                modifier = Modifier.size(14.dp).clickable { onQuery("") },
            )
        }
    }
}

// ── Genre Chip (used by Movies/Series) ───────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun TvGenreChip(label: String, selected: Boolean, onClick: () -> Unit, isGenreFav: Boolean = false) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick           = onClick,
        shape             = ClickableSurfaceDefaults.shape(PurpleShapes.Pill),
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) PurplePalette.Purple400 else PurplePalette.Bg2,
            focusedContainerColor = PurplePalette.Purple400,
        ),
        border            = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    if (selected) 0.dp else 1.dp, PurplePalette.Line1,
                ),
                shape  = PurpleShapes.Pill,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple200),
                shape  = PurpleShapes.Pill,
            ),
        ),
        scale             = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
        glow              = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(elevationColor = PurplePalette.Purple400, elevation = 14.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            if (isGenreFav) {
                Icon(
                    Icons.Rounded.Bookmark, null,
                    tint     = if (selected || isFocused) Color.White else PurplePalette.Purple300,
                    modifier = Modifier.size(11.dp),
                )
            }
            Text(
                label,
                style = LocalPurpleType.current.bodySmall.copy(
                    color      = if (selected || isFocused) Color.White else PurplePalette.Fg2,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                ),
            )
        }
    }
}

// ── Channel Card ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvChannelCard(
    channel:     Channel,
    isFav:       Boolean,
    showFavBtn:  Boolean,
    onClick:     () -> Unit,
    onToggleFav: () -> Unit,
    modifier:    Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val gradient  = cardGradient(channel.name)

    Column(
        modifier            = modifier,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Surface(
            onClick           = onClick,
            modifier          = Modifier.fillMaxWidth().aspectRatio(16f / 9f),
            shape             = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Lg),
            colors            = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = Color.Transparent,
            ),
            scale             = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
            border            = ClickableSurfaceDefaults.border(
                border = Border(
                    border = androidx.compose.foundation.BorderStroke(1.dp, PurplePalette.Line1.copy(0.4f)),
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
            Box(modifier = Modifier.fillMaxSize().background(gradient)) {
                if (!channel.logo.isNullOrEmpty()) {
                    AsyncImage(
                        model              = channel.logo,
                        contentDescription = channel.name,
                        contentScale       = ContentScale.Fit,
                        modifier           = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 20.dp, vertical = 14.dp),
                    )
                }
                // Badge LIVE
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(10.dp)
                        .background(PurplePalette.Live, RoundedCornerShape(4.dp))
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                ) {
                    androidx.compose.material3.Text(
                        "LIVE",
                        color      = Color.White,
                        fontSize   = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                    )
                }
                // Favorite badge
                if (isFav) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(10.dp)
                            .size(22.dp)
                            .clip(PurpleShapes.Xs)
                            .background(PurplePalette.Bg1.copy(0.85f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Rounded.Favorite, null, tint = Color(0xFFE91E63), modifier = Modifier.size(13.dp))
                    }
                }
                // Bottom scrim
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(36.dp)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.45f))
                            )
                        ),
                )
            }
        }

        // Name + optional heart toggle
        Row(
            modifier          = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text     = channel.name,
                style    = LocalPurpleType.current.bodySmall.copy(
                    color      = if (isFocused) PurplePalette.Fg1 else PurplePalette.Fg2,
                    fontWeight = if (isFocused) FontWeight.SemiBold else FontWeight.Normal,
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            if (showFavBtn) {
                Spacer(Modifier.width(4.dp))
                Surface(
                    onClick  = onToggleFav,
                    shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
                    colors   = ClickableSurfaceDefaults.colors(
                        containerColor        = Color.Transparent,
                        focusedContainerColor = PurplePalette.Bg3,
                    ),
                    border   = ClickableSurfaceDefaults.border(
                        focusedBorder = Border(
                            border = androidx.compose.foundation.BorderStroke(
                                2.dp,
                                if (isFav) Color(0xFFE91E63) else PurplePalette.Purple400,
                            ),
                            shape  = PurpleShapes.Xs,
                        ),
                    ),
                    scale    = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
                    modifier = Modifier.size(28.dp),
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            if (isFav) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                            null,
                            tint     = if (isFav) Color(0xFFE91E63) else PurplePalette.Fg4,
                            modifier = Modifier.size(14.dp),
                        )
                    }
                }
            }
        }
    }
}
