package com.purple.iptvplayer.mobile.ui.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.model.Channel
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.mobile.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import com.purple.iptvplayer.R

enum class LayoutMode { THEMES, GRID_SMALL, GRID_MEDIUM }

@Composable
fun HomeScreen(
    onPlayChannel: (url: String, title: String, cover: String, streamId: Int) -> Unit,
    selectedGenre: String?,
    onSelectGenre: (String?) -> Unit,
    layoutMode:    LayoutMode,
) {
    val vm: ContentViewModel = koinViewModel()
    val channelsState by vm.channels.collectAsState()
    val favorites     by vm.channelFavorites.collectAsState()
    val genreFavs     by vm.liveGenreFavorites.collectAsState()
    var query by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.loadChannels() }

    val allChannels = (channelsState as? ContentState.Success)?.data ?: emptyList()

    val filtered = remember(allChannels, query, selectedGenre) {
        allChannels
            .let { list -> if (selectedGenre != null) list.filter { it.group.equals(selectedGenre, ignoreCase = true) } else list }
            .let { list ->
                if (query.isNotEmpty()) list.filter { it.name.contains(query, ignoreCase = true) }
                else list
            }
    }

    val grouped = remember(filtered, genreFavs) {
        filtered
            .groupBy { it.group ?: "Other" }
            .entries
            .sortedWith(compareBy({ !genreFavs.contains(it.key) }, { it.key }))
    }

    val allGrouped = remember(allChannels) {
        allChannels
            .groupBy { (it.group ?: "Other").trim().lowercase() }
            .entries.sortedBy { it.key }
            .map { (_, items) -> (items.first().group ?: "Other").trim() to items }
    }

    when (channelsState) {
        is ContentState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Purple)
        }
        is ContentState.Error -> Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text((channelsState as ContentState.Error).message, color = ColorError)
        }
        else -> {
            val cardWidth: Dp = when (layoutMode) {
                LayoutMode.GRID_SMALL  -> 120.dp
                LayoutMode.GRID_MEDIUM -> 170.dp
                LayoutMode.THEMES      -> 0.dp
            }

            Column(modifier = Modifier.fillMaxSize().background(BgHome)) {
                // Search field
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
                        onValueChange = { query = it },
                        singleLine = true,
                        textStyle = TextStyle(color = TextPrimary, fontSize = 14.sp),
                        cursorBrush = SolidColor(Purple),
                        modifier = Modifier.weight(1f),
                        decorationBox = { inner ->
                            if (query.isEmpty()) {
                                Text("Search channels…", color = TextSub.copy(0.4f), fontSize = 14.sp)
                            }
                            inner()
                        },
                    )
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Rounded.Close, null, tint = TextSub, modifier = Modifier.size(14.dp))
                        }
                    }
                }

                // Active genre filter pill
                if (selectedGenre != null) {
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
                                .clickable { onSelectGenre(null) }
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(Icons.Rounded.FilterList, null, tint = PurpleGlow, modifier = Modifier.size(14.dp))
                            Text(selectedGenre, color = PurpleGlow, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Icon(Icons.Rounded.Close, null, tint = PurpleGlow, modifier = Modifier.size(12.dp))
                        }
                    }
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (layoutMode == LayoutMode.THEMES && selectedGenre == null && query.isEmpty()) {
                        allGrouped.forEach { (genre, list) ->
                            item(key = "theme_$genre") {
                                ThemeCard(
                                    label = genre,
                                    count = list.size,
                                    itemType = if (list.size > 1) "chaînes" else "chaîne",
                                    onClick = { onSelectGenre(genre) }
                                )
                            }
                        }
                    } else {
                        grouped.forEach { (genre, channels) ->
                            if (layoutMode != LayoutMode.THEMES) {
                                item(key = "header_$genre") {
                                    GroupHeader(
                                        genre      = genre,
                                        count      = channels.size,
                                        isFavorite = genreFavs.contains(genre),
                                        isSelected = selectedGenre == genre,
                                        onFavorite = { vm.toggleLiveGenreFavorite(genre) },
                                        onClick    = { onSelectGenre(if (selectedGenre == genre) null else genre) },
                                    )
                                }
                            }

                            item(key = "row_$genre") {
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    items(channels, key = { it.url }) { channel ->
                                        ChannelCard(
                                            channel   = channel,
                                            isFav     = favorites.contains(channel.name),
                                            cardWidth = if (layoutMode == LayoutMode.THEMES) 170.dp else cardWidth,
                                            onPlay    = { onPlayChannel(channel.url, channel.name, channel.logo ?: "", channel.streamId ?: 0) },
                                            onFav     = { vm.toggleChannelFavorite(channel.name) },
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

@Composable
fun SectionHeader(title: String) {
    Row(
        modifier = Modifier.padding(bottom = 12.dp, top = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.width(3.dp).height(18.dp).clip(RoundedCornerShape(2.dp)).background(PurpleGlow))
        Spacer(Modifier.width(10.dp))
        Text(title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
fun ThemeCard(label: String, count: Int, itemType: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = BgCard,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, BorderPurple.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Purple.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.Folder, null, tint = PurpleGlow, modifier = Modifier.size(24.dp))
            }
            
            Spacer(Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(label.uppercase(), color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                Text("$count $itemType", color = TextSub, fontSize = 13.sp)
            }
            
            Icon(Icons.Rounded.ChevronRight, null, tint = TextSub, modifier = Modifier.size(20.dp))
        }
    }
}

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun RecentItemCard(
    item:    com.purple.iptvplayer.core.data.RecentItem,
    onPlay:  () -> Unit,
    onClose: () -> Unit
) {
    var showSheet by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .width(220.dp)
            .height(125.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(BgCard)
            .combinedClickable(
                onClick     = onPlay,
                onLongClick = { showSheet = true },
            ),
    ) {
        if (!item.cover.isNullOrEmpty()) {
            AsyncImage(
                model = item.cover,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().alpha(0.55f)
            )
        }

        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(0.85f)))))

        Column(
            modifier = Modifier.fillMaxSize().padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    item.title, color = Color.White, fontSize = 14.sp,
                    fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onClose, modifier = Modifier.size(22.dp).padding(2.dp)) {
                    Icon(Icons.Rounded.Close, null, tint = Color.White.copy(0.6f), modifier = Modifier.size(16.dp))
                }
            }

            Column {
                val typeLabel = when (item.type) {
                    "movie"  -> "Films"
                    "series" -> "Séries"
                    else     -> "Direct TV"
                }
                Box(Modifier.clip(RoundedCornerShape(4.dp)).background(Purple.copy(alpha = 0.4f)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                    Text(typeLabel, color = Color.White.copy(0.9f), fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(8.dp))
                if (item.duration > 0) {
                    LinearProgressIndicator(
                        progress = { item.progress.toFloat() / item.duration },
                        modifier = Modifier.fillMaxWidth().height(3.dp).clip(CircleShape),
                        color = PurpleGlow, trackColor = Color.White.copy(0.2f)
                    )
                }
            }
        }
    }

    if (showSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSheet = false },
            containerColor   = BgCard,
            tonalElevation   = 0.dp,
        ) {
            Column(modifier = Modifier.padding(start = 20.dp, end = 20.dp, bottom = 32.dp)) {
                // Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 16.dp),
                ) {
                    if (!item.cover.isNullOrEmpty()) {
                        AsyncImage(
                            model = item.cover,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(width = 56.dp, height = 36.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .alpha(0.9f),
                        )
                        Spacer(Modifier.width(12.dp))
                    }
                    Text(
                        item.title,
                        color = TextPrimary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }

                HorizontalDivider(color = BorderPurple.copy(0.15f), thickness = 1.dp)
                Spacer(Modifier.height(8.dp))

                // Supprimer
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable {
                            showSheet = false
                            onClose()
                        }
                        .padding(vertical = 14.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Icon(Icons.Rounded.DeleteOutline, null, tint = ColorError, modifier = Modifier.size(22.dp))
                    Text("Supprimer de la liste", color = ColorError, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                }

                // Annuler
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { showSheet = false }
                        .padding(vertical = 14.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Icon(Icons.Rounded.Close, null, tint = TextSub, modifier = Modifier.size(22.dp))
                    Text("Annuler", color = TextSub, fontSize = 15.sp)
                }
            }
        }
    }
}

@Composable
private fun GroupHeader(
    genre:      String,
    count:      Int,
    isFavorite: Boolean,
    isSelected: Boolean,
    onFavorite: () -> Unit,
    onClick:    () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(top = 18.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (isSelected) {
            Box(Modifier.width(3.dp).height(18.dp).clip(RoundedCornerShape(2.dp)).background(Purple))
            Spacer(Modifier.width(6.dp))
        }
        Text(
            text = genre,
            color = if (isSelected) PurpleGlow else TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 0.5.sp,
        )
        Spacer(Modifier.width(6.dp))
        Text("($count)", color = TextSub, fontSize = 13.sp)
        Spacer(Modifier.width(4.dp))
        Icon(
            if (isSelected) Icons.Rounded.ExpandLess else Icons.Rounded.ChevronRight,
            null, tint = if (isSelected) PurpleGlow else TextSub, modifier = Modifier.size(15.dp),
        )
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onFavorite, modifier = Modifier.size(32.dp)) {
            Icon(
                imageVector = if (isFavorite) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                contentDescription = null,
                tint = if (isFavorite) Purple else TextSub.copy(alpha = 0.45f),
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun ChannelCard(
    channel:   Channel,
    isFav:     Boolean,
    cardWidth: Dp,
    onPlay:    () -> Unit,
    onFav:     () -> Unit,
) {
    Column(
        modifier = Modifier
            .width(cardWidth)
            .clip(RoundedCornerShape(10.dp))
            .background(BgCard)
            .clickable { onPlay() },
    ) {
        Box(modifier = Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
            if (!channel.logo.isNullOrEmpty()) {
                AsyncImage(model = channel.logo, contentDescription = null,
                    modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            } else {
                Box(modifier = Modifier.fillMaxSize().background(BgSurface), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.LiveTv, null, tint = TextSub.copy(0.35f), modifier = Modifier.size(26.dp))
                }
            }
        }
        Text(text = channel.name, color = TextPrimary, fontSize = 10.sp, maxLines = 2,
            overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp))
    }
}
