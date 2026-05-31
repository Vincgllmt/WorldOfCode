package com.purple.iptvplayer.mobile.ui.main

import android.app.Activity
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.purple.iptvplayer.R
import com.purple.iptvplayer.core.data.CredentialsRepository
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import com.purple.iptvplayer.mobile.ui.cast.CastButton
import com.purple.iptvplayer.mobile.ui.cast.CastRemoteSheet
import com.purple.iptvplayer.mobile.ui.downloads.DownloadsScreen
import com.purple.iptvplayer.mobile.ui.home.HomeScreen
import com.purple.iptvplayer.mobile.ui.home.LayoutMode
import com.purple.iptvplayer.mobile.ui.movies.MoviesScreen
import com.purple.iptvplayer.mobile.ui.mylist.MyListScreen
import com.purple.iptvplayer.mobile.ui.series.SeriesScreen
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.mobile.util.LocaleHelper
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject

@Composable
fun MainScreen(
    onPlayChannel:  (url: String, title: String, cover: String, streamId: Int) -> Unit,
    onPlayMovie:    (url: String, title: String, id: Int, cover: String) -> Unit,
    onMovieDetail:  (id: Int) -> Unit,
    onSeriesDetail: (id: Int) -> Unit,
    onPurchase:     () -> Unit,
    onLogout:       () -> Unit,
) {
    val context  = LocalContext.current
    val activity = context as? Activity
    val scope    = rememberCoroutineScope()

    val trialVm:   TrialViewModel   = koinViewModel()
    val contentVm: ContentViewModel = koinViewModel()
    val castVm:    CastViewModel    = koinViewModel()
    val playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel()
    val credRepo:  CredentialsRepository = koinInject()

    val remainingDays by trialVm.remainingDays.collectAsState()
    val isPro         by trialVm.isPro.collectAsState()
    val channelsState by contentVm.channels.collectAsState()
    val moviesState   by contentVm.movies.collectAsState()
    val seriesState   by contentVm.series.collectAsState()
    val genreFavs        by contentVm.liveGenreFavorites.collectAsState()
    val movieGenreFavs   by contentVm.movieGenreFavorites.collectAsState()
    val seriesGenreFavs  by contentVm.seriesGenreFavorites.collectAsState()

    var currentTab       by rememberSaveable { mutableIntStateOf(0) }
    var drawerOpen       by remember { mutableStateOf(false) }
    var settingsOpen     by remember { mutableStateOf(false) }
    var layoutPickerOpen by remember { mutableStateOf(false) }
    // Store as Int to avoid enum serialization issues with rememberSaveable + NavHost
    var layoutModeIndex by rememberSaveable { mutableIntStateOf(2) } // 0=THEMES 1=GRID_SMALL 2=GRID_MEDIUM
    val layoutMode = LayoutMode.entries[layoutModeIndex]
    var selectedGenre    by remember { mutableStateOf<String?>(null) }
    var currentLang      by remember { mutableStateOf(LocaleHelper.getLanguage(context)) }

    // Proactively load all content so genres are ready when drawer opens
    LaunchedEffect(Unit) {
        contentVm.loadChannels()
        contentVm.loadMovies()
        contentVm.loadSeries()
    }

    // Reset genre filter when switching tabs
    LaunchedEffect(currentTab) { selectedGenre = null }

    val allChannels = (channelsState as? ContentState.Success)?.data ?: emptyList()
    val allMovies   = (moviesState   as? ContentState.Success)?.data ?: emptyList()
    val allSeries   = (seriesState   as? ContentState.Success)?.data ?: emptyList()

    // Per-tab genre data for the drawer (case-insensitive deduplication)
    val currentGenres = remember(currentTab, allChannels, allMovies, allSeries) {
        fun deduplicateGenres(groups: List<String?>): List<String> =
            groups.mapNotNull { it?.trim() }
                .groupBy { it.lowercase() }
                .map { (_, names) -> names.first() }
                .sortedBy { it.lowercase() }
        when (currentTab) {
            0 -> deduplicateGenres(allChannels.map { it.group })
            1 -> deduplicateGenres(allMovies.map { it.group })
            2 -> deduplicateGenres(allSeries.map { it.group })
            else -> emptyList()
        }
    }
    val currentGenreCountMap = remember(currentTab, allChannels, allMovies, allSeries) {
        fun countByGroup(groups: List<String?>): Map<String, Int> =
            groups.mapNotNull { it?.trim() }
                .groupBy { it.lowercase() }
                .entries.associate { (lowKey, names) ->
                    names.first() to names.size
                }
        when (currentTab) {
            0 -> allChannels.groupBy { (it.group ?: "Others").trim().lowercase() }
                    .entries.associate { (_, items) -> (items.first().group?.trim() ?: "Others") to items.size }
            1 -> allMovies.groupBy { (it.group ?: "Others").trim().lowercase() }
                    .entries.associate { (_, items) -> (items.first().group?.trim() ?: "Others") to items.size }
            2 -> allSeries.groupBy { (it.group ?: "Others").trim().lowercase() }
                    .entries.associate { (_, items) -> (items.first().group?.trim() ?: "Others") to items.size }
            else -> emptyMap()
        }
    }
    val currentTotalItems = remember(currentTab, allChannels, allMovies, allSeries) {
        when (currentTab) { 0 -> allChannels.size; 1 -> allMovies.size; 2 -> allSeries.size; else -> 0 }
    }
    val currentGenreFavs = when (currentTab) {
        0    -> genreFavs
        1    -> movieGenreFavs
        2    -> seriesGenreFavs
        else -> emptySet()
    }

    Column(modifier = Modifier.fillMaxSize().background(BgApp)) {

        // ── Trial banner ──────────────────────────────────────────────────────
        if (!isPro) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Purple)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Rounded.Timer, null, tint = TextPrimary, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    text = if (remainingDays > 0)
                        stringResource(R.string.trial_banner, remainingDays)
                    else
                        stringResource(R.string.trial_expired),
                    color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                    modifier = Modifier.weight(1f),
                )
                OutlinedButton(
                    onClick = onPurchase,
                    border = BorderStroke(1.dp, TextPrimary),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 0.dp),
                    modifier = Modifier.height(30.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                ) {
                    Text(stringResource(R.string.btn_activate), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }

        // ── Main area ─────────────────────────────────────────────────────────
        Box(modifier = Modifier.weight(1f)) {
            Column(modifier = Modifier.fillMaxSize()) {
                TopBar(
                    showHamburger       = currentTab < 3,
                    onHamburger         = { drawerOpen = true },
                    layoutPickerOpen    = layoutPickerOpen,
                    layoutMode          = layoutMode,
                    setLayoutPickerOpen = { layoutPickerOpen = it },
                    onLayoutSelect      = { layoutModeIndex = it.ordinal; layoutPickerOpen = false },
                    onSettings          = { settingsOpen = true },
                    castSlot            = { CastButton(modifier = Modifier.size(40.dp), tint = Color.White) },
                )

                Box(modifier = Modifier.weight(1f)) {
                    when (currentTab) {
                        0 -> HomeScreen(
                            onPlayChannel = { url, title, cover, streamId -> onPlayChannel(url, title, cover, streamId) },
                            selectedGenre = selectedGenre,
                            onSelectGenre = { selectedGenre = it },
                            layoutMode    = layoutMode,
                        )
                        1 -> MoviesScreen(
                            onPlayMovie   = onPlayMovie,
                            onMovieDetail = onMovieDetail,
                            selectedGenre = selectedGenre,
                            onSelectGenre = { selectedGenre = it },
                            layoutMode    = layoutMode,
                        )
                        2 -> SeriesScreen(
                            onSeriesDetail = onSeriesDetail,
                            selectedGenre  = selectedGenre,
                            onSelectGenre  = { selectedGenre = it },
                            layoutMode     = layoutMode,
                        )
                        3 -> MyListScreen(
                            onMovieDetail  = onMovieDetail,
                            onSeriesDetail = onSeriesDetail,
                        )
                        4 -> DownloadsScreen(onPlay = { url, title -> onPlayChannel(url, title, "", 0) })
                    }
                }
            }

            // Genre drawer overlay (shown on tabs 0–2)
            if (currentTab < 3) {
                DrawerOverlay(
                    visible          = drawerOpen,
                    tabLabel         = when (currentTab) {
                        0 -> stringResource(R.string.nav_live)
                        1 -> stringResource(R.string.nav_movies)
                        else -> stringResource(R.string.nav_series)
                    },
                    genres           = currentGenres,
                    genreCountMap    = currentGenreCountMap,
                    totalItems       = currentTotalItems,
                    genreFavs        = currentGenreFavs,
                    showBookmarks    = true,
                    selectedGenre    = selectedGenre,
                    onSelectGenre    = { selectedGenre = it; drawerOpen = false },
                    onFavGenre       = { genre ->
                        when (currentTab) {
                            0    -> contentVm.toggleLiveGenreFavorite(genre)
                            1    -> contentVm.toggleMovieGenreFavorite(genre)
                            2    -> contentVm.toggleSeriesGenreFavorite(genre)
                        }
                    },
                    onChangeAccount  = { drawerOpen = false; settingsOpen = true },
                    onClose          = { drawerOpen = false },
                )
            }
        }

        BottomNav(currentTab = currentTab, onTabSelect = { currentTab = it })
    }

    if (settingsOpen) {
        SettingsDialog(
            currentLang  = currentLang,
            playerVm     = playerVm,
            onLangSelect = { lang ->
                currentLang = lang
                LocaleHelper.setLocale(context, lang)
                activity?.recreate()
                settingsOpen = false
            },
            onLogout = {
                scope.launch {
                    credRepo.clear()
                    settingsOpen = false
                    onLogout()
                }
            },
            onDismiss = { settingsOpen = false },
        )
    }
}

// ── Top bar ───────────────────────────────────────────────────────────────────

@Composable
private fun TopBar(
    showHamburger:       Boolean,
    onHamburger:         () -> Unit,
    layoutPickerOpen:    Boolean,
    layoutMode:          LayoutMode,
    setLayoutPickerOpen: (Boolean) -> Unit,
    onLayoutSelect:      (LayoutMode) -> Unit,
    onSettings:          () -> Unit,
    castSlot:            @Composable (() -> Unit)? = null,
) {
    data class LayoutOption(val mode: LayoutMode, val icon: ImageVector, val label: String)

    val layoutOptions = listOf(
        LayoutOption(LayoutMode.THEMES,     Icons.Rounded.ViewList, stringResource(R.string.layout_themes)),
        LayoutOption(LayoutMode.GRID_SMALL, Icons.Rounded.Apps,     stringResource(R.string.layout_small)),
        LayoutOption(LayoutMode.GRID_MEDIUM,Icons.Rounded.GridView, stringResource(R.string.layout_medium)),
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(BgCard)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showHamburger) {
            IconButton(onClick = onHamburger) {
                Icon(Icons.Rounded.Menu, null, tint = TextPrimary)
            }
        } else {
            Spacer(Modifier.width(12.dp))
        }

        Row(
            modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_logo),
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                contentScale = ContentScale.Fit,
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(color = PurpleGlow, fontWeight = FontWeight.Black)) { append("PURPLE") }
                    withStyle(SpanStyle(color = TextPrimary, fontWeight = FontWeight.Black)) { append(" IPTV") }
                },
                fontSize = 18.sp,
            )
        }

        Box {
            IconButton(onClick = { setLayoutPickerOpen(true) }) {
                Icon(Icons.Rounded.GridView, null, tint = if (layoutPickerOpen) PurpleGlow else TextPrimary)
            }
            DropdownMenu(
                expanded = layoutPickerOpen,
                onDismissRequest = { setLayoutPickerOpen(false) },
                modifier = Modifier.background(BgCard),
            ) {
                layoutOptions.forEach { opt ->
                    val selected = layoutMode == opt.mode
                    DropdownMenuItem(
                        text = {
                            Text(opt.label,
                                color = if (selected) PurpleGlow else TextPrimary,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                fontSize = 14.sp)
                        },
                        leadingIcon = {
                            Icon(opt.icon, null,
                                tint = if (selected) PurpleGlow else TextSub,
                                modifier = Modifier.size(20.dp))
                        },
                        onClick = { onLayoutSelect(opt.mode) },
                        modifier = Modifier.background(if (selected) Purple.copy(alpha = 0.15f) else Color.Transparent),
                        colors = MenuDefaults.itemColors(textColor = TextPrimary),
                    )
                }
            }
        }

        castSlot?.invoke()
        IconButton(onClick = onSettings) {
            Icon(Icons.Rounded.Settings, null, tint = TextPrimary)
        }
    }
}

// ── Drawer overlay ────────────────────────────────────────────────────────────

@Composable
private fun DrawerOverlay(
    visible:        Boolean,
    tabLabel:       String,
    genres:         List<String>,
    genreCountMap:  Map<String, Int>,
    totalItems:     Int,
    genreFavs:      Set<String>,
    showBookmarks:  Boolean,
    selectedGenre:  String?,
    onSelectGenre:  (String?) -> Unit,
    onFavGenre:     (String) -> Unit,
    onChangeAccount: () -> Unit,
    onClose:        () -> Unit,
) {
    AnimatedVisibility(
        visible = visible,
        enter   = slideInHorizontally(initialOffsetX = { -it }),
        exit    = slideOutHorizontally(targetOffsetX = { -it }),
    ) {
        Row(modifier = Modifier.fillMaxSize()) {
            GenreDrawer(
                tabLabel        = tabLabel,
                genres          = genres,
                genreCountMap   = genreCountMap,
                totalItems      = totalItems,
                genreFavs       = genreFavs,
                showBookmarks   = showBookmarks,
                selectedGenre   = selectedGenre,
                onSelectGenre   = onSelectGenre,
                onFavGenre      = onFavGenre,
                onChangeAccount = onChangeAccount,
                onClose         = onClose,
                modifier        = Modifier.fillMaxHeight().fillMaxWidth(0.82f),
            )
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .background(Color.Black.copy(alpha = 0.55f))
                    .clickable { onClose() },
            )
        }
    }
}

// ── Genre drawer ──────────────────────────────────────────────────────────────

@Composable
private fun GenreDrawer(
    tabLabel:       String,
    genres:         List<String>,
    genreCountMap:  Map<String, Int>,
    totalItems:     Int,
    genreFavs:      Set<String>,
    showBookmarks:  Boolean,
    selectedGenre:  String?,
    onSelectGenre:  (String?) -> Unit,
    onFavGenre:     (String) -> Unit,
    onChangeAccount: () -> Unit,
    onClose:        () -> Unit,
    modifier:       Modifier,
) {
    var drawerSearch by remember { mutableStateOf("") }

    val displayed = remember(genres, genreFavs, drawerSearch) {
        val q = drawerSearch.normalizeSearch()
        genres
            .filter { q.isEmpty() || it.normalizeSearch().contains(q) }
            .sortedWith(compareBy({ !genreFavs.contains(it) }, { it }))
    }

    Column(modifier = modifier.background(BgCard)) {

        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.width(3.dp).height(22.dp).clip(RoundedCornerShape(2.dp)).background(Purple))
            Spacer(Modifier.width(10.dp))
            Text(tabLabel, color = PurpleGlow, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.weight(1f))
            IconButton(onClick = onClose) {
                Icon(Icons.Rounded.Close, null, tint = TextPrimary)
            }
        }

        // Search field
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(BgHome)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.Search, null, tint = TextSub, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            BasicTextField(
                value = drawerSearch,
                onValueChange = { drawerSearch = it },
                singleLine = true,
                textStyle = TextStyle(color = TextPrimary, fontSize = 14.sp),
                cursorBrush = SolidColor(Purple),
                modifier = Modifier.weight(1f),
                decorationBox = { inner ->
                    if (drawerSearch.isEmpty()) {
                        Text(stringResource(R.string.drawer_search_hint), color = TextSub.copy(0.4f), fontSize = 14.sp)
                    }
                    inner()
                },
            )
            if (drawerSearch.isNotEmpty()) {
                IconButton(onClick = { drawerSearch = "" }, modifier = Modifier.size(24.dp)) {
                    Icon(Icons.Rounded.Close, null, tint = TextSub, modifier = Modifier.size(14.dp))
                }
            }
        }

        Spacer(Modifier.height(4.dp))

        LazyColumn(modifier = Modifier.weight(1f)) {
            // "All genres" row
            item {
                val allSelected = selectedGenre == null
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .then(
                            if (allSelected)
                                Modifier.border(1.5.dp, Purple, RoundedCornerShape(12.dp)).background(Purple.copy(0.10f))
                            else Modifier
                        )
                        .clickable { onSelectGenre(null) }
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (allSelected) {
                        Box(Modifier.width(3.dp).height(16.dp).clip(RoundedCornerShape(2.dp)).background(Purple))
                        Spacer(Modifier.width(10.dp))
                    }
                    Text(
                        stringResource(R.string.genre_all),
                        color = if (allSelected) PurpleGlow else TextPrimary,
                        fontSize = 15.sp, fontWeight = if (allSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text("$totalItems",
                        color = if (allSelected) PurpleGlow else TextSub,
                        fontSize = 15.sp, fontWeight = if (allSelected) FontWeight.ExtraBold else FontWeight.Normal)
                }
            }

            if (drawerSearch.isEmpty()) {
                item {
                    Text("${genres.size} genres", color = TextSub, fontSize = 12.sp,
                        modifier = Modifier.padding(start = 26.dp, top = 6.dp, bottom = 2.dp))
                }
            }

            items(displayed, key = { it }) { genre ->
                val count    = genreCountMap[genre] ?: 0
                val selected = selectedGenre == genre
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectGenre(genre) }
                        .padding(start = 26.dp, end = 8.dp, top = 14.dp, bottom = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(genre,
                        color = if (selected) PurpleGlow else TextPrimary,
                        fontSize = 14.sp,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                        modifier = Modifier.weight(1f))
                    Text("$count", color = TextSub, fontSize = 14.sp)
                    if (showBookmarks) {
                        Spacer(Modifier.width(6.dp))
                        IconButton(onClick = { onFavGenre(genre) }, modifier = Modifier.size(30.dp)) {
                            Icon(
                                imageVector = if (genreFavs.contains(genre)) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                                contentDescription = null,
                                tint = if (genreFavs.contains(genre)) Purple else TextSub.copy(0.4f),
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    } else {
                        Spacer(Modifier.width(8.dp))
                    }
                }
            }
        }

        // Change account
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onChangeAccount() }
                .padding(horizontal = 24.dp, vertical = 16.dp)
                .navigationBarsPadding(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(Icons.Rounded.Logout, null, tint = ColorError, modifier = Modifier.size(18.dp))
            Text(stringResource(R.string.change_account), color = ColorError, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── Settings dialog ───────────────────────────────────────────────────────────

@Composable
private fun SettingsDialog(
    currentLang:  String,
    playerVm:     com.purple.iptvplayer.core.viewmodel.PlayerViewModel,
    onLangSelect: (String) -> Unit,
    onLogout:     () -> Unit,
    onDismiss:    () -> Unit,
) {
    val subSize by playerVm.subtitleSize.collectAsState(initial = 1.0f)
    val subColor by playerVm.subtitleColor.collectAsState(initial = "white")
    val subBg by playerVm.subtitleBackground.collectAsState(initial = false)

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .fillMaxHeight(0.85f)
                .clip(RoundedCornerShape(28.dp))
                .background(BgCard),
        ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 24.dp),
        ) {
            Text(stringResource(R.string.settings_title), color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(20.dp))
            
            Text(stringResource(R.string.settings_language), color = PurpleGlow, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf("fr", "en").forEach { lang ->
                    val active = currentLang == lang
                    Box(
                        modifier = Modifier
                            .width(80.dp).height(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (active) Purple else BgHome)
                            .clickable { onLangSelect(lang) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(lang.uppercase(), color = TextPrimary, fontSize = 16.sp,
                            fontWeight = if (active) FontWeight.ExtraBold else FontWeight.Medium)
                    }
                }
            }
            
            Spacer(Modifier.height(24.dp))
            HorizontalDivider(color = BorderPurple.copy(alpha = 0.5f))
            Spacer(Modifier.height(24.dp))

            Text(stringResource(R.string.subtitle_style_title), color = PurpleGlow, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(16.dp))
            SubtitleSettingsSection(subSize = subSize, subColor = subColor, subBg = subBg, playerVm = playerVm)

            Spacer(Modifier.height(24.dp))
            HorizontalDivider(color = BorderPurple.copy(alpha = 0.5f))
            Spacer(Modifier.height(24.dp))

            Text(stringResource(R.string.settings_logout_title), color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(stringResource(R.string.settings_logout_desc), color = TextSub, fontSize = 14.sp, lineHeight = 20.sp)
            Spacer(Modifier.height(20.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onDismiss) {
                    Text(stringResource(R.string.btn_cancel), color = TextPrimary, fontSize = 15.sp)
                }
                Spacer(Modifier.width(8.dp))
                TextButton(onClick = onLogout) {
                    Text(stringResource(R.string.btn_logout), color = ColorError, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        } // Box
    }
}

@Composable
private fun SubtitleSettingsSection(
    subSize: Float,
    subColor: String,
    subBg: Boolean,
    playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel,
) {
    Text(stringResource(R.string.subtitle_size_label), color = TextSub, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(vertical = 10.dp)) {
        listOf(
            0.75f to R.string.subtitle_size_small,
            1.0f  to R.string.subtitle_size_medium,
            1.5f  to R.string.subtitle_size_large,
        ).forEach { (size, labelRes) ->
            val selected = subSize == size
            Surface(
                onClick = { playerVm.updateSubtitleSize(size) },
                shape = RoundedCornerShape(10.dp),
                color = if (selected) Purple.copy(0.2f) else BgHome,
                border = BorderStroke(1.dp, if (selected) PurpleGlow else Color.Transparent)
            ) {
                Text(
                    stringResource(labelRes),
                    color = if (selected) PurpleGlow else TextSub,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    fontSize = 14.sp, fontWeight = FontWeight.Bold,
                )
            }
        }
    }

    Spacer(Modifier.height(16.dp))

    Text(stringResource(R.string.subtitle_color_label), color = TextSub, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(vertical = 10.dp)) {
        ColorOptionSmall(name = stringResource(R.string.subtitle_color_white), color = Color.White, selected = subColor == "white") { playerVm.updateSubtitleColor("white") }
        ColorOptionSmall(name = stringResource(R.string.subtitle_color_yellow), color = Color.Yellow, selected = subColor == "yellow") { playerVm.updateSubtitleColor("yellow") }
    }

    Spacer(Modifier.height(16.dp))

    Text(stringResource(R.string.subtitle_background_label), color = TextSub, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().clickable { playerVm.updateSubtitleBackground(!subBg) }.padding(vertical = 8.dp),
    ) {
        Text(stringResource(R.string.subtitle_background_dark), color = TextPrimary, modifier = Modifier.weight(1f), fontSize = 14.sp)
        Switch(checked = subBg, onCheckedChange = { playerVm.updateSubtitleBackground(it) },
            colors = SwitchDefaults.colors(checkedThumbColor = PurpleGlow, checkedTrackColor = Purple))
    }

    Spacer(Modifier.height(20.dp))

    Text(stringResource(R.string.subtitle_preview_label), color = TextSub, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Spacer(Modifier.height(8.dp))
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            stringResource(R.string.subtitle_preview_text),
            color = if (subColor == "yellow") Color.Yellow else Color.White,
            fontSize = (20f * subSize).sp,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .then(if (subBg) Modifier.background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(4.dp)) else Modifier)
                .padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}

@Composable
private fun ColorOptionSmall(name: String, color: Color, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(8.dp),
        color = if (selected) Purple.copy(alpha = 0.2f) else Color.Transparent,
        border = BorderStroke(1.dp, if (selected) PurpleGlow else BorderPurple.copy(alpha = 0.3f))
    ) {
        Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(Modifier.size(14.dp).clip(CircleShape).background(color).border(0.5.dp, Color.Gray, CircleShape))
            Text(name, color = if (selected) Color.White else TextSub, fontSize = 13.sp)
        }
    }
}

// ── Bottom navigation ─────────────────────────────────────────────────────────

@Composable
private fun BottomNav(currentTab: Int, onTabSelect: (Int) -> Unit) {
    val labels = listOf(
        stringResource(R.string.nav_live),
        stringResource(R.string.nav_movies),
        stringResource(R.string.nav_series),
        "Ma liste",
        stringResource(R.string.nav_downloads),
    )
    val outlinedIcons = listOf(Icons.Outlined.LiveTv, Icons.Outlined.Movie, Icons.Outlined.Tv, Icons.Outlined.Bookmark, Icons.Outlined.Download)
    val filledIcons   = listOf(Icons.Rounded.LiveTv,  Icons.Rounded.Movie,  Icons.Rounded.Tv,  Icons.Rounded.Bookmark,  Icons.Rounded.Download)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BgApp)
            .border(1.dp, BorderPurple, RectangleShape)
            .navigationBarsPadding()
            .height(60.dp),
    ) {
        labels.indices.forEach { index ->
            val selected = currentTab == index
            Column(
                modifier = Modifier
                    .weight(1f).fillMaxHeight()
                    .clickable { onTabSelect(index) },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    imageVector = if (selected) filledIcons[index] else outlinedIcons[index],
                    contentDescription = labels[index],
                    tint = if (selected) PurpleGlow else TextPrimary.copy(alpha = 0.33f),
                    modifier = Modifier.size(24.dp),
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    text = labels[index],
                    fontSize = 10.sp,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                    color = if (selected) PurpleGlow else TextPrimary.copy(alpha = 0.33f),
                )
            }
        }
    }
}

private fun String.normalizeSearch(): String =
    java.text.Normalizer.normalize(this, java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
        .lowercase()
