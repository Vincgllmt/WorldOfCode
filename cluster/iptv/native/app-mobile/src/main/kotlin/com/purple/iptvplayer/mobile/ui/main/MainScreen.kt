package com.purple.iptvplayer.mobile.ui.main

import android.app.Activity
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.automirrored.rounded.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
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
import com.purple.iptvplayer.core.data.AccessState
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import com.purple.iptvplayer.mobile.ui.common.PremiumBadge
import com.purple.iptvplayer.mobile.ui.cast.CastButton
import com.purple.iptvplayer.mobile.ui.cast.CastRemoteSheet
import com.purple.iptvplayer.mobile.ui.common.requireActivityViewModelStoreOwner
import com.purple.iptvplayer.mobile.ui.downloads.DownloadsScreen
import com.purple.iptvplayer.mobile.ui.home.HomeScreen
import com.purple.iptvplayer.mobile.ui.movies.MoviesScreen
import com.purple.iptvplayer.mobile.ui.mylist.MyListScreen
import com.purple.iptvplayer.mobile.ui.series.SeriesScreen
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.mobile.util.LocaleHelper
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject
import androidx.compose.ui.res.pluralStringResource

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
    val castVm:    CastViewModel    = koinViewModel()
    val playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel(
        viewModelStoreOwner = requireActivityViewModelStoreOwner()
    )
    val credRepo:  CredentialsRepository = koinInject()

    val remainingDays by trialVm.remainingDays.collectAsState()
    val isPro         by trialVm.isPro.collectAsState()
    val access        by trialVm.accessState.collectAsState()

    var currentTab       by rememberSaveable { mutableIntStateOf(0) }
    /** Conserve l'état de chaque onglet quand on en change (cf. plus bas). */
    val tabStateHolder = rememberSaveableStateHolder()
    var settingsOpen     by remember { mutableStateOf(false) }
    // Conservé au retour d'une fiche, comme la recherche. Le tiroir des genres a disparu :
    // le filtre se choisit désormais sur l'écran lui-même, en touchant un thème — ou
    // depuis « Ma liste », qui ouvre l'onglet du thème avec son filtre déjà posé. La
    // remise à zéro se fait donc à la barre du bas, et non plus sur `currentTab`, sinon
    // elle effacerait le filtre que « Ma liste » vient de poser.
    var selectedGenre    by rememberSaveable { mutableStateOf<String?>(null) }
    var currentLang      by remember { mutableStateOf(LocaleHelper.getLanguage(context)) }

    Column(modifier = Modifier.fillMaxSize().background(BgApp)) {

        // ── Bandeau d'état (UX-1) ─────────────────────────────────────────────
        // Le bandeau violet pleine largeur est un **appel à l'action** : il n'a lieu
        // d'être que là où il y a quelque chose à convertir, c'est-à-dire pendant
        // l'essai. L'imposer à un abonné revenait à lui annoncer « Essai gratuit :
        // 30 jours restants » avec un bouton « ACTIVER » — sur un client qui paie.
        when (val a = access) {
            // Achat définitif : rien à décompter, rien à vendre. Aucun bandeau.
            is AccessState.Pro -> Unit

            // Abonnement : l'échéance concerne l'utilisateur, mais discrètement,
            // et sans bouton d'achat puisqu'il a déjà payé.
            is AccessState.Subscribed -> Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(BgCard)
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Le décompte va SOUS le « PREMIUM » doré, et sans le répéter en
                // préfixe : le badge dit déjà de quoi il s'agit.
                Column(modifier = Modifier.weight(1f)) {
                    PremiumBadge(
                        label = stringResource(R.string.premium_badge),
                        fontSize = 12.sp,
                        modifier = Modifier.align(Alignment.Start),
                    )
                    Text(
                        text = pluralStringResource(R.plurals.premium_days, a.daysLeft, a.daysLeft),
                        color = TextSub, fontSize = 11.sp,
                        modifier = Modifier.padding(top = 1.dp),
                    )
                }
                // Un abonné doit pouvoir passer à l'annuel ou au définitif. Retirer
                // « ACTIVER » corrigeait le mot mais supprimait le seul chemin vers
                // l'écran d'achat : la montée en gamme devenait impossible.
                TextButton(
                    onClick = onPurchase,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                ) {
                    Text(
                        stringResource(R.string.btn_change_plan),
                        fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Purple,
                    )
                }
            }

            // Essai en cours ou expiré : c'est ici, et seulement ici, que l'appel
            // à l'action est légitime.
            else -> {
                val trialDays = (a as? AccessState.Trial)?.daysLeft ?: 0
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
                        text = if (trialDays > 0)
                            pluralStringResource(R.plurals.trial_banner, trialDays, trialDays)
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
        }

        // ── Main area ─────────────────────────────────────────────────────────
        // Le Box qui enveloppait cette colonne servait à superposer le tiroir des
        // genres ; il n'a plus rien à recouvrir.
        Column(modifier = Modifier.weight(1f)) {
            TopBar(
                onSettings = { settingsOpen = true },
                castSlot   = { CastButton(modifier = Modifier.size(40.dp), tint = Color.White) },
            )

            Box(modifier = Modifier.weight(1f)) {
                // Chaque onglet garde son état quand on le quitte.
                //
                // `when (currentTab)` retire l'onglet précédent de la composition, et
                // `rememberSaveable` seul ne suffit pas : son entrée est jetée avec
                // lui. Sans ce porteur, revenir sur un onglet effaçait la recherche
                // qui y était en cours — mesuré.
                tabStateHolder.SaveableStateProvider(currentTab) {
                when (currentTab) {
                    0 -> HomeScreen(
                        onPlayChannel = { url, title, cover, streamId -> onPlayChannel(url, title, cover, streamId) },
                        selectedGenre = selectedGenre,
                        onSelectGenre = { selectedGenre = it },
                    )
                    1 -> MoviesScreen(
                        onPlayMovie   = onPlayMovie,
                        onMovieDetail = onMovieDetail,
                        selectedGenre = selectedGenre,
                        onSelectGenre = { selectedGenre = it },
                    )
                    2 -> SeriesScreen(
                        onSeriesDetail = onSeriesDetail,
                        selectedGenre  = selectedGenre,
                        onSelectGenre  = { selectedGenre = it },
                    )
                    3 -> MyListScreen(
                        onMovieDetail  = onMovieDetail,
                        onSeriesDetail = onSeriesDetail,
                        onPlayChannel  = onPlayChannel,
                        // Un thème favori renvoie vers son onglet, filtre posé.
                        onOpenTheme    = { tab, genre -> selectedGenre = genre; currentTab = tab },
                    )
                    4 -> DownloadsScreen(onPlay = { url, title -> onPlayChannel(url, title, "", 0) })
                }
                }
            }
        }

        // Changer d'onglet à la main efface le filtre ; y arriver depuis « Ma liste »
        // le conserve.
        BottomNav(currentTab = currentTab, onTabSelect = { currentTab = it; selectedGenre = null })
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
    onSettings: () -> Unit,
    castSlot:   @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .background(BgCard)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Spacer(Modifier.width(12.dp))

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

        castSlot?.invoke()
        IconButton(onClick = onSettings) {
            Icon(Icons.Rounded.Settings, null, tint = TextPrimary)
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
        stringResource(R.string.mylist_title),
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
