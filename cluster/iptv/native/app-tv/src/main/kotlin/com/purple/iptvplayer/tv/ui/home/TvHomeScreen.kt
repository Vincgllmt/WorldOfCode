package com.purple.iptvplayer.tv.ui.home

import com.purple.iptvplayer.tv.ui.common.toDisplayString
import androidx.activity.compose.BackHandler
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.foundation.focusable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.runtime.withFrameNanos
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.res.pluralStringResource
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
import com.purple.iptvplayer.tv.ui.common.TvGenrePreview
import com.purple.iptvplayer.tv.ui.common.dpadPageJump
import com.purple.iptvplayer.tv.ui.common.tvGroupEntry
import com.purple.iptvplayer.tv.ui.theme.TvSurfaceDefaults
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import androidx.tv.material3.LocalContentColor
import androidx.compose.foundation.focusGroup
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.onFocusEvent
import kotlinx.coroutines.delay
import com.purple.iptvplayer.core.GenrePolicy

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
    // Conservé quand on quitte l'onglet, cf. le porteur d'état de TvMainScreen.
    var searchQuery   by rememberSaveable { mutableStateOf("") }
    var selectedGroup by rememberSaveable { mutableStateOf<String?>(null) }

    // G9 — point d'entrée de la grille de résultats.
    val firstResultFocus = remember { FocusRequester() }
    var firstResultReady by remember { mutableStateOf(false) }

    // G15 — le genre survolé, et sa version temporisée qui pilote le panneau droit.
    var focusedGenre by remember { mutableStateOf<String?>(null) }
    var previewGenre by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(focusedGenre) {
        val g = focusedGenre ?: return@LaunchedEffect
        delay(TvGenrePreview.FOLLOW_DELAY_MS)
        previewGenre = g
    }

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
                (channelsState as ContentState.Error).reason.toDisplayString(),
                style = LocalPurpleType.current.body.copy(color = PurplePalette.Danger),
            )
        }

        else -> {
            val allChannels = (channelsState as? ContentState.Success)?.data ?: emptyList()

            val grouped = remember(allChannels, genreFavs) {
                allChannels
                    .groupBy { GenrePolicy.key(it.group).ifEmpty { "Autres" } }
                    .entries
                    .filter { it.key.isNotBlank() }
                    .sortedWith(compareBy(
                        { !genreFavs.contains(it.key) },
                        { GenrePolicy.sortKey(it.key) },
                    ))
                    .map { it.key to it.value }
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
                            onClick  = {
                                if (searchQuery.isNotEmpty()) searchQuery = ""
                                else selectedGroup = null
                            },
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
                        val countLabel = if (searchQuery.isNotEmpty()) {
                            pluralStringResource(R.plurals.count_results, searchResults.size, searchResults.size)
                        } else {
                            val channelsLabel = pluralStringResource(R.plurals.count_channels, allChannels.size, allChannels.size)
                            val genresLabel = pluralStringResource(R.plurals.count_genres, grouped.size, grouped.size)
                            "$channelsLabel - $genresLabel"
                        }
                        Text(
                            countLabel,
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
                        modifier            = Modifier
                            .fillMaxSize()
                            // `▼` depuis la barre retenait le résultat le plus proche en
                            // ABSCISSE — le n°2 (x=533) plutôt que le n°1 (x=192).
                            .tvGroupEntry(target = { firstResultFocus.takeIf { firstResultReady } })
                            .dpadPageJump(pageSize = 8),
                        contentPadding      = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        itemsIndexed(searchResults, key = { _, c -> c.url }) { index, channel ->
                            if (index == 0) {
                                DisposableEffect(Unit) {
                                    firstResultReady = true
                                    onDispose { firstResultReady = false }
                                }
                            }
                            TvChannelRow(
                                channel  = channel,
                                isFav    = channelFavs.contains(channel.name),
                                onPlay   = { onPlay(channel.url, channel.name, channel.streamId ?: 0) },
                                onFav    = { vm.toggleChannelFavorite(channel.name) },
                                modifier = if (index == 0) Modifier.focusRequester(firstResultFocus) else Modifier,
                            )
                        }
                    }

                    // ── Deux panneaux : genres à gauche, chaînes à droite ─────
                    // Remplace les rangées horizontales imbriquées dans une colonne :
                    // atteindre la 40ᵉ chaîne d'un genre y demandait 40 appuis à droite.
                    // Ici haut/bas avance d'une chaîne, un seul axe par panneau.
                    else -> {
                        // G15 — le panneau droit suit désormais le FOCUS, pas seulement
                        // la validation. `selectedGroup` reste prioritaire : c'est
                        // l'intention explicite, et la seule qui survive à un changement
                        // d'onglet.
                        val currentGenre = TvGenrePreview.resolve(
                            selected  = selectedGroup,
                            previewed = previewGenre,
                            first     = grouped.firstOrNull()?.first,
                        )
                        val shown = remember(grouped, currentGenre, channelFavs) {
                            (grouped.find { it.first == currentGenre }?.second ?: emptyList())
                                .sortedByDescending { channelFavs.contains(it.name) }
                        }
                        val channelListState = rememberLazyListState()
                        LaunchedEffect(selectedGroup) {
                            channelListState.scrollToItem(0)
                        }

                        Row(modifier = Modifier.fillMaxSize()) {

                            LazyColumn(
                                modifier            = Modifier
                                    .width(360.dp)
                                    .fillMaxHeight()
                                    // G8/G11 — PAGE_UP/PAGE_DOWN (et CHANNEL_UP/DOWN)
                                    // déplacent le focus au lieu de le détruire. 10 lignes
                                    // de genres tiennent à l'écran.
                                    .dpadPageJump(pageSize = 10),
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
                                        // Survoler reprend la main sur une validation
                                        // antérieure, sinon le panneau resterait figé sur
                                        // le dernier genre validé.
                                        onFocused    = { focusedGenre = genre; selectedGroup = null },
                                        onToggleFav = { vm.toggleLiveGenreFavorite(genre) },
                                    )
                                }
                            }

                            LazyColumn(
                                state               = channelListState,
                                modifier            = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                                    // Lignes de chaînes, plus hautes : 8 par écran.
                                    .dpadPageJump(pageSize = 8),
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

    // Le champ de texte n'entre dans le parcours du focus **qu'une fois activé**.
    //
    // Sans cela, il prenait le focus au simple passage, ouvrait le clavier virtuel, et
    // celui-ci avalait les touches directionnelles : traverser la barre à la télécommande
    // écrivait dedans (« Simpson » devenait « Simpsonp »). La barre reste focalisable —
    // c'est la validation qui donne le curseur, motif habituel des interfaces TV.
    var editing by remember { mutableStateOf(false) }
    val fieldFocus = remember { FocusRequester() }
    LaunchedEffect(editing) {
        if (editing) {
            // Laisser la recomposition appliquer `canFocus = true` avant de réclamer le
            // focus, sinon la demande porte sur un nœud encore non focalisable.
            withFrameNanos { }
            runCatching { fieldFocus.requestFocus() }
        }
    }
    Row(
        modifier              = modifier
            // G9 — on n'entre dans la barre que par le HAUT. Elle est ancrée en haut à
            // droite (x ≈ 1312) alors que les résultats commencent à gauche (x = 192) :
            // `▶` sur le dernier résultat d'une ligne, faute de voisin à droite, remontait
            // s'y poser. Même raisonnement que le rail au §30, sur l'autre axe.
            .tvGroupEntry(blocked = setOf(FocusDirection.Left, FocusDirection.Right))
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
            // `clickable` rend déjà l'élément focalisable : ajouter `focusable()` en
            // plus faisait deux nœuds concurrents et la validation n'atteignait pas
            // l'`onClick`.
            .onFocusChanged { isFocused = it.hasFocus; if (!it.hasFocus) editing = false }
            .clickable { editing = true }
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
                keyboardActions = KeyboardActions(onSearch = {
                    focusManager.clearFocus()
                }),
                modifier        = Modifier
                    .fillMaxWidth()
                    .focusRequester(fieldFocus)
                    .focusProperties { canFocus = editing },
            )
        }
        if (query.isNotEmpty()) {
            androidx.compose.material3.Surface(
                onClick = { onQuery("") },
                shape = RoundedCornerShape(4.dp),
                color = androidx.compose.material3.MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.size(20.dp),
            ) {
                Icon(
                    Icons.Rounded.Close, null,
                    tint     = PurplePalette.Fg4,
                    modifier = Modifier.padding(3.dp),
                )
            }
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
        // G10 — un chip sélectionné est DÉJÀ sur l'accent : son contenu doit être sombre
        // même sans focus, sinon il reste à 3,27 : 1 en permanence.
        colors            = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) PurplePalette.Purple400 else PurplePalette.Bg2,
            contentColor          = if (selected) PurplePalette.FgOnPrimary else PurplePalette.Fg2,
            focusedContainerColor = PurplePalette.Purple400,
            focusedContentColor   = PurplePalette.FgOnPrimary,
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
                    tint     = LocalContentColor.current,
                    modifier = Modifier.size(11.dp),
                )
            }
            Text(
                label,
                style = LocalPurpleType.current.bodySmall.copy(
                    color      = LocalContentColor.current,
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
    /** G15 — signale le survol sans devenir un second focalisable (§8.10). */
    onFocused:   () -> Unit,
    onToggleFav: () -> Unit,
) {
    // G11 — l'étoile de genre facturait elle aussi un appui à chaque traversée.
    var rowHasFocus by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .focusGroup()
            .onFocusEvent { rowHasFocus = it.hasFocus },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Surface(
            onClick  = onClick,
            modifier = Modifier
                .weight(1f)
                .onFocusChanged { if (it.isFocused) onFocused() },
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
            colors   = TvSurfaceDefaults.onAccent(
                containerColor = if (isSelected) PurplePalette.Purple400.copy(alpha = 0.18f) else Color.Transparent,
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
                        color = LocalContentColor.current, fontWeight = FontWeight.SemiBold,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    count.toString(),
                    // Le compteur reste secondaire au repos ; sur l'accent il doit suivre,
                    // sinon `Fg3` (55 % de blanc) tombe sous 2 : 1.
                    style = LocalPurpleType.current.bodySmall.copy(
                        color = LocalContentColor.current.copy(alpha = 0.65f),
                    ),
                )
            }
        }
        Surface(
            onClick = onToggleFav,
            modifier = Modifier
                .alpha(if (rowHasFocus) 1f else 0.35f)
                .focusProperties { canFocus = rowHasFocus },
            shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
            colors  = TvSurfaceDefaults.onAccent(containerColor = Color.Transparent),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            val focused = LocalContentColor.current == PurplePalette.FgOnPrimary
            Box(Modifier.size(44.dp), contentAlignment = Alignment.Center) {
                Text(
                    if (isFav) "★" else "☆",
                    color    = when {
                        focused -> PurplePalette.FgOnPrimary   // l'or tombe à 2,1 : 1 sur l'accent
                        isFav   -> Color(0xFFFFD700)
                        else    -> PurplePalette.Fg4
                    },
                    fontSize = 16.sp,
                )
            }
        }
    }
}
