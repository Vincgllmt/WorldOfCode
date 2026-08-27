package com.purple.iptvplayer.mobile.ui.home

import com.purple.iptvplayer.mobile.ui.common.toDisplayString
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.mobile.ui.common.ChannelRow
import com.purple.iptvplayer.mobile.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import com.purple.iptvplayer.R

/**
 * Écran des chaînes live.
 *
 * Deux vues, et l'état décide laquelle — il n'y a plus de sélecteur de disposition.
 * Sans thème ni recherche, l'écran est une **liste de thèmes** ; choisir un thème (ou
 * taper une recherche) bascule en **liste de chaînes**, filtrée. L'identité d'une chaîne
 * tient dans un logo et un nom : une grille de vignettes 16:9 n'y ajoutait rien.
 */
@Composable
fun HomeScreen(
    onPlayChannel: (url: String, title: String, cover: String, streamId: Int) -> Unit,
    selectedGenre: String?,
    onSelectGenre: (String?) -> Unit,
) {
    val vm: ContentViewModel = koinViewModel()
    val channelsState by vm.channels.collectAsState()
    val favorites     by vm.channelFavorites.collectAsState()
    val genreFavs     by vm.liveGenreFavorites.collectAsState()
    // rememberSaveable et non remember : ouvrir une fiche depuis un résultat détruit la
    // composition de cet écran. Avec `remember`, la recherche était perdue et le retour
    // ramenait sur la liste complète au lieu des résultats.
    var query by rememberSaveable { mutableStateOf("") }

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

    // Un thème mis en favori remonte en tête de la liste des thèmes — c'est la
    // contrepartie visible du signet, avec sa présence dans « Ma liste ».
    val allGrouped = remember(allChannels, genreFavs) {
        allChannels
            .groupBy { (it.group ?: "Other").trim().lowercase() }
            .entries
            .map { (_, items) -> (items.first().group ?: "Other").trim() to items }
            .sortedWith(compareBy({ !genreFavs.contains(it.first) }, { it.first.lowercase() }))
    }

    when (channelsState) {
        is ContentState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Purple)
        }
        is ContentState.Error -> Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
            Text((channelsState as ContentState.Error).reason.toDisplayString(), color = ColorError)
        }
        else -> {
            // La liste de thèmes est l'accueil de l'onglet ; tout le reste est une liste
            // de chaînes filtrée.
            val showThemes = selectedGenre == null && query.isEmpty()

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
                                Text(stringResource(R.string.search_channels), color = TextSub.copy(0.4f), fontSize = 14.sp)
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
                    contentPadding = PaddingValues(
                        start = 16.dp, end = 16.dp,
                        top = 16.dp, bottom = 16.dp,
                    ),
                    // Une liste dense n'a pas besoin du même air qu'une pile de cartes.
                    verticalArrangement = Arrangement.spacedBy(if (showThemes) 12.dp else 2.dp),
                ) {
                    if (showThemes) {
                        allGrouped.forEach { (genre, list) ->
                            item(key = "theme_$genre") {
                                ThemeCard(
                                    label      = genre,
                                    subtitle   = pluralStringResource(R.plurals.count_channels, list.size, list.size),
                                    isFavorite = genreFavs.contains(genre),
                                    onFavorite = { vm.toggleLiveGenreFavorite(genre) },
                                    onClick    = { onSelectGenre(genre) },
                                )
                            }
                        }
                    } else {
                        // Liste plate : un seul axe de défilement. L'imbrication d'une
                        // LazyRow dans une LazyColumn obligeait à faire défiler
                        // horizontalement pour atteindre la 40ᵉ chaîne d'un genre.
                        grouped.forEach { (genre, channels) ->
                            item(key = "lheader_$genre") {
                                GroupHeader(
                                    genre      = genre,
                                    count      = channels.size,
                                    isFavorite = genreFavs.contains(genre),
                                    isSelected = selectedGenre == genre,
                                    onFavorite = { vm.toggleLiveGenreFavorite(genre) },
                                    onClick    = { onSelectGenre(if (selectedGenre == genre) null else genre) },
                                )
                            }
                            items(channels, key = { "lrow_" + it.url }) { channel ->
                                ChannelRow(
                                    channel = channel,
                                    isFav   = favorites.contains(channel.name),
                                    onPlay  = { onPlayChannel(channel.url, channel.name, channel.logo ?: "", channel.streamId ?: 0) },
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

/**
 * Carte d'un thème.
 *
 * Le signet est la seule façon de mettre un thème en favori depuis que le tiroir a
 * disparu : il le remonte en tête de cet écran **et** le fait apparaître dans « Ma
 * liste ». C'est aussi le geste de retrait, depuis « Ma liste » comme depuis ici.
 */
@Composable
fun ThemeCard(
    label:      String,
    subtitle:   String,
    isFavorite: Boolean,
    onFavorite: () -> Unit,
    onClick:    () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = BgCard,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, if (isFavorite) Purple.copy(alpha = 0.55f) else BorderPurple.copy(alpha = 0.2f))
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 16.dp, bottom = 16.dp),
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
                Text(subtitle, color = TextSub, fontSize = 13.sp)
            }

            IconButton(onClick = onFavorite, modifier = Modifier.size(40.dp)) {
                Icon(
                    imageVector = if (isFavorite) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                    contentDescription = null,
                    tint = if (isFavorite) Purple else TextSub.copy(alpha = 0.45f),
                    modifier = Modifier.size(20.dp),
                )
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
                    Text(stringResource(R.string.action_remove_from_list), color = ColorError, fontSize = 15.sp, fontWeight = FontWeight.Medium)
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
                    Text(stringResource(R.string.btn_cancel), color = TextSub, fontSize = 15.sp)
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
