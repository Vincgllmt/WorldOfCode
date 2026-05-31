package com.purpleiptv.tv.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurpleMotion
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleShapes

enum class PurpleButtonVariant { Primary, Secondary, Ghost }

/**
 * The kit's primary CTA. Three variants, all support focus state.
 *
 * Use:
 * ```
 * PurpleButton(
 *     onClick = { play() },
 *     icon = Icons.Default.PlayArrow,
 *     text = "Play",
 *     variant = PurpleButtonVariant.Primary,
 * )
 * ```
 *
 * Implemented atop `tv.material3.Surface` because it gives us the
 * proper TV focus contract (D-pad navigation, scale-on-focus hooks).
 * The visual focus treatment (lavender ring + glow) is reapplied
 * manually so we get the exact tokens — Material's `glow` shape is
 * subtly different.
 */
@Composable
fun PurpleButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: PurpleButtonVariant = PurpleButtonVariant.Primary,
    icon: ImageVector? = null,
    enabled: Boolean = true,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val container = when (variant) {
        PurpleButtonVariant.Primary   -> PurplePalette.Purple400
        PurpleButtonVariant.Secondary -> Color.Transparent
        PurpleButtonVariant.Ghost     -> Color.White.copy(alpha = 0.05f)
    }
    val containerFocused = when (variant) {
        PurpleButtonVariant.Primary   -> PurplePalette.Purple400
        PurpleButtonVariant.Secondary -> PurplePalette.Purple400.copy(alpha = 0.18f)
        PurpleButtonVariant.Ghost     -> PurplePalette.Purple400.copy(alpha = 0.20f)
    }
    val containerPressed = when (variant) {
        PurpleButtonVariant.Primary   -> PurplePalette.Purple600
        PurpleButtonVariant.Secondary -> PurplePalette.Purple400.copy(alpha = 0.30f)
        PurpleButtonVariant.Ghost     -> PurplePalette.Purple400.copy(alpha = 0.30f)
    }
    val content = when (variant) {
        PurpleButtonVariant.Primary   -> Color.White
        PurpleButtonVariant.Secondary -> if (isFocused) Color.White else PurplePalette.Purple300
        PurpleButtonVariant.Ghost     -> Color.White
    }
    val borderColor = when (variant) {
        PurpleButtonVariant.Primary   -> Color.Transparent
        PurpleButtonVariant.Secondary -> PurplePalette.Purple400
        PurpleButtonVariant.Ghost     -> Color.White.copy(alpha = 0.08f)
    }

    Surface(
        onClick = onClick,
        modifier = modifier.heightIn(min = 64.dp),
        enabled = enabled,
        shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors = ClickableSurfaceDefaults.colors(
            containerColor        = container,
            focusedContainerColor = containerFocused,
            pressedContainerColor = containerPressed,
            contentColor          = content,
            focusedContentColor   = content,
            pressedContentColor   = content,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = PurpleMotion.FocusScale),
        border = ClickableSurfaceDefaults.border(
            border = androidx.tv.material3.Border(
                border = androidx.compose.foundation.BorderStroke(1.5.dp, borderColor),
                shape = PurpleShapes.Md,
            ),
            focusedBorder = androidx.tv.material3.Border(
                border = androidx.compose.foundation.BorderStroke(3.dp, PurplePalette.Purple400),
                shape = PurpleShapes.Md,
            ),
        ),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = androidx.tv.material3.Glow(
                elevationColor = PurplePalette.Purple400,
                elevation = 24.dp,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 30.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = content, modifier = Modifier.size(26.dp))
            }
            Text(text, style = LocalPurpleType.current.button.copy(color = content))
        }
    }
}

/**
 * Outlined pill used for the "ACTIVATE" CTA on the trial banner.
 */
@Composable
fun OutlinedPill(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Pill),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.White.copy(alpha = 0.10f),
            contentColor = Color.White,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
        border = ClickableSurfaceDefaults.border(
            border = androidx.tv.material3.Border(
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color.White),
                shape = PurpleShapes.Pill,
            ),
            focusedBorder = androidx.tv.material3.Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, Color.White),
                shape = PurpleShapes.Pill,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Text(
            text.uppercase(),
            modifier = Modifier.padding(horizontal = 26.dp, vertical = 12.dp),
            style = LocalPurpleType.current.capsLabel.copy(color = Color.White, fontSize = 14.sp),
        )
    }
}

private val Int.sp get() = androidx.compose.ui.unit.TextUnit(this.toFloat(), androidx.compose.ui.unit.TextUnitType.Sp)
