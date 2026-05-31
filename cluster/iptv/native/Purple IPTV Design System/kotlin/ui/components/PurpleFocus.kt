package com.purpleiptv.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.purpleiptv.tv.theme.PurpleMotion
import com.purpleiptv.tv.theme.PurplePalette

/**
 * The TV focus state — applied via Modifier extension so every component
 * can opt-in with a single line.
 *
 *  - Scale 1 → 1.08 over 160 ms
 *  - 3 dp lavender ring
 *  - 24 / 64 dp lavender glow (via shadow + colored elevation)
 *  - Sibling dimming is the parent's job (use `Modifier.alpha(if (anySiblingFocused) 0.5f else 1f)`)
 *
 * Usage:
 * ```
 * val (mod, focused) = Modifier.purpleFocusable(shape = PurpleShapes.Lg)
 * Box(modifier = mod) { … }
 * ```
 *
 * Returns the wired modifier and a `State<Boolean>` indicating focus,
 * so callers can branch on it (different elevation, different content).
 */
@Composable
fun Modifier.purpleFocusable(
    shape: RoundedCornerShape = RoundedCornerShape(14.dp),
    enabled: Boolean = true,
    onFocusChanged: (Boolean) -> Unit = {},
    onClick: (() -> Unit)? = null,
): Modifier {
    var focused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (focused) PurpleMotion.FocusScale else 1f,
        animationSpec = tween(PurpleMotion.DurationFocus, easing = PurpleMotion.EaseOutQuint),
        label = "focus-scale",
    )
    return this
        .scale(scale)
        .then(
            if (focused)
                Modifier
                    .shadow(elevation = 24.dp, shape = shape, ambientColor = PurplePalette.Purple400, spotColor = PurplePalette.Purple400)
                    .border(width = 3.dp, color = PurplePalette.Purple400, shape = shape)
            else Modifier
        )
        .focusable(enabled)
        .onFocusChanged {
            focused = it.isFocused
            onFocusChanged(it.isFocused)
        }
}

/**
 * Local variant when you need to track focus from the outside (parent
 * owns the state). Use this when the parent dims siblings.
 */
@Composable
fun Modifier.purpleFocusBox(
    focused: Boolean,
    shape: RoundedCornerShape = RoundedCornerShape(14.dp),
): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (focused) PurpleMotion.FocusScale else 1f,
        animationSpec = tween(PurpleMotion.DurationFocus, easing = PurpleMotion.EaseOutQuint),
        label = "focus-scale",
    )
    return this
        .scale(scale)
        .then(
            if (focused)
                Modifier
                    .shadow(24.dp, shape, ambientColor = PurplePalette.Purple400, spotColor = PurplePalette.Purple400)
                    .border(3.dp, PurplePalette.Purple400, shape)
            else Modifier
        )
}
