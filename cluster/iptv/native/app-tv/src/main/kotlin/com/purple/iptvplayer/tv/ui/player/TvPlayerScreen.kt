package com.purple.iptvplayer.tv.ui.player

import android.view.ViewGroup
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.media3.ui.PlayerView
import com.purple.iptvplayer.core.epg.EpgTimeline
import com.purple.iptvplayer.core.player.VersionMode
import com.purple.iptvplayer.core.model.EpgProgram
import com.purple.iptvplayer.core.player.PlayerStatus
import com.purple.iptvplayer.core.player.TrackInfo
import com.purple.iptvplayer.core.player.TrackPolicy
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.PlayerViewModel
import com.purple.iptvplayer.tv.ui.common.KeepScreenOn
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.common.tvModalTrap
import com.purple.iptvplayer.tv.ui.navigation.PlayerControl
import com.purple.iptvplayer.tv.ui.navigation.TvOverlayFocus
import com.purple.iptvplayer.tv.ui.navigation.TvPlayerKeys
import com.purple.iptvplayer.tv.ui.theme.*
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel

@Composable
fun TvPlayerScreen(
    url:      String,
    title:    String,
    mediaId:  String,
    type:     String = "",
    cover:    String = "",
    streamId: Int = 0,
    onBack:   () -> Unit,
) {
    val vm:        PlayerViewModel  = koinViewModel()
    val contentVm: ContentViewModel = koinViewModel()
    val state       by vm.playerState.collectAsState()
    val epgPrograms by contentVm.epgPrograms.collectAsState()
    val availableVersions by vm.playerService.availableVersions.collectAsState()
    val selectedVersion   by vm.playerService.selectedVersion.collectAsState()

    val subSize by vm.subtitleSize.collectAsState(initial = 1.0f)
    val subColor by vm.subtitleColor.collectAsState(initial = "white")
    val subBg by vm.subtitleBackground.collectAsState(initial = false)

    var overlayVisible by remember { mutableStateOf(true) }
    var lastInteractionMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var showSpeedDialog by remember { mutableStateOf(false) }
    var showTrackDialog by remember { mutableStateOf(false) }
    val isLive = state.durationMs <= 0L

    val rootFocus = remember { FocusRequester() }
    /**
     * La racine a-t-elle **elle-même** le focus ?
     *
     * ⚠️ C'est la moitié manquante du correctif « impossible de naviguer sur le lecteur ».
     * Le `Box` racine occupe tout l'écran ; quand c'est **lui** qui porte le focus, la
     * recherche directionnelle de Compose ne trouve plus aucun candidat, dans aucune
     * direction : elle exige qu'un candidat dépasse le rectangle focalisé du côté visé, et
     * rien ne dépasse le plein écran. Les touches partaient donc dans le vide.
     *
     * Deux causes s'y ajoutaient. Un `LaunchedEffect` de fin de composable reprenait le
     * focus à la racine 100 ms après l'entrée, soit 20 ms après que l'overlay l'ait donné
     * au bouton central — il est supprimé. Et **chaque appui réarme le minuteur** de
     * masquage (§29) : l'overlay ne se cachait donc jamais tant que l'utilisateur appuyait,
     * et le seul chemin qui rendait le focus à un contrôle — masquer puis réafficher — ne
     * s'ouvrait plus jamais. L'écran restait figé aussi longtemps qu'on insistait.
     */
    var rootFocused by remember { mutableStateOf(false) }

    // G13 — un requester par contrôle, et le dernier focalisé.
    val controlFocus = remember { PlayerControl.entries.associateWith { FocusRequester() } }
    var lastControl  by remember { mutableStateOf(PlayerControl.PlayPause) }
    var overlayEverShown by remember { mutableStateOf(false) }

    // `lastInteractionMs` fait partie de la clé : sans elle, le minuteur n'était jamais
    // réarmé et l'overlay se masquait 5 s après son apparition, **même en pleine
    // navigation**. À la télécommande, le focus retombait alors à la racine au milieu
    // d'un déplacement. `lastInteractionMs` était écrit et lu par personne.
    LaunchedEffect(overlayVisible, showSpeedDialog, showTrackDialog, lastInteractionMs) {
        if (overlayVisible && !showSpeedDialog && !showTrackDialog) {
            delay(5_000)
            overlayVisible = false
        }
    }

    // G13 — défaut sensé à la PREMIÈRE apparition seulement ; ensuite on rend à
    // l'utilisateur le contrôle qu'il avait quitté.
    //
    // L'effet d'origine réclamait le bouton central à chaque bascule de `overlayVisible`,
    // donc à chaque réapparition : c'est la variante « au réaffichage » du piège §8.8 —
    // l'état qui sert de clé est aussi celui que l'effet écrase.
    LaunchedEffect(overlayVisible) {
        if (!overlayVisible) {
            runCatching { rootFocus.requestFocus() }
            return@LaunchedEffect
        }
        delay(80)
        if (showSpeedDialog || showTrackDialog) return@LaunchedEffect
        val target = TvOverlayFocus.targetFor(overlayEverShown, lastControl)
        overlayEverShown = true
        runCatching { controlFocus.getValue(target).requestFocus() }
    }

    LaunchedEffect(url) {
        if (url.isNotEmpty()) {
            val savedPos = if (mediaId.isNotEmpty()) vm.getSavedProgress(mediaId) else 0L
            vm.playMedia(url, title, mediaId.ifEmpty { null }, savedPos, cover.ifEmpty { null }, type.ifEmpty { null })
        }
    }

    LaunchedEffect(streamId) {
        if (streamId > 0) contentVm.loadEpg(streamId)
    }

    KeepScreenOn()

    DisposableEffect(Unit) { onDispose { vm.stop(); contentVm.clearEpg() } }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(rootFocus)
            .onFocusChanged { rootFocused = it.isFocused }
            .focusable()
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                // Filet de sécurité : si la racine porte encore le focus alors que
                // l'overlay est affiché, aucune direction ne peut aboutir (cf.
                // `rootFocused`). On rend la main aux contrôles au lieu de laisser la
                // touche se perdre — un contrôle disparu de la composition, comme
                // « Épisode suivant » en fin de saison, suffit à retomber dans ce cas.
                if (TvPlayerKeys.reentersOverlay(event.key, overlayVisible, rootFocused)) {
                    runCatching { controlFocus.getValue(lastControl).requestFocus() }
                    lastInteractionMs = System.currentTimeMillis()
                    return@onKeyEvent true
                }
                // Tout appui compte comme une interaction, y compris quand l'overlay est
                // déjà visible : les événements non consommés par l'élément focalisé
                // remontent jusqu'ici avant que le focus ne se déplace. RETOUR en est
                // exclu — il quitte l'écran, il n'y prolonge rien.
                if (TvPlayerKeys.countsAsInteraction(event.key)) {
                    lastInteractionMs = System.currentTimeMillis()
                }
                // On ne consomme que le premier appui, celui qui rouvre l'overlay ; les
                // suivants doivent continuer à déplacer le focus.
                //
                // B4 — et **jamais** RETOUR : consommer un événement fait renvoyer `true`
                // à `ComposeView.dispatchKeyEvent`, donc l'Activity ne le voit pas et
                // l'`OnBackPressedDispatcher` n'est pas notifié. C'est ce qui faisait que
                // deux appuis étaient avalés par l'overlay et que le troisième éjectait
                // vers le lanceur TV, en pleine lecture.
                val consumed = TvPlayerKeys.consumesToRevealOverlay(event.key, overlayVisible)
                if (consumed) overlayVisible = true
                consumed
            }
    ) {
        // Video surface
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = vm.playerService.player
                    useController = false
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                }
            },
            update = { view ->
                val captionStyle = androidx.media3.ui.CaptionStyleCompat(
                    if (subColor == "yellow") android.graphics.Color.YELLOW else android.graphics.Color.WHITE,
                    if (subBg) android.graphics.Color.parseColor("#80000000") else android.graphics.Color.TRANSPARENT,
                    android.graphics.Color.TRANSPARENT,
                    androidx.media3.ui.CaptionStyleCompat.EDGE_TYPE_NONE,
                    android.graphics.Color.WHITE,
                    null
                )
                view.subtitleView?.apply {
                    setApplyEmbeddedStyles(false)
                    setApplyEmbeddedFontSizes(false)
                    setFixedTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 32f * subSize)
                    setStyle(captionStyle)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        if (state.status == PlayerStatus.BUFFERING) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = TvPurpleGlow
            )
        }

        // G1 — un échec de lecture ne produisait AUCUN message : le spinner disparaissait
        // et rien ne le remplaçait. Écran noir et muet, sans la moindre prise à la
        // télécommande. Le socle expose pourtant `PlayerStatus.ERROR` et `state.error`, et
        // le mobile les rend depuis toujours (PlayerScreen.kt:208) — douzième occurrence du
        // motif §8.2, le correctif n'ayant été écrit que d'un côté.
        if (state.status == PlayerStatus.ERROR) {
            val retryFocus = remember { FocusRequester() }
            LaunchedEffect(Unit) {
                // L'overlay porte la flèche de retour : on ne laisse pas l'utilisateur
                // devant un écran noir sans repère.
                overlayVisible = true
                withFrameNanos { }
                runCatching { retryFocus.requestFocus() }
            }
            Column(
                modifier            = Modifier.align(Alignment.Center).tvModalTrap(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Rounded.ErrorOutline, null, tint = TvColorError,
                     modifier = Modifier.size(56.dp))
                Spacer(Modifier.height(12.dp))
                Text(
                    state.error ?: stringResource(R.string.player_error),
                    color = TvColorError, fontSize = 16.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Spacer(Modifier.height(20.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TvTextButton(
                        label    = stringResource(R.string.action_retry),
                        // `vm.retry()` et non `playMedia` : il efface d'abord les
                        // overrides de pistes. Sans cela, relancer après un échec dû à
                        // une piste illisible rejouait le flux avec cette même piste, et
                        // échouait à l'identique — le bouton ne pouvait pas aboutir.
                        onClick  = { vm.retry() },
                        modifier = Modifier.focusRequester(retryFocus),
                    )
                    TvTextButton(label = stringResource(R.string.action_back), onClick = onBack)
                }
            }
        }

        if (overlayVisible) {
            TvPlayerOverlay(
                title          = state.title,
                isPlaying      = state.status == PlayerStatus.PLAYING,
                isLive         = isLive,
                positionMs     = state.positionMs,
                durationMs     = state.durationMs,
                playbackSpeed  = state.playbackSpeed,
                hasNext        = vm.hasNextEpisode(),
                nextTitle      = vm.getNextMediaTitle(),
                epgPrograms    = epgPrograms,
                versions       = availableVersions,
                selectedVersion = selectedVersion,
                onSelectVersion = { vm.playerService.selectVersion(it) },
                controlFocus     = controlFocus,
                onControlFocused = { lastControl = it },
                onBack         = onBack,
                onPlayPause    = { if (state.status == PlayerStatus.PLAYING) vm.pause() else vm.resume() },
                onSeekForward  = { vm.seekTo((state.positionMs + 10_000L).coerceAtMost(state.durationMs)) },
                onSeekBackward = { vm.seekTo((state.positionMs - 10_000L).coerceAtLeast(0L)) },
                onSeekTo       = { vm.seekTo(it) },
                onRestart      = { vm.restart() },
                onNext         = { vm.nextEpisode() },
                onOpenSpeed    = { showSpeedDialog = true },
                onOpenTracks   = { showTrackDialog = true },
            )
        }
    }

    if (showSpeedDialog) {
        TvSpeedDialog(
            currentSpeed  = state.playbackSpeed,
            onSpeedSelect = { vm.setSpeed(it); showSpeedDialog = false },
            onDismiss     = { showSpeedDialog = false },
        )
    }

    if (showTrackDialog) {
        TvTrackDialog(
            viewModel = vm,
            onDismiss = { showTrackDialog = false },
        )
    }

}

/** Déclare l'identité d'un contrôle et mémorise son focus. */
@Composable
private fun Modifier.playerControl(
    id: PlayerControl,
    requesters: Map<PlayerControl, FocusRequester>,
    onFocused: (PlayerControl) -> Unit,
): Modifier = this
    .focusRequester(requesters.getValue(id))
    .onFocusChanged { if (it.isFocused) onFocused(id) }

@Composable
private fun TvPlayerOverlay(
    title:         String,
    isPlaying:     Boolean,
    isLive:        Boolean,
    positionMs:    Long,
    durationMs:    Long,
    playbackSpeed: Float,
    hasNext:       Boolean = false,
    nextTitle:     String? = null,
    epgPrograms:   List<EpgProgram> = emptyList(),
    versions:        Set<VersionMode> = emptySet(),
    selectedVersion: VersionMode? = null,
    onSelectVersion: (VersionMode) -> Unit = {},
    controlFocus:     Map<PlayerControl, FocusRequester>,
    onControlFocused: (PlayerControl) -> Unit,
    onBack:        () -> Unit,
    onPlayPause:   () -> Unit,
    onSeekForward:  () -> Unit,
    onSeekBackward: () -> Unit,
    onSeekTo:       (Long) -> Unit,
    onRestart:     () -> Unit,
    onNext:        () -> Unit = {},
    onOpenSpeed:   () -> Unit,
    onOpenTracks:  () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {

        // Top gradient bar — intercepts Down to jump to play button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .onPreviewKeyEvent { event ->
                    if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionDown) {
                        runCatching { controlFocus.getValue(PlayerControl.PlayPause).requestFocus() }
                        true
                    } else false
                }
                .background(Brush.verticalGradient(listOf(Color.Black.copy(0.85f), Color.Transparent)))
                .padding(horizontal = 32.dp, vertical = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TvControlButton(icon = Icons.Rounded.ArrowBack, onClick = onBack, size = 28,
                    modifier = Modifier.playerControl(PlayerControl.Back, controlFocus, onControlFocused))
                Spacer(Modifier.width(16.dp))
                if (isLive) {
                    Text("LIVE", color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(end = 8.dp))
                }
                Text(title, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f))
                Spacer(Modifier.width(12.dp))
                TvControlButton(icon = Icons.Rounded.Tune, onClick = onOpenTracks, size = 24,
                    modifier = Modifier.playerControl(PlayerControl.Tracks, controlFocus, onControlFocused))
                Spacer(Modifier.width(8.dp))
                TvTextButton(
                    label    = if (playbackSpeed == 1f) "1×" else "${playbackSpeed}×",
                    onClick  = onOpenSpeed,
                    modifier = Modifier.playerControl(PlayerControl.Speed, controlFocus, onControlFocused),
                )
            }
        }

        // Center controls — le bouton central porte son identite PlayerControl (G13)
        Row(
            modifier              = Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(32.dp),
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            if (!isLive) {
                TvControlButton(Icons.Rounded.Replay10, onClick = onSeekBackward, size = 40,
                    modifier = Modifier.playerControl(PlayerControl.Rewind, controlFocus, onControlFocused))
            }
            TvControlButton(
                icon     = if (isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                onClick  = onPlayPause,
                size     = 56,
                modifier = Modifier.playerControl(PlayerControl.PlayPause, controlFocus, onControlFocused),
            )
            if (!isLive) {
                TvControlButton(Icons.Rounded.Forward10, onClick = onSeekForward, size = 40,
                    modifier = Modifier.playerControl(PlayerControl.Forward, controlFocus, onControlFocused))
            }
        }

        // Next Episode Suggestion — with auto-play countdown
        val showNextSuggestion = hasNext && durationMs > 0 && (durationMs - positionMs <= 40_000L)
        var autoPlayCountdown by remember { mutableIntStateOf(10) }
        var nextDismissed     by remember { mutableStateOf(false) }

        LaunchedEffect(showNextSuggestion) {
            if (showNextSuggestion) {
                nextDismissed = false
                autoPlayCountdown = 10
                while (autoPlayCountdown > 0 && !nextDismissed) {
                    delay(1_000)
                    if (!nextDismissed) autoPlayCountdown--
                }
                if (!nextDismissed) onNext()
            }
        }

        // Bouton VF / VOSTFR, en bas à droite. Demandé par `raf.md` pour les films et
        // les séries : une chaîne live ne porte qu'une piste, il n'y aurait rien à
        // basculer. Cède la place à la carte « épisode suivant », même coin.
        if (!isLive && !(showNextSuggestion && !nextDismissed)) {
            TvVersionToggle(
                available = versions,
                selected  = selectedVersion,
                onSelect  = onSelectVersion,
                modifier  = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 100.dp, end = 48.dp),
            )
        }

        androidx.compose.animation.AnimatedVisibility(
            visible = showNextSuggestion && !nextDismissed,
            enter = androidx.compose.animation.fadeIn() + androidx.compose.animation.slideInHorizontally { it },
            exit = androidx.compose.animation.fadeOut() + androidx.compose.animation.slideOutHorizontally { it },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(bottom = 100.dp, end = 48.dp)
        ) {
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Surface(
                    onClick = { onNext() },
                    color   = TvPurple.copy(alpha = 0.9f),
                    shape   = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Lecture automatique dans ${autoPlayCountdown}s", color = Color.White.copy(0.7f), fontSize = 12.sp)
                            Text(nextTitle ?: "Chargement...", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                        }
                        Spacer(Modifier.width(20.dp))
                        Icon(Icons.Rounded.SkipNext, null, tint = Color.White, modifier = Modifier.size(32.dp))
                    }
                }
                Surface(
                    onClick = { nextDismissed = true },
                    color   = Color.Black.copy(alpha = 0.6f),
                    shape   = RoundedCornerShape(8.dp),
                ) {
                    Icon(
                        Icons.Rounded.Close, null,
                        tint     = Color.White.copy(0.8f),
                        modifier = Modifier.padding(10.dp).size(20.dp),
                    )
                }
            }
        }

        // Bottom gradient bar
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(0.85f))))
                .padding(horizontal = 32.dp, vertical = 20.dp),
        ) {
            Column {
                // EPG for live channels
                if (isLive && epgPrograms.isNotEmpty()) {
                    TvEpgCard(epgPrograms)
                    Spacer(Modifier.height(12.dp))
                }

                if (durationMs > 0L) {
                    TvSeekBar(
                        positionMs = positionMs,
                        durationMs = durationMs,
                        onSeek     = onSeekTo,
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TvControlButton(Icons.Rounded.Replay, onClick = onRestart, size = 28,
                            modifier = Modifier.playerControl(PlayerControl.Restart, controlFocus, onControlFocused))
                        if (hasNext) {
                            Spacer(Modifier.width(16.dp))
                            TvControlButton(Icons.Rounded.SkipNext, onClick = onNext, size = 32,
                                modifier = Modifier.playerControl(PlayerControl.Next, controlFocus, onControlFocused))
                        }
                        Spacer(Modifier.width(20.dp))
                        Text(positionMs.toTimeString(), color = Color.White.copy(0.7f), fontSize = 14.sp)
                        Spacer(Modifier.weight(1f))
                        Text(durationMs.toTimeString(), color = Color.White.copy(0.7f), fontSize = 14.sp)
                    }
                }
            }
        }
    }
}

// ── Seek bar ──────────────────────────────────────────────────────────────────

@Composable
private fun TvSeekBar(
    positionMs: Long,
    durationMs: Long,
    onSeek:     (Long) -> Unit,
    modifier:   Modifier = Modifier,
) {
    var isFocused by remember { mutableStateOf(false) }
    var displayMs by remember(positionMs) { mutableLongStateOf(positionMs) }
    LaunchedEffect(positionMs) { if (!isFocused) displayMs = positionMs }

    val progress = (displayMs.toFloat() / durationMs).coerceIn(0f, 1f)

    Column(modifier = modifier.fillMaxWidth()) {
        // Time tooltip above thumb — visible only when focused
        if (isFocused) {
            Box(modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
                Text(
                    displayMs.toTimeString(),
                    color      = Color.White,
                    fontSize   = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier   = Modifier
                        .fillMaxWidth(progress.coerceAtLeast(0.04f))
                        .wrapContentWidth(Alignment.End, unbounded = false)
                        .background(TvPurple.copy(alpha = 0.88f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
        }

        Surface(
            onClick  = {},
            modifier = Modifier
                .fillMaxWidth()
                .height(28.dp)
                .onFocusChanged { isFocused = it.isFocused }
                .onKeyEvent { event ->
                    if (event.type == KeyEventType.KeyDown) when (event.key) {
                        Key.DirectionLeft  -> {
                            val p = (displayMs - 30_000L).coerceAtLeast(0L)
                            displayMs = p; onSeek(p); true
                        }
                        Key.DirectionRight -> {
                            val p = (displayMs + 30_000L).coerceAtMost(durationMs)
                            displayMs = p; onSeek(p); true
                        }
                        else -> false
                    } else false
                },
            color  = Color.Transparent,
            border = if (isFocused) BorderStroke(1.dp, TvPurpleGlow.copy(0.5f)) else null,
            shape  = RoundedCornerShape(8.dp),
        ) {
            Canvas(modifier = Modifier.fillMaxSize().padding(horizontal = 4.dp)) {
                val cy     = size.height / 2f
                val trackH = if (isFocused) 6.dp.toPx() else 4.dp.toPx()
                val thumbR = if (isFocused) 7.dp.toPx() else 0f
                val px     = size.width * progress

                drawRoundRect(
                    color        = Color.White.copy(0.22f),
                    topLeft      = Offset(0f, cy - trackH / 2),
                    size         = Size(size.width, trackH),
                    cornerRadius = CornerRadius(trackH / 2),
                )
                if (px > 0f) {
                    drawRoundRect(
                        color        = TvPurpleGlow,
                        topLeft      = Offset(0f, cy - trackH / 2),
                        size         = Size(px, trackH),
                        cornerRadius = CornerRadius(trackH / 2),
                    )
                }
                if (isFocused) {
                    val tx = px.coerceIn(thumbR, size.width - thumbR)
                    drawCircle(Color.White, thumbR, Offset(tx, cy))
                    drawCircle(TvPurple,    thumbR * 0.45f, Offset(tx, cy))
                }
            }
        }
    }
}

@Composable
private fun TvEpgCard(programs: List<EpgProgram>, modifier: Modifier = Modifier) {
    // L'instant courant doit être un état qui progresse. Lu une seule fois pendant la
    // composition — ce que faisait la TV — la barre d'avancement reste figée et la
    // carte continue d'annoncer un programme terminé pendant toute la session (P10).
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            now = System.currentTimeMillis()
        }
    }

    val snap = EpgTimeline.snapshot(programs, now) ?: return
    val current = snap.current
    val timeLabel = "${EpgTimeline.formatTime(current, end = false)} – ${EpgTimeline.formatTime(current, end = true)}"

    Surface(
        modifier        = modifier.widthIn(max = 380.dp),
        shape           = RoundedCornerShape(16.dp),
        color           = Color.Black.copy(alpha = 0.72f),
        border          = BorderStroke(1.dp, TvPurpleGlow.copy(alpha = 0.35f)),
        shadowElevation = 12.dp,
    ) {
        Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            Row(
                verticalAlignment     = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(TvPurple.copy(alpha = 0.85f))
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                ) {
                    Text(
                        stringResource(R.string.player_live),
                        color = Color.White, fontSize =  12.sp,
                        fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp,
                    )
                }
                Text(timeLabel, color = Color.White.copy(0.5f), fontSize =  14.sp)
            }

            Spacer(Modifier.height(8.dp))

            Text(
                current.title,
                color      = Color.White,
                fontSize   = 17.sp,
                fontWeight = FontWeight.Bold,
                maxLines   = 2,
                overflow   = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(8.dp))

            LinearProgressIndicator(
                progress   = { snap.progress },
                modifier   = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color      = TvPurpleGlow,
                trackColor = Color.White.copy(0.15f),
            )

            snap.next?.let { next ->
                Spacer(Modifier.height(8.dp))
                Row(
                    verticalAlignment     = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    Icon(
                        Icons.Rounded.SkipNext, null,
                        tint = Color.White.copy(0.4f), modifier = Modifier.size(14.dp),
                    )
                    Text(
                        next.title,
                        color    = Color.White.copy(0.45f),
                        fontSize =  14.sp,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

/**
 * Bascule VF / VOSTFR au D-pad.
 *
 * N'apparaît que si les **deux** versions existent réellement dans le média : avec une
 * seule il n'y a rien à choisir, et un élément focalisable de plus coûte un appui à la
 * télécommande sans rien apporter (leçon de §25).
 */
@Composable
private fun TvVersionToggle(
    available: Set<VersionMode>,
    selected:  VersionMode?,
    onSelect:  (VersionMode) -> Unit,
    modifier:  Modifier = Modifier,
) {
    if (available.size < 2) return
    Row(
        modifier              = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        VersionMode.values().filter { it in available }.forEach { mode ->
            var isFocused by remember { mutableStateOf(false) }
            val isOn = mode == selected
            Surface(
                onClick  = { onSelect(mode) },
                modifier = Modifier.onFocusChanged { isFocused = it.isFocused },
                shape    = RoundedCornerShape(20.dp),
                color    = when {
                    isOn -> TvPurple.copy(alpha = 0.9f)
                    else -> Color.Black.copy(alpha = 0.6f)
                },
                border   = if (isFocused) BorderStroke(2.dp, Color.White) else null,
            ) {
                Text(
                    mode.name,
                    color         = if (isOn || isFocused) Color.White else Color.White.copy(0.6f),
                    fontSize      = 15.sp,
                    fontWeight    = if (isOn) FontWeight.Bold else FontWeight.Medium,
                    letterSpacing = 0.5.sp,
                    modifier      = Modifier.padding(horizontal = 18.dp, vertical = 9.dp),
                )
            }
        }
    }
}

@Composable
private fun TvControlButton(
    icon:     androidx.compose.ui.graphics.vector.ImageVector,
    onClick:  () -> Unit,
    size:     Int,
    modifier: Modifier = Modifier,
) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = modifier
            .size(size.dp * 1.5f)
            .onFocusChanged { isFocused = it.isFocused },
        shape = CircleShape,
        color = if (isFocused) Color.White.copy(alpha = 0.2f) else Color.Transparent,
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(size.dp))
        }
    }
}

@Composable
private fun TvTextButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = modifier.onFocusChanged { isFocused = it.isFocused },
        shape = RoundedCornerShape(8.dp),
        color = if (isFocused) Color.White.copy(alpha = 0.2f) else Color.Transparent,
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null,
    ) {
        Text(label, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
    }
}

/**
 * Sélecteur de pistes.
 *
 * **Le défaut corrigé (« le changement de piste provoque une erreur »).** Ce dialogue
 * lisait `player.currentTracks` et posait lui-même l'override — comme le faisaient déjà,
 * chacun de son côté, la feuille du mobile et `PlayerService.selectVersion`. Aucune des
 * trois copies ne consultait `Tracks.Group.isTrackSupported` : une piste que l'appareil ne
 * sait pas décoder (E-AC3, DTS…) y figurait comme les autres, et la choisir faisait échouer
 * l'initialisation du décodeur, donc `onPlayerError`, donc l'écran d'erreur du §45. Il n'y
 * avait aucune sortie : « Réessayer » rejouait le flux avec le même override.
 *
 * La sélection remonte donc dans `core` ([PlayerViewModel.selectAudioTrack]), avec le
 * garde-fou de [TrackPolicy] ; ce dialogue ne fait plus qu'afficher et appeler.
 *
 * Deux défauts de lisibilité corrigés au passage, tous deux propres à ce dialogue jamais
 * exercé (`AUDIT_TV_UX.md`, note de fin) :
 * - le libellé était `langue ?: titre`, dans cet ordre : deux pistes françaises
 *   s'affichaient toutes deux « français », impossible de savoir ce qu'on sélectionnait ;
 * - `TvTrackRow` posait `onFocusChanged` **après** son `clickable`, donc après la cible de
 *   focus : la callback n'était jamais appelée et **aucune ligne ne s'éclairait**. On
 *   naviguait à l'aveugle dans la liste.
 */
@Composable
private fun TvTrackDialog(viewModel: PlayerViewModel, onDismiss: () -> Unit) {
    val audioTracks by viewModel.audioTracks.collectAsState()
    val textTracks  by viewModel.textTracks.collectAsState()
    val anySubtitlePlaying = textTracks.any { it.isSelected }

    val subSize by viewModel.subtitleSize.collectAsState(initial = 1.0f)
    val subColor by viewModel.subtitleColor.collectAsState(initial = "white")
    val subBg by viewModel.subtitleBackground.collectAsState(initial = false)

    var currentTab by remember { mutableIntStateOf(0) } // 0: Tracks, 1: Subtitle Settings

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth(0.7f).fillMaxHeight(0.8f),
            color = TvBgCard,
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    TvTabButton(label = stringResource(R.string.player_tracks), selected = currentTab == 0) { currentTab = 0 }
                    TvTabButton(label = stringResource(R.string.player_sub_style), selected = currentTab == 1) { currentTab = 1 }
                }
                
                Spacer(Modifier.height(24.dp))

                if (currentTab == 0 && audioTracks.isEmpty() && textTracks.isEmpty()) {
                    // M9 — le dialogue s'ouvrait vide : deux onglets, un bouton « Fermer »,
                    // et rien entre les deux. Rien ne distinguait « il n'y a pas d'autre
                    // piste » de « ça n'a pas chargé ». La chaîne existait déjà côté mobile.
                    Box(
                        modifier         = Modifier.weight(1f).fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            stringResource(R.string.player_no_tracks),
                            color = TvTextSub, fontSize = 14.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    }
                } else if (currentTab == 0) {
                    val unsupported = stringResource(R.string.player_track_unsupported)
                    val forced      = stringResource(R.string.player_track_forced)
                    Box(modifier = Modifier.weight(1f)) {
                        androidx.compose.foundation.lazy.LazyColumn {
                            if (audioTracks.isNotEmpty()) {
                                item { Text(stringResource(R.string.player_audio), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                                items(audioTracks.size) { idx ->
                                    val track = audioTracks[idx]
                                    TvTrackRow(
                                        name     = trackLabel(track, stringResource(R.string.player_track_n, idx + 1), forced),
                                        selected = track.isSelected,
                                        // Une piste illisible reste affichée — la masquer
                                        // ferait croire à un média mono-piste (§8.6) —
                                        // mais n'est plus choisissable.
                                        enabled  = TrackPolicy.isSelectable(track),
                                        note     = unsupported.takeIf { !TrackPolicy.isSelectable(track) },
                                    ) {
                                        viewModel.selectAudioTrack(track.id)
                                        onDismiss()
                                    }
                                }
                                item { Spacer(Modifier.height(16.dp)) }
                            }
                            if (textTracks.isNotEmpty()) {
                                item { Text(stringResource(R.string.player_subs), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                                item {
                                    TvTrackRow(name = stringResource(R.string.player_off), selected = !anySubtitlePlaying) {
                                        viewModel.selectTextTrack(null)
                                        onDismiss()
                                    }
                                }
                                items(textTracks.size) { idx ->
                                    val track = textTracks[idx]
                                    TvTrackRow(
                                        name     = trackLabel(track, stringResource(R.string.player_subtitle_n, idx + 1), forced),
                                        selected = anySubtitlePlaying && track.isSelected,
                                        enabled  = TrackPolicy.isSelectable(track),
                                        note     = unsupported.takeIf { !TrackPolicy.isSelectable(track) },
                                    ) {
                                        viewModel.selectTextTrack(track.id)
                                        onDismiss()
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Subtitle style settings
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(stringResource(R.string.player_size), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // M1 — ces trois libellés étaient codés en dur en français dans
                            // une interface anglaise. La campagne du §17 les avait manqués
                            // parce qu'ils ne portent aucun accent. Les clés existaient
                            // déjà, elles servent au panneau Paramètres.
                            listOf(
                                R.string.subtitle_size_small  to 0.75f,
                                R.string.subtitle_size_medium to 1.0f,
                                R.string.subtitle_size_large  to 1.5f,
                            ).forEach { (labelRes, value) ->
                                TvTabButton(label = stringResource(labelRes), selected = subSize == value) {
                                    viewModel.updateSubtitleSize(value)
                                }
                            }
                        }
                        Text(stringResource(R.string.player_color), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            TvColorOption(name = stringResource(R.string.subtitle_color_white),  color = Color.White,  selected = subColor == "white")  { viewModel.updateSubtitleColor("white") }
                            TvColorOption(name = stringResource(R.string.subtitle_color_yellow), color = Color.Yellow, selected = subColor == "yellow") { viewModel.updateSubtitleColor("yellow") }
                        }
                        TvToggleOption(label = stringResource(R.string.player_sub_bg), checked = subBg) { viewModel.updateSubtitleBackground(it) }
                        Text(stringResource(R.string.player_preview), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(60.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Black),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = stringResource(R.string.player_preview_text),
                                color = if (subColor == "yellow") Color.Yellow else Color.White,
                                fontSize = (16f * subSize).sp,
                                fontWeight = FontWeight.Bold,
                                modifier = if (subBg) Modifier
                                    .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                                else Modifier,
                            )
                        }
                    }
                }
                
                Spacer(Modifier.height(16.dp))
                TvTextButton(label = stringResource(R.string.action_close), onClick = onDismiss)
            }
        }
    }
}

@Composable
private fun TvTabButton(label: String, selected: Boolean, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = Modifier.onFocusChanged { isFocused = it.isFocused },
        shape = RoundedCornerShape(8.dp),
        color = if (selected) TvPurple.copy(alpha = 0.3f) else if (isFocused) Color.White.copy(alpha = 0.1f) else Color.Transparent,
        border = if (isFocused) BorderStroke(2.dp, Color.White) else if (selected) BorderStroke(1.dp, TvPurple) else null
    ) {
        Text(label, color = if (selected) TvPurpleGlow else Color.White, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp), fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal)
    }
}

/**
 * @param enabled `false` rend la ligne non focalisable : le D-pad la saute, elle reste
 *   lisible mais ne peut pas être choisie.
 * @param note mention affichée sous le nom — la raison pour laquelle la ligne est inerte.
 */
@Composable
private fun TvTrackRow(
    name: String,
    selected: Boolean,
    enabled: Boolean = true,
    note: String? = null,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (isFocused) Color.White.copy(alpha = 0.16f) else Color.Transparent)
            // ⚠️ **L'ORDRE COMPTE**, comme pour `focusProperties`/`focusGroup` (§44). Un
            // `FocusEventModifierNode` n'observe que les cibles de focus placées APRÈS
            // lui. `.clickable().onFocusChanged{}` — l'ordre d'origine — ne notifiait
            // donc jamais rien : aucune ligne ne s'éclairait, on choisissait à l'aveugle.
            .onFocusChanged { isFocused = it.isFocused }
            .clickable(enabled = enabled, onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = null, enabled = enabled,
            colors = RadioButtonDefaults.colors(selectedColor = TvPurpleGlow))
        Spacer(Modifier.width(12.dp))
        Column {
            Text(
                name,
                color = when {
                    !enabled -> TvTextSub
                    selected -> TvPurpleGlow
                    else     -> Color.White
                },
                fontSize = 14.sp,
            )
            if (note != null) {
                Text(note, color = TvTextSub, fontSize = 11.sp)
            }
        }
    }
}

/**
 * Nom affiché d'une piste : la décision est dans `core` ([TrackPolicy.label]), seule la
 * résolution du code de langue en nom lisible reste ici — elle dépend de la locale de
 * l'appareil.
 */
@Composable
private fun trackLabel(track: TrackInfo, fallback: String, forcedSuffix: String): String =
    TrackPolicy.label(
        track        = track,
        languageName = track.language
            ?.let { runCatching { java.util.Locale(it).displayLanguage }.getOrNull() }
            ?.takeIf { it.isNotBlank() },
        fallback        = fallback,
        forcedSuffix    = forcedSuffix,
        languageAliases = TrackPolicy.languageAliases(track.language),
    )

@Composable
private fun TvColorOption(name: String, color: Color, selected: Boolean, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = Modifier.onFocusChanged { isFocused = it.isFocused },
        shape = RoundedCornerShape(8.dp),
        color = if (selected) TvPurple.copy(alpha = 0.2f) else if (isFocused) Color.White.copy(alpha = 0.1f) else Color.Transparent,
        border = if (isFocused) BorderStroke(2.dp, Color.White) else if (selected) BorderStroke(1.dp, TvPurpleGlow) else null
    ) {
        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(16.dp).clip(CircleShape).background(color).border(0.5.dp, Color.Gray, CircleShape))
            Text(name, color = if (selected) Color.White else TvTextSub)
        }
    }
}

@Composable
private fun TvToggleOption(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (isFocused) Color.White.copy(alpha = 0.1f) else Color.Transparent)
            .clickable { onCheckedChange(!checked) }
            .onFocusChanged { isFocused = it.isFocused }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = Color.White, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange, colors = SwitchDefaults.colors(checkedThumbColor = TvPurpleGlow, checkedTrackColor = TvPurple))
    }
}

@Composable
private fun TvSpeedDialog(currentSpeed: Float, onSpeedSelect: (Float) -> Unit, onDismiss: () -> Unit) {
    val speeds = listOf(0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f)
    Dialog(onDismissRequest = onDismiss) {
        Surface(color = TvBgCard, shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(stringResource(R.string.player_speed), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(16.dp))
                speeds.forEach { sp ->
                    TvTrackRow(name = if (sp == 1.0f) "Normale" else "${sp}x", selected = currentSpeed == sp) {
                        onSpeedSelect(sp)
                    }
                }
                Spacer(Modifier.height(16.dp))
                TvTextButton(label = stringResource(R.string.action_close), onClick = onDismiss)
            }
        }
    }
}

private fun Long.toTimeString(): String {
    val s = this / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%02d:%02d".format(m, sec)
}
