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
import androidx.media3.common.C
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.purple.iptvplayer.core.epg.EpgTimeline
import com.purple.iptvplayer.core.player.VersionMode
import com.purple.iptvplayer.core.model.EpgProgram
import com.purple.iptvplayer.core.player.PlayerStatus
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.PlayerViewModel
import com.purple.iptvplayer.tv.ui.common.KeepScreenOn
import com.purple.iptvplayer.tv.R
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
    val playFocus = remember { FocusRequester() }

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

    // Transfer focus to play button when overlay appears; root when hidden
    LaunchedEffect(overlayVisible) {
        delay(80)
        try {
            if (overlayVisible && !showSpeedDialog && !showTrackDialog) playFocus.requestFocus()
            else rootFocus.requestFocus()
        } catch (_: Exception) { }
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
            .focusable()
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                // Tout appui compte comme une interaction, y compris quand l'overlay est
                // déjà visible : les événements non consommés par l'élément focalisé
                // remontent jusqu'ici avant que le focus ne se déplace.
                lastInteractionMs = System.currentTimeMillis()
                // On ne consomme que le premier appui, celui qui rouvre l'overlay ;
                // les suivants doivent continuer à déplacer le focus.
                if (overlayVisible) {
                    false
                } else {
                    overlayVisible = true
                    true
                }
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
                playFocus      = playFocus,
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
            player    = vm.playerService.player,
            viewModel = vm,
            onDismiss = { showTrackDialog = false },
        )
    }

    LaunchedEffect(Unit) {
        delay(100)
        try { rootFocus.requestFocus() } catch (_: Exception) { }
    }
}

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
    playFocus:     FocusRequester,
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
                        playFocus.requestFocus(); true
                    } else false
                }
                .background(Brush.verticalGradient(listOf(Color.Black.copy(0.85f), Color.Transparent)))
                .padding(horizontal = 32.dp, vertical = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TvControlButton(icon = Icons.Rounded.ArrowBack, onClick = onBack, size = 28)
                Spacer(Modifier.width(16.dp))
                if (isLive) {
                    Text("LIVE", color = Color.Red, fontSize = 12.sp, fontWeight = FontWeight.Black,
                        modifier = Modifier.padding(end = 8.dp))
                }
                Text(title, color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f))
                Spacer(Modifier.width(12.dp))
                TvControlButton(icon = Icons.Rounded.Tune, onClick = onOpenTracks, size = 24)
                Spacer(Modifier.width(8.dp))
                TvTextButton(
                    label   = if (playbackSpeed == 1f) "1×" else "${playbackSpeed}×",
                    onClick = onOpenSpeed,
                )
            }
        }

        // Center controls — play button gets the playFocus requester
        Row(
            modifier              = Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(32.dp),
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            if (!isLive) {
                TvControlButton(Icons.Rounded.Replay10, onClick = onSeekBackward, size = 40)
            }
            TvControlButton(
                icon     = if (isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                onClick  = onPlayPause,
                size     = 56,
                modifier = Modifier.focusRequester(playFocus),
            )
            if (!isLive) {
                TvControlButton(Icons.Rounded.Forward10, onClick = onSeekForward, size = 40)
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
                        TvControlButton(Icons.Rounded.Replay, onClick = onRestart, size = 28)
                        if (hasNext) {
                            Spacer(Modifier.width(16.dp))
                            TvControlButton(Icons.Rounded.SkipNext, onClick = onNext, size = 32)
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
                        color = Color.White, fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp,
                    )
                }
                Text(timeLabel, color = Color.White.copy(0.5f), fontSize = 13.sp)
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
                        fontSize = 13.sp,
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
private fun TvTextButton(label: String, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = Modifier.onFocusChanged { isFocused = it.isFocused },
        shape = RoundedCornerShape(8.dp),
        color = if (isFocused) Color.White.copy(alpha = 0.2f) else Color.Transparent,
        border = if (isFocused) BorderStroke(2.dp, Color.White) else null,
    ) {
        Text(label, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
    }
}

@Composable
private fun TvTrackDialog(player: ExoPlayer, viewModel: PlayerViewModel, onDismiss: () -> Unit) {
    val tracks      = player.currentTracks
    val audioGroups = remember(tracks) { tracks.groups.filter { it.type == C.TRACK_TYPE_AUDIO } }
    val textGroups  = remember(tracks) { tracks.groups.filter { it.type == C.TRACK_TYPE_TEXT } }
    val anySubtitlePlaying = remember(tracks) {
        textGroups.any { g -> (0 until g.length).any { g.isTrackSelected(it) } }
    }

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

                if (currentTab == 0) {
                    Box(modifier = Modifier.weight(1f)) {
                        androidx.compose.foundation.lazy.LazyColumn {
                            if (audioGroups.isNotEmpty()) {
                                item { Text(stringResource(R.string.player_audio), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                                items(audioGroups.size) { gIdx ->
                                    val group = audioGroups[gIdx]
                                    (0 until group.length).forEach { tIdx ->
                                        val fmt = group.getTrackFormat(tIdx)
                                        val name = fmt.language?.let { java.util.Locale(it).displayLanguage } ?: fmt.label ?: "Piste ${tIdx + 1}"
                                        TvTrackRow(name = name, selected = group.isTrackSelected(tIdx)) {
                                            player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
                                                .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(tIdx)))
                                                .build()
                                            onDismiss()
                                        }
                                    }
                                }
                                item { Spacer(Modifier.height(16.dp)) }
                            }
                            if (textGroups.isNotEmpty()) {
                                item { Text(stringResource(R.string.player_subs), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                                item {
                                    TvTrackRow(name = stringResource(R.string.player_off), selected = !anySubtitlePlaying) {
                                        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
                                            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true).build()
                                        onDismiss()
                                    }
                                }
                                items(textGroups.size) { gIdx ->
                                    val group = textGroups[gIdx]
                                    (0 until group.length).forEach { tIdx ->
                                        val fmt = group.getTrackFormat(tIdx)
                                        val name = fmt.language?.let { java.util.Locale(it).displayLanguage } ?: fmt.label ?: "Sous-titre ${tIdx + 1}"
                                        TvTrackRow(name = name, selected = anySubtitlePlaying && group.isTrackSelected(tIdx)) {
                                            player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
                                                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                                                .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(tIdx)))
                                                .build()
                                            onDismiss()
                                        }
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
                            listOf("Petit" to 0.75f, "Moyen" to 1.0f, "Grand" to 1.5f).forEach { (label, value) ->
                                TvTabButton(label = label, selected = subSize == value) { viewModel.updateSubtitleSize(value) }
                            }
                        }
                        Text(stringResource(R.string.player_color), color = TvTextSub, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            TvColorOption(name = "Blanc", color = Color.White, selected = subColor == "white") { viewModel.updateSubtitleColor("white") }
                            TvColorOption(name = "Jaune", color = Color.Yellow, selected = subColor == "yellow") { viewModel.updateSubtitleColor("yellow") }
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

@Composable
private fun TvTrackRow(name: String, selected: Boolean, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (isFocused) Color.White.copy(alpha = 0.1f) else Color.Transparent)
            .clickable(onClick = onClick)
            .onFocusChanged { isFocused = it.isFocused }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(selected = selected, onClick = null, colors = RadioButtonDefaults.colors(selectedColor = TvPurpleGlow))
        Spacer(Modifier.width(12.dp))
        Text(name, color = if (selected) TvPurpleGlow else Color.White, fontSize = 14.sp)
    }
}

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
