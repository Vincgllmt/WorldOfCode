package com.purpleiptv.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Cast
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import com.purpleiptv.tv.model.Channel
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleShapes
import com.purpleiptv.tv.theme.PurpleSpacing
import com.purpleiptv.tv.ui.components.*

/**
 * Live player. Real implementation will use Media3 / ExoPlayer in the
 * background — this composable is purely the overlay chrome.
 *
 * Overlays auto-hide after [autoHideMs] (default 5s). Any D-pad key
 * should bring them back. Implementation note for production:
 * gate this on a `key event listener` and a `mutableStateOf(true)`.
 *
 * [content] is the slot for the underlying video surface
 * (e.g. `AndroidView { PlayerView(it) }`).
 */
@Composable
fun LivePlayerScreen(
    channel: Channel,
    onBack: () -> Unit,
    onPause: () -> Unit,
    onOpenSubtitles: () -> Unit,
    onOpenAudio: () -> Unit,
    onOpenCast: () -> Unit,
    modifier: Modifier = Modifier,
    overlayVisible: Boolean = true,
    content: @Composable () -> Unit = {},
) {
    Box(modifier = modifier.fillMaxSize().background(Color.Black)) {
        // Video surface slot
        content()

        // Broadcaster watermarks (channel logo top-left, score top-right)
        Text(
            "+SPORT 360",
            style = LocalPurpleType.current.h3.copy(color = Color.White.copy(alpha = 0.6f)),
            modifier = Modifier.align(Alignment.TopStart).padding(start = PurpleSpacing.SectionLg, top = PurpleSpacing.SectionLg),
        )

        if (overlayVisible) {
            // Top chrome
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .background(
                        Brush.verticalGradient(
                            0f to Color(0xCC_000000),
                            1f to Color.Transparent,
                        ),
                    )
                    .padding(start = PurpleSpacing.TvSafeX, end = PurpleSpacing.TvSafeX, top = 44.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White, modifier = Modifier.size(26.dp))
                LiveDotInline()
                Text(channel.name, style = LocalPurpleType.current.h3.copy(color = Color.White.copy(alpha = 0.85f)))
            }

            // Bottom EPG card
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(start = PurpleSpacing.TvSafeX, end = PurpleSpacing.TvSafeX, bottom = 80.dp)
                    .background(Color(0xD9_140822), PurpleShapes.Lg)
                    .border(1.dp, Color.White.copy(alpha = 0.06f), PurpleShapes.Lg)
                    .padding(horizontal = 36.dp, vertical = 32.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(18.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        LiveBadge()
                        val start = channel.nowPlayingStart ?: "—"
                        val end = channel.nowPlayingEnd ?: "—"
                        Text("$start – $end", style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3))
                    }
                    Text(
                        channel.nowPlayingTitle ?: channel.name,
                        style = LocalPurpleType.current.h2.copy(color = Color.White),
                    )
                    // Progress bar
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(5.dp)
                            .background(Color.White.copy(alpha = 0.15f), PurpleShapes.Pill),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(channel.nowPlayingProgress.coerceIn(0f, 1f))
                                .fillMaxHeight()
                                .background(PurplePalette.Purple400, PurpleShapes.Pill),
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            "Next: Inside Sport · Post-match analysis",
                            style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            PurpleButton("Pause",     onPause,         icon = Icons.Default.Pause,     variant = PurpleButtonVariant.Ghost)
                            PurpleButton("Subtitles", onOpenSubtitles, icon = Icons.Default.Subtitles, variant = PurpleButtonVariant.Ghost)
                            PurpleButton("Audio",     onOpenAudio,     icon = Icons.Default.GraphicEq, variant = PurpleButtonVariant.Ghost)
                            PurpleButton("Cast",      onOpenCast,      icon = Icons.Default.Cast,      variant = PurpleButtonVariant.Ghost)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LiveDotInline() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.size(10.dp).background(PurplePalette.Live, PurpleShapes.Pill))
        Text(
            "LIVE",
            style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Live),
        )
    }
}
