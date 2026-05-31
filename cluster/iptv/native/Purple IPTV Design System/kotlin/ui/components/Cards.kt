package com.purpleiptv.tv.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.purpleiptv.tv.model.Channel
import com.purpleiptv.tv.model.ContinueWatchingItem
import com.purpleiptv.tv.model.Movie
import com.purpleiptv.tv.model.Series
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurpleMotion
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleShapes

/**
 * 2:3 portrait poster card. The single most-used component on Home.
 *
 *  - Default: artwork full-bleed, soft inner border, rating chip bottom-left
 *  - Focused: 1.08 scale + lavender 3 dp ring + 24 dp glow
 *
 * Sibling dimming (the 0.5 alpha on un-focused siblings) is the parent's
 * job — the parent passes `isAnySiblingFocused` and we react.
 */
@Composable
fun PosterCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 220.dp,
    height: Dp = 320.dp,
    showLabel: Boolean = true,
    isAnySiblingFocused: Boolean = false,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val dim = isAnySiblingFocused && !isFocused

    Column(
        modifier = modifier
            .width(width)
            .alpha(if (dim) 0.5f else 1f),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Surface(
            onClick = onClick,
            modifier = Modifier.size(width, height),
            shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Lg),
            colors = ClickableSurfaceDefaults.colors(containerColor = Color(movie.accentColor)),
            scale = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
            border = ClickableSurfaceDefaults.border(
                focusedBorder = androidx.tv.material3.Border(
                    border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                    shape = PurpleShapes.Lg,
                ),
            ),
            glow = ClickableSurfaceDefaults.glow(
                focusedGlow = androidx.tv.material3.Glow(elevationColor = PurplePalette.Purple400, elevation = 24.dp),
            ),
            interactionSource = interactionSource,
        ) {
            Box(Modifier.fillMaxSize()) {
                // Artwork
                if (movie.posterUrl != null) {
                    AsyncImage(
                        model = movie.posterUrl,
                        contentDescription = movie.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                // Bottom protection gradient for the title text
                Box(
                    Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .height(height * 0.5f)
                        .background(
                            Brush.verticalGradient(
                                0f to Color.Transparent,
                                1f to Color(0xE6_0B0414),
                            ),
                        ),
                )
                if (movie.rating > 0) {
                    RatingChip(
                        value = movie.rating,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(10.dp),
                    )
                }
            }
        }
        if (showLabel) {
            Text(
                text = movie.title,
                style = LocalPurpleType.current.bodySmall.copy(
                    color = if (isFocused) PurplePalette.Fg1 else PurplePalette.Fg2,
                ),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/**
 * Wide 16:9 hero card for "Continue Watching". Shows progress bar.
 * On focus, overlays a giant lavender play button.
 */
@Composable
fun ContinueCard(
    item: ContinueWatchingItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 380.dp,
    height: Dp = 215.dp,
    isAnySiblingFocused: Boolean = false,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val dim = isAnySiblingFocused && !isFocused

    Surface(
        onClick = onClick,
        modifier = modifier.size(width, height).alpha(if (dim) 0.5f else 1f),
        shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors = ClickableSurfaceDefaults.colors(containerColor = Color(item.accentColor)),
        scale = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = androidx.tv.material3.Border(
                border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                shape = PurpleShapes.Md,
            ),
        ),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = androidx.tv.material3.Glow(elevationColor = PurplePalette.Purple400, elevation = 24.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Box(Modifier.fillMaxSize()) {
            if (item.backdropUrl != null) {
                AsyncImage(
                    model = item.backdropUrl,
                    contentDescription = item.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            // Bottom protection gradient
            Box(
                Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(height * 0.55f)
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            1f to Color(0xEB_0B0414),
                        ),
                    ),
            )
            CapsLabel(
                item.subtitle,
                color = Color.White.copy(alpha = 0.7f),
                modifier = Modifier.align(Alignment.TopStart).padding(20.dp),
            )
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    item.title,
                    style = LocalPurpleType.current.h3.copy(color = Color.White),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                // Progress bar
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(Color.White.copy(alpha = 0.15f), PurpleShapes.Pill),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(item.progress)
                            .fillMaxHeight()
                            .background(PurplePalette.Purple400, PurpleShapes.Pill),
                    )
                }
            }
            // Focus affordance: huge play button
            if (isFocused) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0x59_140822)),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier
                            .size(88.dp)
                            .clip(PurpleShapes.Pill)
                            .background(PurplePalette.Purple400),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = "Play",
                            tint = Color.White,
                            modifier = Modifier.size(40.dp),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Square channel tile for Direct TV. Logo art full-bleed,
 * a tiny pulsing red LIVE dot in the top-left, label sits *below* the tile.
 */
@Composable
fun ChannelTile(
    channel: Channel,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 240.dp,
    isAnySiblingFocused: Boolean = false,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val dim = isAnySiblingFocused && !isFocused

    Column(
        modifier = modifier
            .width(size)
            .alpha(if (dim) 0.5f else 1f),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Surface(
            onClick = onClick,
            modifier = Modifier.size(size),
            shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
            colors = ClickableSurfaceDefaults.colors(containerColor = PurplePalette.Bg2),
            scale = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
            border = ClickableSurfaceDefaults.border(
                focusedBorder = androidx.tv.material3.Border(
                    border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                    shape = PurpleShapes.Md,
                ),
            ),
            glow = ClickableSurfaceDefaults.glow(
                focusedGlow = androidx.tv.material3.Glow(elevationColor = PurplePalette.Purple400, elevation = 24.dp),
            ),
            interactionSource = interactionSource,
        ) {
            Box(Modifier.fillMaxSize()) {
                if (channel.logoUrl != null) {
                    AsyncImage(
                        model = channel.logoUrl,
                        contentDescription = channel.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
                // Pulsing LIVE dot
                Box(
                    Modifier
                        .align(Alignment.TopStart)
                        .padding(12.dp)
                        .size(8.dp)
                        .background(PurplePalette.Live, PurpleShapes.Pill),
                )
            }
        }
        Text(
            text = channel.name,
            style = LocalPurpleType.current.bodySmall.copy(
                color = if (isFocused) PurplePalette.Fg1 else PurplePalette.Fg2,
            ),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

// alpha helper missing import
@Composable
private fun Modifier.alpha(alpha: Float): Modifier =
    if (alpha == 1f) this else this.then(Modifier.graphicsLayerAlpha(alpha))

private fun Modifier.graphicsLayerAlpha(alpha: Float): Modifier =
    this.then(androidx.compose.ui.draw.alpha(alpha))
