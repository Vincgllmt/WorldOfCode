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
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.res.stringResource
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
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.common.TvChannelRow
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
                                Text(stringResource(R.string.action_back), style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2))
                            }
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            stringResource(R.string.nav_live),
                            style = LocalPurpleType.current.h1.copy(color = PurplePalette.Fg1),
                        )
                        Text(
                            if (searchQuery.isNotEmpty()) stringResource(R.string.count_results, searchResults.size)
                            else stringResource(R.string.count_channels, allChannels.size, grouped.size),
                            style    = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    TvSearchBar(
                        query    = searchQuery,
                        onQuery  = { q -> searchQuery = q; if (q.isNotEmpty()) selectedGroup = null },
                        hint     = stringResource(R.string.search_channels),
                        modifier = Modifier.widthIn(max = 280.dp),
                    )
                }

                when {
                    // ── Search results ────────────────────────────────────────
                    searchQuery.isNotEmpty() -> LazyColumn(
                        modifier            = Modifier.fillMaxSize(),
                        contentPadding      = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        items(searchResults, key = { it.url }) { channel ->
                            TvChannelRow(
                                channel = channel,
                                isFav   = channelFavs.contains(channel.name),
                                onPlay  = { onPlay(channel.url, channel.name, channel.streamId ?: 0) },
                                onFav   = { vm.toggleChannelFavorite(channel.name) },
                            )
                        }
                    }

                    // ── Deux panneaux : genres à gauche, chaînes à droite ─────
                    // Remplace les rangées horizontales imbriquées dans une colonne :
                    // atteindre la 40ᵉ chaîne d'un genre y demandait 40 appuis à droite.
                    // Ici haut/bas avance d'une chaîne, un seul axe par panneau.
                    else -> {
                        val currentGenre = selectedGroup ?: grouped.firstOrNull()?.first
                        val shown = remember(grouped, currentGenre, channelFavs) {
                            (grouped.find { it.first == currentGenre }?.second ?: emptyList())
                                .sortedByDescending { channelFavs.contains(it.name) }
                        }

                        Row(modifier = Modifier.fillMaxSize()) {

                            LazyColumn(
                                modifier            = Modifier.width(360.dp).fillMaxHeight(),
                                contentPadding      = PaddingValues(start = 24.dp, end = 12.dp, bottom = 24.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                items(grouped, key = { it.first }) { (genre, channels) ->
                                    TvGenreItem(
                                        genre       = genre,
                                        count       = channels.size,
                                        isSelected  = genre == currentGenre,
                                        isFav       = genreFavs.contains(genre),
                                        onClick     = { selectedGroup = genre },
                                        onToggleFav = { vm.toggleLiveGenreFavorite(genre) },
                                    )
                                }
                            }

                            LazyColumn(
                                modifier            = Modifier.weight(1f).fillMaxHeight(),
                                contentPadding      = PaddingValues(start = 12.dp, end = 24.dp, bottom = 24.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                items(shown, key = { it.url }) { channel ->
                                    TvChannelRow(
                                        channel = channel,
                                        isFav   = channelFavs.contains(channel.name),
                                        onPlay  = { onPlay(channel.url, channel.name, channel.streamId ?: 0) },
                                        onFav   = { vm.toggleChannelFavorite(channel.name) },
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

// ── Search bar (exported — used by Movies/Series) ─────────────────────────────

@Composable
fun TvSearchBar(query: String, onQuery: (String) -> Unit, hint: String, modifier: Modifier = Modifier) {
    var isFocused by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    Row(
        modifier              = modifier
            // Un champ de texte **consomme** les touches directionnelles : une fois le
            // curseur dans la barre de recherche, Bas ne ressortait jamais et les
            // résultats — pourtant focalisables — étaient inatteignables à la
            // télécommande. On intercepte donc haut/bas avant le champ.
            //
            // `moveFocus` renvoie `false` s'il n'y a rien dans cette direction : on
            // laisse alors passer la touche plutôt que de l'avaler.
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionDown -> focusManager.moveFocus(FocusDirection.Down)
                    Key.DirectionUp   -> focusManager.moveFocus(FocusDirection.Up)
                    else              -> false
                }
            }
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvGenreItem(
    genre:       String,
    count:       Int,
    isSelected:  Boolean,
    isFav:       Boolean,
    onClick:     () -> Unit,
    onToggleFav: () -> Unit,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Surface(
            onClick  = onClick,
            modifier = Modifier.weight(1f),
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = if (isSelected) PurplePalette.Purple400.copy(alpha = 0.18f) else Color.Transparent,
                focusedContainerColor = PurplePalette.Purple400,
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    genre.uppercase(),
                    style    = LocalPurpleType.current.bodySmall.copy(
                        color = PurplePalette.Fg1, fontWeight = FontWeight.SemiBold,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    count.toString(),
                    style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3),
                )
            }
        }
        Surface(
            onClick = onToggleFav,
            shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
            colors  = ClickableSurfaceDefaults.colors(
                containerColor        = Color.Transparent,
                focusedContainerColor = PurplePalette.Purple400,
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            Box(Modifier.size(44.dp), contentAlignment = Alignment.Center) {
                Text(
                    if (isFav) "★" else "☆",
                    color    = if (isFav) Color(0xFFFFD700) else PurplePalette.Fg4,
                    fontSize = 16.sp,
                )
            }
        }
    }
}
