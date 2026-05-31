package com.purpleiptv.tv.ui.components

import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurpleMotion
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleShapes
import com.purpleiptv.tv.theme.PurpleSpacing

/**
 * Top-level navigation destinations. Rail collapses to 110 dp when
 * focus is elsewhere; expands to 320 dp when any rail item is focused.
 */
enum class RailDestination(val label: String, val icon: ImageVector) {
    Home     ("Home",      Icons.Default.Home),
    Search   ("Search",    Icons.Default.Search),
    DirectTV ("Direct TV", Icons.Default.Tv),
    Films    ("Films",     Icons.Default.LocalMovies),
    Series   ("Series",    Icons.Default.LiveTv),
    Downloads("Downloads", Icons.Default.Download),
    Settings ("Settings",  Icons.Default.Settings),
}

/**
 * Collapsible left navigation rail (Netflix / Prime style).
 *
 * Behaviour:
 *  - Default: 110 dp wide, icon-only, with a lavender indicator bar on
 *    the active item.
 *  - When focus enters the rail (e.g. user presses ← from the content
 *    area), it expands to 320 dp with labels visible, over a 95%
 *    rgba(11,4,20) gradient + blur. Sibling content dims slightly.
 *  - Pressing → leaves the rail and returns focus to the content.
 */
@Composable
fun SideRail(
    active: RailDestination,
    onSelect: (RailDestination) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val width by animateDpAsState(
        targetValue = if (expanded) 320.dp else 110.dp,
        animationSpec = tween(220, easing = PurpleMotion.EaseOutQuint),
        label = "rail-width",
    )
    val mainItems = RailDestination.entries.dropLast(1)
    val settings = RailDestination.entries.last()

    Column(
        modifier = modifier
            .fillMaxHeight()
            .width(width)
            .background(
                if (expanded) Brush.horizontalGradient(
                    0f to Color(0xF2_0B0414),
                    0.6f to Color(0xD9_0B0414),
                    1f to Color.Transparent,
                ) else Brush.horizontalGradient(0f to Color.Transparent, 1f to Color.Transparent),
            )
            .onFocusEvent { state -> expanded = state.hasFocus }
            .padding(vertical = 44.dp),
    ) {
        BrandLockup(expanded)
        Spacer(Modifier.height(10.dp))
        Column(Modifier.weight(1f)) {
            mainItems.forEach { dest ->
                RailItem(
                    destination = dest,
                    isActive = dest == active,
                    expanded = expanded,
                    onSelect = { onSelect(dest) },
                )
            }
        }
        RailItem(
            destination = settings,
            isActive = settings == active,
            expanded = expanded,
            onSelect = { onSelect(settings) },
        )
        if (expanded) {
            TrialBadge(modifier = Modifier.padding(start = 18.dp, end = 18.dp, top = 16.dp))
        }
    }
}

@Composable
private fun BrandLockup(expanded: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = if (expanded) Arrangement.spacedBy(14.dp) else Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = if (expanded) 26.dp else 0.dp, vertical = 0.dp)
            .padding(bottom = 28.dp),
    ) {
        // Brand mark — replace with R.drawable.purple_iptv_mark
        Box(
            Modifier
                .size(48.dp)
                .background(PurplePalette.Purple700, PurpleShapes.Sm),
            contentAlignment = Alignment.Center,
        ) {
            Text("✦", color = PurplePalette.Purple200, style = LocalPurpleType.current.h2)
        }
        if (expanded) {
            Row {
                Text("PURPLE", style = LocalPurpleType.current.brandWordmark.copy(color = PurplePalette.Purple400))
                Text(
                    " IPTV",
                    style = LocalPurpleType.current.brandWordmark.copy(
                        color = PurplePalette.Fg1,
                        fontWeight = FontWeight.Normal,
                    ),
                )
            }
        }
    }
}

@Composable
private fun RailItem(
    destination: RailDestination,
    isActive: Boolean,
    expanded: Boolean,
    onSelect: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val bg = when {
        isFocused           -> PurplePalette.Purple400
        isActive && !expanded -> PurplePalette.Purple400.copy(alpha = 0.18f)
        else                -> Color.Transparent
    }
    val tint = when {
        isFocused -> Color.White
        isActive  -> PurplePalette.Purple300
        else      -> PurplePalette.Fg3
    }

    Surface(
        onClick = onSelect,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = if (expanded) 14.dp else 0.dp, vertical = 4.dp),
        shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = bg,
            focusedContainerColor = PurplePalette.Purple400,
            contentColor = tint,
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = if (expanded) 22.dp else 0.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = if (expanded) Arrangement.spacedBy(22.dp) else Arrangement.Center,
        ) {
            Icon(destination.icon, contentDescription = destination.label, tint = tint, modifier = Modifier.size(28.dp))
            if (expanded) {
                Text(destination.label, style = LocalPurpleType.current.button.copy(color = tint))
            }
        }
    }
}

@Composable
private fun TrialBadge(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .background(
                PurplePalette.Purple400.copy(alpha = 0.12f),
                PurpleShapes.Md,
            )
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Timer, contentDescription = null, tint = PurplePalette.Purple300, modifier = Modifier.size(18.dp))
        Row {
            Text("Trial: ", style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2))
            Text(
                "3 day(s)",
                style = LocalPurpleType.current.bodySmall.copy(
                    color = PurplePalette.Purple300,
                    fontWeight = FontWeight.Bold,
                ),
            )
        }
    }
}

/**
 * The right-aligned global top chrome: trial, clock, user.
 * Sits over the hero on Home and over the page bg on detail / browse.
 */
@Composable
fun TopChrome(
    time: String = "18:00",
    user: String = "TRIAL",
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(72.dp)
            .padding(horizontal = PurpleSpacing.TvSafeX),
        horizontalArrangement = Arrangement.End,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Outlined.Timer, contentDescription = null, tint = PurplePalette.Purple300, modifier = Modifier.size(18.dp))
                Text("Trial · 3 days", style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Purple300))
            }
            Divider()
            Text(time, style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3))
            Divider()
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Person, contentDescription = null, tint = PurplePalette.Fg3, modifier = Modifier.size(18.dp))
                Text(user, style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3))
            }
        }
    }
}

@Composable
private fun Divider() {
    Box(
        Modifier
            .height(18.dp)
            .width(1.dp)
            .background(Color.White.copy(alpha = 0.15f)),
    )
}
