package com.purple.iptvplayer.mobile.ui.player

import android.view.ViewGroup
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.purple.iptvplayer.R
import com.purple.iptvplayer.core.epg.EpgTimeline
import com.purple.iptvplayer.core.player.VersionMode
import com.purple.iptvplayer.core.model.EpgProgram
import com.purple.iptvplayer.core.player.PlayerStatus
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.PlayerViewModel
import com.purple.iptvplayer.mobile.ui.common.ImmersiveFullScreen
import com.purple.iptvplayer.mobile.ui.common.KeepScreenOn
import com.purple.iptvplayer.mobile.MainActivity
import com.purple.iptvplayer.mobile.ui.cast.CastButton
import com.purple.iptvplayer.mobile.ui.cast.CastRemoteSheet
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flowOf
import org.koin.androidx.compose.koinViewModel
import android.content.Context
import android.content.ContextWrapper

private fun Context.findMainActivity(): MainActivity? {
    var ctx = this
    while (ctx is ContextWrapper) {
        if (ctx is MainActivity) return ctx
        ctx = ctx.baseContext
    }
    return null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlayerScreen(
    url:      String,
    title:    String,
    mediaId:  String,
    type:     String = "",
    cover:    String? = null,
    streamId: Int = 0,
    onBack:   () -> Unit,
) {
    val vm:        PlayerViewModel  = koinViewModel()
    val castVm:    CastViewModel    = koinViewModel()
    val contentVm: ContentViewModel = koinViewModel()
    val state       by vm.playerState.collectAsState()
    val castInfo    by castVm.state.collectAsState()
    val epgPrograms by contentVm.epgPrograms.collectAsState()
    val availableVersions by vm.playerService.availableVersions.collectAsState()
    val selectedVersion   by vm.playerService.selectedVersion.collectAsState()

    val activity = LocalContext.current.findMainActivity()

    val subSize by vm.subtitleSize.collectAsState(initial = 1.0f)
    val subColor by vm.subtitleColor.collectAsState(initial = "white")
    val subBg by vm.subtitleBackground.collectAsState(initial = false)

    var overlayVisible    by remember { mutableStateOf(true) }
    var lastInteractionMs by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var showTrackSheet    by remember { mutableStateOf(false) }
    val isInPip           by (activity?.isInPip ?: flowOf(false)).collectAsState(initial = false)
    val isLive             = state.durationMs <= 0L

    // Start playback and register cast pending with resume position in a single effect
    LaunchedEffect(url) {
        if (url.isNotEmpty()) {
            val savedPos = if (mediaId.isNotEmpty()) vm.getSavedProgress(mediaId) else 0L
            vm.playMedia(url, title, mediaId.ifEmpty { null }, savedPos, cover, type)
            castVm.setPendingMedia(url, title, cover, savedPos, mediaId.ifEmpty { null }, type)
        }
    }

    // Load EPG for live channels
    LaunchedEffect(streamId) {
        if (streamId > 0) contentVm.loadEpg(streamId)
    }
    // L'appareil s'endormait en pleine lecture, et les barres système restaient
    // affichées par-dessus l'image. Les deux sont liés à la fenêtre, pas au lecteur.
    KeepScreenOn()
    ImmersiveFullScreen(enabled = !isInPip)

    DisposableEffect(Unit) { onDispose { contentVm.clearEpg() } }

    // Pause local player and close screen when casting starts
    LaunchedEffect(castInfo.isConnected) {
        if (castInfo.isConnected) {
            vm.pause()
            onBack()
        }
    }

    // Auto-hide overlay after 4 s of inactivity
    LaunchedEffect(lastInteractionMs) {
        delay(4_000)
        overlayVisible = false
    }

    // Next episode card — lives outside the overlay so it persists when overlay hides
    val showNextSuggestion = vm.hasNextEpisode() && state.durationMs > 0L &&
        (state.durationMs - state.positionMs <= 40_000L)
    var nextEpCountdown by remember { mutableIntStateOf(10) }
    LaunchedEffect(showNextSuggestion) {
        if (showNextSuggestion) {
            nextEpCountdown = 10
            while (nextEpCountdown > 0) { delay(1000); nextEpCountdown-- }
            vm.nextEpisode()
        }
    }

    // PiP delegate in MainActivity
    DisposableEffect(Unit) {
        activity?.pipDelegate = {
            if (state.status == PlayerStatus.PLAYING && !castInfo.isConnected) activity.enterPip()
        }
        onDispose {
            activity?.pipDelegate = null
            castVm.clearPendingMedia()
            vm.stop()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
            ) {
                if (!isInPip) {
                    overlayVisible = !overlayVisible
                    lastInteractionMs = System.currentTimeMillis()
                }
            },
    ) {
        // Video surface
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player        = vm.playerService.player
                    useController = false
                    layoutParams  = ViewGroup.LayoutParams(
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
                    setFixedTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 22f * subSize)
                    setStyle(captionStyle)
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        // Buffering spinner
        if (state.status == PlayerStatus.BUFFERING) {
            CircularProgressIndicator(
                modifier    = Modifier.align(Alignment.Center),
                color       = PurpleGlow,
                strokeWidth = 3.dp,
            )
        }

        // Error state
        if (state.status == PlayerStatus.ERROR) {
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Rounded.ErrorOutline, null, tint = ColorError, modifier = Modifier.size(56.dp))
                Spacer(Modifier.height(8.dp))
                Text(state.error ?: "Playback error", color = ColorError, fontSize = 14.sp)
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { vm.playMedia(url, title, mediaId.ifEmpty { null }, cover = cover, type = type) },
                    colors  = ButtonDefaults.buttonColors(containerColor = Purple),
                ) { Text(stringResource(R.string.action_retry)) }
            }
        }

        // Cast active overlay
        if (castInfo.isConnected && !isInPip) {
            Column(
                modifier            = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(Icons.Rounded.Cast, null, tint = PurpleGlow, modifier = Modifier.size(56.dp))
                Spacer(Modifier.height(8.dp))
                Text("Casting to ${castInfo.deviceName}", color = Color.White, fontSize = 14.sp)
            }
        }

        // Player controls overlay
        if (overlayVisible && !isInPip && !castInfo.isConnected) {
            PlayerOverlay(
                title          = state.title,
                isPlaying      = state.status == PlayerStatus.PLAYING,
                isLive         = isLive,
                positionMs     = state.positionMs,
                durationMs     = state.durationMs,
                playbackSpeed  = state.playbackSpeed,
                hasNext        = vm.hasNextEpisode(),
                onBack         = onBack,
                onPlayPause    = { if (state.status == PlayerStatus.PLAYING) vm.pause() else vm.resume() },
                onSeek         = { vm.seekTo(it) },
                onRestart      = { vm.restart() },
                onSpeedChange  = { vm.setSpeed(it) },
                onNext         = { vm.nextEpisode() },
                onTracks       = { showTrackSheet = true },
                onInteraction  = { lastInteractionMs = System.currentTimeMillis() },
                castSlot       = {
                    CastButton(modifier = Modifier.size(40.dp).align(Alignment.CenterVertically), tint = Color.White)
                },
            )
        }

        // Carte EPG, en bas à gauche. Suit la visibilité de l'overlay comme les autres
        // contrôles : elle restait auparavant affichée en permanence, masquant l'image.
        if (isLive && epgPrograms.isNotEmpty() && !isInPip && overlayVisible) {
            EpgFloatingCard(
                programs = epgPrograms,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .navigationBarsPadding()
                    .padding(start = 16.dp, bottom = 16.dp),
            )
        }

        // Bouton VF / VOSTFR, en bas à droite. Demandé par `raf.md` pour les films et
        // les séries : il n'a pas de sens sur une chaîne live, qui ne porte qu'une
        // piste. Masqué quand la carte « épisode suivant » occupe le même coin.
        if (!isLive && !isInPip && overlayVisible && !showNextSuggestion) {
            VersionToggle(
                available = availableVersions,
                selected  = selectedVersion,
                onSelect  = { vm.playerService.selectVersion(it) },
                modifier  = Modifier
                    .align(Alignment.BottomEnd)
                    .navigationBarsPadding()
                    .padding(end = 16.dp, bottom = 96.dp),
            )
        }

        // Next episode card — always visible (not gated by overlay) so countdown survives overlay hide/show
        if (showNextSuggestion && !isInPip) {
            NextEpisodeCard(
                countdown = nextEpCountdown,
                nextTitle = vm.getNextMediaTitle(),
                onNext    = { vm.nextEpisode() },
                modifier  = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 120.dp, end = 16.dp),
            )
        }
    }

    // Track selection bottom sheet
    if (showTrackSheet) {
        TrackSelectionSheet(
            player    = vm.playerService.player,
            viewModel = vm,
            onDismiss = { showTrackSheet = false },
        )
    }
}

/**
 * Bascule VF / VOSTFR.
 *
 * N'apparaît que si les **deux** versions existent réellement dans le média : avec une
 * seule, il n'y a rien à choisir et le bouton ne serait que du bruit sur l'image.
 * Ce que « exister » veut dire est décidé par `VersionPolicy`, pas ici.
 */
@Composable
private fun VersionToggle(
    available: Set<VersionMode>,
    selected:  VersionMode?,
    onSelect:  (VersionMode) -> Unit,
    modifier:  Modifier = Modifier,
) {
    if (available.size < 2) return
    Surface(
        modifier = modifier,
        shape    = RoundedCornerShape(20.dp),
        color    = Color.Black.copy(alpha = 0.6f),
        border   = BorderStroke(1.dp, PurpleGlow.copy(alpha = 0.35f)),
    ) {
        Row(modifier = Modifier.padding(3.dp)) {
            VersionMode.values().filter { it in available }.forEach { mode ->
                val isOn = mode == selected
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(17.dp))
                        .background(if (isOn) Purple else Color.Transparent)
                        .clickable { onSelect(mode) }
                        .padding(horizontal = 14.dp, vertical = 7.dp),
                ) {
                    Text(
                        mode.name,
                        color      = if (isOn) Color.White else Color.White.copy(0.6f),
                        fontSize   = 12.sp,
                        fontWeight = if (isOn) FontWeight.Bold else FontWeight.Medium,
                        letterSpacing = 0.5.sp,
                    )
                }
            }
        }
    }
}

// ── Player overlay ────────────────────────────────────────────────────────────

@Composable
private fun PlayerOverlay(
    title:         String,
    isPlaying:     Boolean,
    isLive:        Boolean,
    positionMs:    Long,
    durationMs:    Long,
    playbackSpeed: Float,
    hasNext:       Boolean = false,
    onBack:        () -> Unit,
    onPlayPause:   () -> Unit,
    onSeek:        (Long) -> Unit,
    onRestart:     () -> Unit,
    onSpeedChange: (Float) -> Unit,
    onNext:        () -> Unit = {},
    onTracks:      () -> Unit,
    onInteraction: () -> Unit,
    castSlot:      @Composable RowScope.() -> Unit = {},
) {
    val speeds = listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)
    var showSpeedMenu by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {

        // ── Top gradient bar ──────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent)
                    )
                )
                .statusBarsPadding()
                .padding(start = 4.dp, end = 4.dp, bottom = 32.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Rounded.ArrowBack, null, tint = Color.White)
                }
                if (isLive) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(end = 8.dp),
                    ) {
                        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color.Red))
                        Spacer(Modifier.width(4.dp))
                        Text("LIVE", color = Color.Red, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    }
                }
                Text(
                    title, color = Color.White, fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f),
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                // Tracks button
                IconButton(onClick = { onTracks(); onInteraction() }) {
                    Icon(Icons.Rounded.Tune, null, tint = Color.White)
                }
                // Cast slot
                castSlot()
                // Speed picker
                Box {
                    TextButton(onClick = { showSpeedMenu = true; onInteraction() }) {
                        Text(
                            if (playbackSpeed == 1f) "1×" else "${playbackSpeed}×",
                            color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                        )
                    }
                    DropdownMenu(
                        expanded = showSpeedMenu,
                        onDismissRequest = { showSpeedMenu = false },
                        modifier = Modifier.background(BgCard),
                    ) {
                        speeds.forEach { speed ->
                            val selected = speed == playbackSpeed
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        if (speed == 1f) "1× Normal" else "${speed}×",
                                        color = if (selected) PurpleGlow else TextPrimary,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                },
                                onClick = { onSpeedChange(speed); showSpeedMenu = false; onInteraction() },
                                modifier = if (selected) Modifier.background(Purple.copy(0.15f)) else Modifier,
                            )
                        }
                    }
                }
            }
        }

        // ── Center controls ───────────────────────────────────────────────────
        Row(
            modifier              = Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(28.dp),
            verticalAlignment     = Alignment.CenterVertically,
        ) {
            if (!isLive) {
                ControlButton(size = 56.dp, onClick = {
                    onSeek((positionMs - 10_000L).coerceAtLeast(0L)); onInteraction()
                }) {
                    Icon(Icons.Rounded.Replay10, null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
            ControlButton(size = 76.dp, containerAlpha = 0.65f, onClick = {
                onPlayPause(); onInteraction()
            }) {
                Icon(
                    if (isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                    null, tint = Color.White, modifier = Modifier.size(46.dp),
                )
            }
            if (!isLive) {
                ControlButton(size = 56.dp, onClick = {
                    onSeek((positionMs + 10_000L).coerceAtMost(durationMs)); onInteraction()
                }) {
                    Icon(Icons.Rounded.Forward10, null, tint = Color.White, modifier = Modifier.size(28.dp))
                }
            }
        }

        // ── Bottom gradient bar ───────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(0.85f))
                    )
                )
                .navigationBarsPadding()
                .padding(start = 16.dp, end = 16.dp, top = 32.dp, bottom = 12.dp),
        ) {
            Column {
                if (durationMs > 0L) {
                    Slider(
                        value         = (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f),
                        onValueChange = { onSeek((it * durationMs).toLong()); onInteraction() },
                        modifier      = Modifier.fillMaxWidth(),
                        colors        = SliderDefaults.colors(
                            thumbColor       = PurpleGlow,
                            activeTrackColor = Purple,
                        ),
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { onRestart(); onInteraction() }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Rounded.Replay, null, tint = Color.White, modifier = Modifier.size(22.dp))
                        }
                        if (hasNext) {
                            IconButton(
                                onClick = { onNext(); onInteraction() },
                                modifier = Modifier.padding(start = 8.dp).size(32.dp)
                            ) {
                                Icon(Icons.Rounded.SkipNext, null, tint = Color.White, modifier = Modifier.size(22.dp))
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Text(positionMs.toTimeString(), color = Color.White.copy(0.7f), fontSize = 12.sp)
                        Spacer(Modifier.weight(1f))
                        Text(durationMs.toTimeString(), color = Color.White.copy(0.7f), fontSize = 12.sp)
                    }
                }

            }
        }
    }
}

@Composable
private fun NextEpisodeCard(
    countdown: Int,
    nextTitle: String?,
    onNext:    () -> Unit,
    modifier:  Modifier = Modifier,
) {
    Surface(
        onClick    = onNext,
        modifier   = modifier,
        color      = Color.Black.copy(alpha = 0.85f),
        shape      = RoundedCornerShape(20.dp),
        border     = BorderStroke(1.dp, PurpleGlow.copy(alpha = 0.6f)),
        shadowElevation = 16.dp,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(44.dp)) {
                CircularProgressIndicator(
                    progress    = { countdown / 10f },
                    modifier    = Modifier.fillMaxSize(),
                    color       = PurpleGlow,
                    strokeWidth = 3.dp,
                    trackColor  = Color.White.copy(0.15f),
                )
                Text("$countdown", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            Column {
                Text(
                    "Épisode suivant",
                    color = Color.White.copy(0.6f),
                    fontSize = 11.sp,
                    letterSpacing = 0.5.sp,
                )
                Text(
                    nextTitle ?: "Chargement…",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.widthIn(max = 180.dp),
                )
            }
            Surface(
                onClick = onNext,
                shape   = CircleShape,
                color   = Purple,
                modifier = Modifier.size(36.dp),
            ) {
                Icon(
                    Icons.Rounded.SkipNext,
                    null,
                    tint     = Color.White,
                    modifier = Modifier.padding(6.dp).fillMaxSize(),
                )
            }
        }
    }
}

@Composable
private fun EpgFloatingCard(programs: List<EpgProgram>, modifier: Modifier = Modifier) {
    // L'instant courant doit être un état qui progresse : lu une seule fois pendant la
    // composition, la barre d'avancement restait figée et la carte continuait d'annoncer
    // un programme terminé pendant toute la session.
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            now = System.currentTimeMillis()
        }
    }

    // Sélection et avancement viennent de `core` : la même décision était écrite ici
    // et dans `TvPlayerScreen`, et les deux copies avaient divergé — la TV n'avait
    // jamais reçu P10/P11. Voir EpgTimeline.
    val snap = EpgTimeline.snapshot(programs, now) ?: return
    val current  = snap.current
    val next     = snap.next
    val progress = snap.progress

    // Horaires formatés dans le fuseau de l'appareil. Afficher la chaîne brute du
    // fournisseur donnait un horaire faux : mesuré à 20:28 heure locale, le JT de 20h
    // s'affichait « 19:00 – 19:45 », le panneau émettant en UTC+1.
    val timeLabel = "${EpgTimeline.formatTime(current, end = false)} – ${EpgTimeline.formatTime(current, end = true)}"

    Surface(
        modifier  = modifier.widthIn(max = 260.dp),
        shape     = RoundedCornerShape(16.dp),
        color     = Color.Black.copy(alpha = 0.72f),
        border    = BorderStroke(1.dp, PurpleGlow.copy(alpha = 0.35f)),
        shadowElevation = 12.dp,
    ) {
        Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            // Badge + time
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(Purple.copy(alpha = 0.85f))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(stringResource(R.string.player_live), color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp)
                }
                Text(timeLabel, color = Color.White.copy(0.5f), fontSize = 10.sp)
            }

            Spacer(Modifier.height(6.dp))

            // Current program title
            Text(
                current.title,
                color      = Color.White,
                fontSize   = 13.sp,
                fontWeight = FontWeight.Bold,
                maxLines   = 2,
                overflow   = TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(6.dp))

            // Progress bar
            LinearProgressIndicator(
                progress     = { progress },
                modifier     = Modifier.fillMaxWidth().height(3.dp).clip(androidx.compose.foundation.shape.CircleShape),
                color        = PurpleGlow,
                trackColor   = Color.White.copy(0.15f),
            )

            // Next program
            if (next != null) {
                Spacer(Modifier.height(6.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(Icons.Rounded.SkipNext, null, tint = Color.White.copy(0.4f), modifier = Modifier.size(11.dp))
                    Text(
                        next.title,
                        color    = Color.White.copy(0.45f),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

// ── Control button ────────────────────────────────────────────────────────────

@Composable
private fun ControlButton(
    size:           Dp,
    containerAlpha: Float = 0.5f,
    onClick:        () -> Unit,
    content:        @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(Color.Black.copy(containerAlpha))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}

// ── Track selection sheet ─────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TrackSelectionSheet(
    player: ExoPlayer,
    viewModel: PlayerViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val tracks     = player.currentTracks
    val audioGroups = remember(tracks) { tracks.groups.filter { it.type == C.TRACK_TYPE_AUDIO } }
    val textGroups  = remember(tracks) { tracks.groups.filter { it.type == C.TRACK_TYPE_TEXT } }
    val anySubtitlePlaying = remember(tracks) {
        textGroups.any { g -> (0 until g.length).any { g.isTrackSelected(it) } }
    }

    val subSize by viewModel.subtitleSize.collectAsState(initial = 1.0f)
    val subColor by viewModel.subtitleColor.collectAsState(initial = "white")
    val subBg by viewModel.subtitleBackground.collectAsState(initial = false)

    var currentTab by remember { mutableIntStateOf(0) } // 0: Tracks, 1: Subtitle Settings

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = sheetState,
        containerColor   = BgCard,
        dragHandle = {
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .size(width = 40.dp, height = 4.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(TextSub.copy(0.3f)),
            )
        },
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .navigationBarsPadding()
                .padding(bottom = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { currentTab = 0 }) {
                    Text(stringResource(R.string.player_tracks), color = if (currentTab == 0) PurpleGlow else TextSub, fontWeight = if (currentTab == 0) FontWeight.Bold else FontWeight.Normal)
                }
                Spacer(Modifier.width(8.dp))
                TextButton(onClick = { currentTab = 1 }) {
                    Text(stringResource(R.string.player_sub_style), color = if (currentTab == 1) PurpleGlow else TextSub, fontWeight = if (currentTab == 1) FontWeight.Bold else FontWeight.Normal)
                }
            }
            
            Spacer(Modifier.height(8.dp))

            if (currentTab == 0) {
                if (audioGroups.isNotEmpty()) {
                    TrackSectionHeader("AUDIO")
                    Spacer(Modifier.height(4.dp))
                    audioGroups.forEachIndexed { _, group ->
                        (0 until group.length).forEach { trackIdx ->
                            val fmt      = group.getTrackFormat(trackIdx)
                            val name     = fmt.language?.let { langCodeToName(it) } ?: fmt.label ?: "Track ${trackIdx + 1}"
                            val selected = group.isTrackSelected(trackIdx)
                            TrackRow(name = name, isSelected = selected) {
                                player.trackSelectionParameters = player.trackSelectionParameters
                                    .buildUpon()
                                    .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(trackIdx)))
                                    .build()
                                onDismiss()
                            }
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }

                if (textGroups.isNotEmpty()) {
                    TrackSectionHeader("SOUS-TITRES")
                    Spacer(Modifier.height(4.dp))
                    TrackRow(name = "Désactivé", isSelected = !anySubtitlePlaying) {
                        player.trackSelectionParameters = player.trackSelectionParameters
                            .buildUpon()
                            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                            .build()
                        onDismiss()
                    }
                    textGroups.forEachIndexed { _, group ->
                        (0 until group.length).forEach { trackIdx ->
                            val fmt      = group.getTrackFormat(trackIdx)
                            val name     = fmt.language?.let { langCodeToName(it) } ?: fmt.label ?: "Subtitle ${trackIdx + 1}"
                            val selected = anySubtitlePlaying && group.isTrackSelected(trackIdx)
                            TrackRow(name = name, isSelected = selected) {
                                player.trackSelectionParameters = player.trackSelectionParameters
                                    .buildUpon()
                                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                                    .setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(trackIdx)))
                                    .build()
                                onDismiss()
                            }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }

                if (audioGroups.isEmpty() && textGroups.isEmpty()) {
                    Text(stringResource(R.string.player_no_tracks), color = TextSub, fontSize = 14.sp)
                    Spacer(Modifier.height(16.dp))
                }
            } else {
                // Subtitle style settings
                SubtitleStyleContent(subSize, subColor, subBg, viewModel)
            }
        }
    }
}

@Composable
private fun SubtitleStyleContent(subSize: Float, subColor: String, subBg: Boolean, viewModel: PlayerViewModel) {
    TrackSectionHeader("APERÇU")
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(80.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        val captionStyle = androidx.media3.ui.CaptionStyleCompat(
            if (subColor == "yellow") android.graphics.Color.YELLOW else android.graphics.Color.WHITE,
            if (subBg) android.graphics.Color.parseColor("#80000000") else android.graphics.Color.TRANSPARENT,
            android.graphics.Color.TRANSPARENT,
            androidx.media3.ui.CaptionStyleCompat.EDGE_TYPE_NONE,
            android.graphics.Color.WHITE,
            null
        )
        Text(
            "Ceci est un aperçu des sous-titres",
            color = if (subColor == "yellow") Color.Yellow else Color.White,
            fontSize = (20f * subSize).sp,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .then(if (subBg) Modifier.background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(4.dp)) else Modifier)
                .padding(horizontal = 8.dp, vertical = 2.dp)
        )
    }
    
    Spacer(Modifier.height(20.dp))

    TrackSectionHeader("TAILLE")
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(vertical = 10.dp)) {
        listOf(0.75f to "Petit", 1.0f to "Moyen", 1.5f to "Grand").forEach { (size, label) ->
            val selected = subSize == size
            Surface(
                onClick = { viewModel.updateSubtitleSize(size) },
                shape = RoundedCornerShape(10.dp),
                color = if (selected) Purple.copy(0.2f) else BgHome,
                border = BorderStroke(1.dp, if (selected) PurpleGlow else Color.Transparent)
            ) {
                Text(label, color = if (selected) PurpleGlow else TextSub, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp), fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
    
    Spacer(Modifier.height(16.dp))

    TrackSectionHeader("COULEUR")
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(vertical = 10.dp)) {
        ColorOptionSmall(name = "Blanc", color = Color.White, selected = subColor == "white") { viewModel.updateSubtitleColor("white") }
        ColorOptionSmall(name = "Jaune", color = Color.Yellow, selected = subColor == "yellow") { viewModel.updateSubtitleColor("yellow") }
    }
    
    Spacer(Modifier.height(16.dp))

    TrackSectionHeader("ARRIÈRE-PLAN")
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable { viewModel.updateSubtitleBackground(!subBg) }.padding(vertical = 8.dp)) {
        Text(stringResource(R.string.player_sub_bg), color = TextPrimary, modifier = Modifier.weight(1f))
        Switch(checked = subBg, onCheckedChange = { viewModel.updateSubtitleBackground(it) }, colors = SwitchDefaults.colors(checkedThumbColor = PurpleGlow, checkedTrackColor = Purple))
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
        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(16.dp).clip(CircleShape).background(color).border(0.5.dp, Color.Gray, CircleShape))
            Text(name, color = if (selected) Color.White else TextSub, fontSize = 14.sp)
        }
    }
}

@Composable
private fun TrackSectionHeader(label: String) {
    Text(label, color = TextSub, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
}

@Composable
private fun TrackRow(name: String, isSelected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) Purple.copy(0.15f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Icon(
            if (isSelected) Icons.Rounded.RadioButtonChecked else Icons.Rounded.RadioButtonUnchecked,
            null, tint = if (isSelected) PurpleGlow else TextSub,
            modifier = Modifier.size(20.dp),
        )
        Text(
            name,
            color      = if (isSelected) PurpleGlow else TextPrimary,
            fontSize   = 15.sp,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

private fun langCodeToName(code: String): String = runCatching {
    java.util.Locale(code).displayLanguage
        .replaceFirstChar { it.uppercase() }
        .takeIf { it.isNotBlank() && it != code }
        ?: code.uppercase()
}.getOrDefault(code.uppercase())

private fun Long.toTimeString(): String {
    val s = this / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%02d:%02d".format(m, sec)
}
