package com.purple.iptvplayer.tv.ui.main

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.activity.ComponentActivity
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.util.LocaleHelper
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.BackHandler
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Glow
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.purple.iptvplayer.core.viewmodel.PlayerViewModel
import com.purple.iptvplayer.core.data.AccessState
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import com.purple.iptvplayer.tv.ui.common.TvPremiumBadge
import com.purple.iptvplayer.tv.ui.downloads.TvDownloadsScreen
import com.purple.iptvplayer.tv.ui.home.TvHomeScreen
import com.purple.iptvplayer.tv.ui.movies.TvMoviesScreen
import com.purple.iptvplayer.tv.ui.mylist.TvMyListScreen
import com.purple.iptvplayer.tv.ui.series.TvSeriesScreen
import com.purple.iptvplayer.tv.ui.theme.*
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel

private data class NavItem(val label: String, val icon: ImageVector)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvMainScreen(
    onPlay:    (url: String, title: String, mediaId: String, type: String, cover: String, streamId: Int) -> Unit,
    onPurchase: () -> Unit,
    onSignOut:  () -> Unit,
) {
    val trialVm: TrialViewModel = koinViewModel()
    val playerVm: PlayerViewModel = koinViewModel()
    val remainingDays by trialVm.remainingDays.collectAsState()
    val isPro         by trialVm.isPro.collectAsState()
    val access        by trialVm.accessState.collectAsState()

    var selectedIndex by remember { mutableIntStateOf(0) }
    var expanded      by remember { mutableStateOf(false) }
    var railHasFocus  by remember { mutableStateOf(false) }

    LaunchedEffect(railHasFocus) {
        if (railHasFocus) {
            delay(100)
            expanded = true
        } else {
            expanded = false
        }
    }

    val sidebarWidth by animateDpAsState(
        targetValue   = if (expanded) 240.dp else 72.dp,
        animationSpec = tween(220, easing = PurpleMotion.EaseOutQuint),
        label         = "rail-width",
    )

    val firstNavFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        delay(150)
        try { firstNavFocus.requestFocus() } catch (_: Exception) { }
    }

    val navItems = listOf(
        NavItem(stringResource(R.string.nav_live),       Icons.Rounded.LiveTv),
        NavItem(stringResource(R.string.nav_movies),           Icons.Rounded.Movie),
        NavItem(stringResource(R.string.nav_series),          Icons.Rounded.Tv),
        NavItem(stringResource(R.string.nav_mylist),        Icons.Rounded.Bookmarks),
        NavItem(stringResource(R.string.nav_downloads), Icons.Rounded.Download),
        NavItem(stringResource(R.string.nav_settings),      Icons.Rounded.Settings),
    )
    val settingsIndex = navItems.size - 1

    Row(modifier = Modifier.fillMaxSize().background(PurplePalette.Bg1)) {

        // ── SideRail ─────────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .width(sidebarWidth)
                .background(PurplePalette.Bg0)
                .onFocusEvent { state -> railHasFocus = state.hasFocus }
                .padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Brand lockup
            RailBrandLockup(expanded)

            Spacer(Modifier.height(8.dp))

            // Main nav items
            Column(Modifier.weight(1f)) {
                navItems.dropLast(1).forEachIndexed { index, item ->
                    RailItem(
                        icon           = item.icon,
                        label          = item.label,
                        isActive       = selectedIndex == index,
                        expanded       = expanded,
                        focusRequester = if (index == 0) firstNavFocus else null,
                        onClick        = { selectedIndex = index },
                    )
                }
            }

            // Settings at bottom
            RailItem(
                icon     = navItems.last().icon,
                label    = navItems.last().label,
                isActive = selectedIndex == settingsIndex,
                expanded = expanded,
                onClick  = { selectedIndex = settingsIndex },
            )

            // Badge d'état (UX-1) — même règle que sur mobile : un achat définitif
            // n'a rien à décompter, un abonné n'est pas un utilisateur d'essai.
            if (expanded) {
                when (val a = access) {
                    is AccessState.Pro -> Unit
                    is AccessState.Subscribed -> {
                        Spacer(Modifier.height(12.dp))
                        RailPremiumBadge(
                            days     = a.daysLeft,
                            onClick  = onPurchase,
                            modifier = Modifier.padding(horizontal = 14.dp),
                        )
                    }
                    else -> {
                        Spacer(Modifier.height(12.dp))
                        RailTrialBadge(
                            days     = (a as? AccessState.Trial)?.daysLeft ?: 0,
                            expanded = true,
                            onClick  = onPurchase,
                            modifier = Modifier.padding(horizontal = 14.dp),
                        )
                    }
                }
            }
        }

        // ── Content area ────────────────────────────────────────────────────
        Box(modifier = Modifier.weight(1f).fillMaxHeight()) {
            when (selectedIndex) {
                0 -> TvHomeScreen(onPlay = { url, title, streamId ->
                    onPlay(url, title, "", "live", "", streamId)
                })
                1 -> TvMoviesScreen(onPlay = { url, title, id, cover ->
                    onPlay(url, title, id.toString(), "movie", cover, 0)
                })
                2 -> TvSeriesScreen(onPlay = { url, title, mediaId, cover ->
                    onPlay(url, title, mediaId, "series", cover, 0)
                })
                3 -> TvMyListScreen(
                    onPlayMovie  = { url, title, id, cover -> onPlay(url, title, id.toString(), "movie", cover, 0) },
                    onPlaySeries = { url, title, mediaId, cover -> onPlay(url, title, mediaId, "series", cover, 0) },
                    onPlayChannel = { url, title, streamId -> onPlay(url, title, "", "live", "", streamId) },
                )
                4 -> TvDownloadsScreen(onPlay = { url, title ->
                    onPlay(url, title, "", "", "", 0)
                })
                5 -> TvSettingsPage(
                    playerVm  = playerVm,
                    onSignOut = onSignOut,
                )
            }
        }
    }
}

// ── Brand lockup ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailBrandLockup(expanded: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = if (expanded) Arrangement.spacedBy(14.dp) else Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                horizontal = if (expanded) 22.dp else 0.dp,
                vertical   = 0.dp,
            )
            .padding(bottom = 24.dp),
    ) {
        // Le vrai logo, et non le caractère « ✦ » qui en tenait lieu. `ic_logo` est
        // déjà celui des deux écrans de connexion et de la barre du mobile : le rail
        // était le seul endroit à afficher un substitut.
        Image(
            painter            = painterResource(R.drawable.ic_logo),
            contentDescription = null,
            contentScale       = ContentScale.Fit,
            modifier           = Modifier.size(36.dp),
        )
        if (expanded) {
            Row {
                Text(
                    "PURPLE",
                    style = LocalPurpleType.current.brandWordmark.copy(color = PurplePalette.Purple400),
                )
                Text(
                    " IPTV",
                    style = LocalPurpleType.current.brandWordmark.copy(
                        color      = PurplePalette.Fg1,
                        fontWeight = FontWeight.Normal,
                    ),
                )
            }
        }
    }
}

// ── Rail item ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailItem(
    icon:           ImageVector,
    label:          String,
    isActive:       Boolean,
    expanded:       Boolean,
    focusRequester: FocusRequester? = null,
    onClick:        () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val containerColor = when {
        isFocused -> PurplePalette.Purple400
        isActive  -> PurplePalette.Purple400.copy(alpha = 0.18f)
        else      -> Color.Transparent
    }
    val iconTint = when {
        isFocused -> Color.White
        isActive  -> PurplePalette.Purple300
        else      -> PurplePalette.Fg3
    }

    Surface(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = if (expanded) 14.dp else 8.dp, vertical = 3.dp)
            .let { if (focusRequester != null) it.focusRequester(focusRequester) else it },
        shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors = ClickableSurfaceDefaults.colors(
            containerColor        = containerColor,
            focusedContainerColor = PurplePalette.Purple400,
            pressedContainerColor = PurplePalette.Purple600,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
        glow  = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevationColor = PurplePalette.Purple400,
                elevation      = 12.dp,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = if (expanded) 12.dp else 0.dp,
                    vertical   = 10.dp,
                ),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = if (expanded) Arrangement.spacedBy(18.dp) else Arrangement.Center,
        ) {
            Icon(
                imageVector        = icon,
                contentDescription = label,
                tint               = iconTint,
                modifier           = Modifier.size(22.dp),
            )
            if (expanded) {
                Text(
                    label,
                    style    = LocalPurpleType.current.button.copy(color = iconTint),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

// ── Trial badge ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailTrialBadge(days: Int, expanded: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    // UX-2 : ce badge était un simple affichage. `onPurchase` n'était consommé
    // nulle part dans TvMainScreen, si bien qu'un utilisateur Android TV ne pouvait
    // **jamais** acheter de son plein gré — il devait attendre que la barrière
    // d'expiration l'y contraigne. Le rendre focalisable ouvre le seul chemin de
    // conversion de la plateforme.
    Surface(
        onClick  = onClick,
        modifier = modifier.fillMaxWidth(),
        shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Purple400.copy(alpha = 0.12f),
            focusedContainerColor = PurplePalette.Purple400,
            pressedContainerColor = PurplePalette.Purple600,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
    ) {
    Row(
        modifier = Modifier
            .padding(horizontal = if (expanded) 16.dp else 0.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Rounded.Timer,
            contentDescription = null,
            tint               = PurplePalette.Purple300,
            modifier           = Modifier.size(18.dp),
        )
        if (expanded) {
            val label = if (days > 0)
                stringResource(R.string.trial_banner, days)
            else
                stringResource(R.string.trial_expired)
            Text(
                label,
                style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
            )
        }
    }
    }
}

/** Abonné : statut doré et échéance, sans appel à l'action — il a déjà payé. */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailPremiumBadge(days: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    // Focalisable comme le badge d'essai : un abonné doit pouvoir monter en gamme.
    Surface(
        onClick  = onClick,
        modifier = modifier.fillMaxWidth(),
        shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = Color.Transparent,
            focusedContainerColor = PurplePalette.Purple400,
            pressedContainerColor = PurplePalette.Purple600,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
    ) {
        // Le décompte va SOUS le « PREMIUM » doré, sans le répéter en préfixe.
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            TvPremiumBadge(label = stringResource(R.string.premium_badge))
            Text(
                stringResource(R.string.premium_days, days),
                style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
            )
        }
    }
}

// ── Settings page ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSettingsPage(
    playerVm:  PlayerViewModel,
    onSignOut: () -> Unit,
) {
    val context     = LocalContext.current
    val activity    = context as? ComponentActivity
    val subSize     by playerVm.subtitleSize.collectAsState(initial = 1.0f)
    val subColor    by playerVm.subtitleColor.collectAsState(initial = "white")
    val subBg       by playerVm.subtitleBackground.collectAsState(initial = false)
    var currentLang by remember { mutableStateOf(LocaleHelper.getLanguage(context)) }
    var showLogoutConfirm by remember { mutableStateOf(false) }

    val firstFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        try { firstFocus.requestFocus() } catch (_: Exception) {}
    }

    // Centred card — everything visible at a glance, no scroll needed
    Box(
        modifier         = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier            = Modifier
                .widthIn(max = 500.dp)
                .clip(PurpleShapes.Lg)
                .background(PurplePalette.Bg0)
                .padding(horizontal = 32.dp, vertical = 28.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // ── Header ────────────────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.settings_title),
                    style = LocalPurpleType.current.h2.copy(color = PurplePalette.Fg1),
                    modifier = Modifier.weight(1f),
                )
                androidx.compose.material3.Text(
                    "Retour",
                    color    = PurplePalette.Fg4,
                    fontSize = 13.sp,
                )
            }

            // ── Language ──────────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.settings_language)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("fr" to "FR", "en" to "EN").forEachIndexed { idx, (code, label) ->
                        TvSettingsButton(
                            label    = label,
                            selected = currentLang == code,
                            onClick  = {
                                currentLang = code
                                playerVm.updateLanguage(code)
                                LocaleHelper.setLocale(context, code)
                                activity?.recreate()
                            },
                            modifier = if (idx == 0) Modifier.focusRequester(firstFocus) else Modifier,
                        )
                    }
                }
            }

            HorizontalDivider(color = PurplePalette.Line1)

            // ── Subtitle size ─────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.subtitle_size_label)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(
                        0.75f to R.string.subtitle_size_small,
                        1.0f  to R.string.subtitle_size_medium,
                        1.5f  to R.string.subtitle_size_large,
                    ).forEach { (size, labelRes) ->
                        TvSettingsButton(
                            label    = stringResource(labelRes),
                            selected = subSize == size,
                            onClick  = { playerVm.updateSubtitleSize(size) },
                        )
                    }
                }
            }

            // ── Subtitle color ────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.subtitle_color_label)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TvColorOption(
                        name     = stringResource(R.string.subtitle_color_white),
                        color    = Color.White,
                        selected = subColor == "white",
                        onClick  = { playerVm.updateSubtitleColor("white") },
                    )
                    TvColorOption(
                        name     = stringResource(R.string.subtitle_color_yellow),
                        color    = Color.Yellow,
                        selected = subColor == "yellow",
                        onClick  = { playerVm.updateSubtitleColor("yellow") },
                    )
                }
            }

            // ── Preview ───────────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.subtitle_preview_label)) {
                Box(
                    modifier         = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .clip(PurpleShapes.Md)
                        .background(Color.Black),
                    contentAlignment = Alignment.Center,
                ) {
                    androidx.compose.material3.Text(
                        stringResource(R.string.subtitle_preview_text),
                        color     = if (subColor == "yellow") Color.Yellow else Color.White,
                        fontSize  = (18f * subSize).sp,
                        textAlign = TextAlign.Center,
                        modifier  = Modifier
                            .then(if (subBg) Modifier.background(Color.Black.copy(0.5f), PurpleShapes.Xs) else Modifier)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    )
                }
            }

            HorizontalDivider(color = PurplePalette.Line1)

            // ── Sign out ──────────────────────────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    stringResource(R.string.settings_logout_title),
                    style = LocalPurpleType.current.h3.copy(color = PurplePalette.Fg1),
                )
                androidx.compose.material3.Text(
                    stringResource(R.string.settings_logout_desc),
                    color      = PurplePalette.Fg3,
                    fontSize   = 13.sp,
                    lineHeight = 18.sp,
                )
                Spacer(Modifier.height(4.dp))
                if (!showLogoutConfirm) {
                    TvSettingsButton(
                        label       = stringResource(R.string.btn_logout),
                        selected    = false,
                        accentColor = PurplePalette.Danger,
                        onClick     = { showLogoutConfirm = true },
                    )
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        TvSettingsButton(
                            label    = stringResource(R.string.btn_cancel),
                            selected = false,
                            onClick  = { showLogoutConfirm = false },
                        )
                        TvSettingsButton(
                            label       = stringResource(R.string.btn_logout),
                            selected    = false,
                            accentColor = PurplePalette.Danger,
                            onClick     = onSignOut,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsSection(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            label,
            style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
        )
        content()
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSettingsButton(
    label:      String,
    selected:   Boolean,
    onClick:    () -> Unit,
    modifier:   Modifier = Modifier,
    accentColor: Color = PurplePalette.Purple400,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) accentColor.copy(0.2f) else PurplePalette.Bg3,
            focusedContainerColor = accentColor.copy(0.25f),
        ),
        scale  = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    if (selected) 2.dp else 1.dp,
                    if (selected) accentColor else PurplePalette.Line1,
                ),
                shape = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, accentColor),
                shape  = PurpleShapes.Md,
            ),
        ),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(elevationColor = accentColor, elevation = 10.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Text(
            label,
            style    = LocalPurpleType.current.button.copy(
                color      = if (selected || isFocused) accentColor else PurplePalette.Fg2,
                fontWeight = if (selected) androidx.compose.ui.text.font.FontWeight.ExtraBold
                             else androidx.compose.ui.text.font.FontWeight.SemiBold,
            ),
            modifier  = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .then(if (modifier == Modifier) Modifier else Modifier.fillMaxWidth()),
            textAlign = TextAlign.Center,
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvColorOption(name: String, color: Color, selected: Boolean, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        shape   = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors  = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) PurplePalette.Purple400.copy(0.2f) else Color.Transparent,
            focusedContainerColor = PurplePalette.Purple400.copy(0.2f),
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    if (selected) 2.dp else 1.dp,
                    if (selected) PurplePalette.Purple400 else PurplePalette.Line1.copy(0.4f),
                ),
                shape = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Md,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(0.5.dp, PurplePalette.Line1, CircleShape)
            )
            Text(
                name,
                style = LocalPurpleType.current.bodySmall.copy(
                    color = if (selected || isFocused) PurplePalette.Fg1 else PurplePalette.Fg3,
                ),
            )
        }
    }
}

@Composable
private fun TvToggleOption(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.material3.Text(
            label,
            color    = PurplePalette.Fg2,
            fontSize = 14.sp,
            modifier = Modifier.weight(1f),
        )
        Switch(
            checked         = checked,
            onCheckedChange = onCheckedChange,
            colors          = SwitchDefaults.colors(
                checkedThumbColor   = PurplePalette.FgOnPrimary,
                checkedTrackColor   = PurplePalette.Purple400,
                uncheckedThumbColor = PurplePalette.Fg3,
                uncheckedTrackColor = PurplePalette.Bg3,
            ),
        )
    }
}
