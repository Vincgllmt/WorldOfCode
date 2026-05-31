package com.purpleiptv.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleShapes

/**
 * The all-caps eyebrow label — the brand's signature treatment.
 * "FRANCE SPORT", "CONTINUE WATCHING", "FEATURED THIS WEEK".
 */
@Composable
fun CapsLabel(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = PurplePalette.Purple300,
) {
    Text(
        text = text.uppercase(),
        style = LocalPurpleType.current.capsLabel.copy(color = color),
        modifier = modifier,
    )
}

/** Neutral pill for metadata: year, duration, genre. */
@Composable
fun MetaChip(text: String, modifier: Modifier = Modifier, accent: Boolean = false) {
    val bg     = if (accent) PurplePalette.Purple400.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.06f)
    val border = if (accent) PurplePalette.Purple400.copy(alpha = 0.45f) else Color.White.copy(alpha = 0.06f)
    Box(
        modifier = modifier
            .background(bg, PurpleShapes.Sm)
            .border(1.dp, border, PurpleShapes.Sm)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(text, style = LocalPurpleType.current.meta.copy(color = PurplePalette.Fg1))
    }
}

/** Lavender star + value. Lives bottom-left of every poster. */
@Composable
fun RatingChip(value: Double, modifier: Modifier = Modifier) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = modifier
            .background(PurplePalette.Purple400, PurpleShapes.Xs)
            .padding(horizontal = 10.dp, vertical = 6.dp),
    ) {
        Icon(Icons.Default.Star, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
        Text(
            text = formatRating(value),
            style = LocalPurpleType.current.capsLabel.copy(color = Color.White, letterSpacing = androidx.compose.ui.unit.TextUnit.Unspecified),
        )
    }
}

private fun formatRating(value: Double): String {
    val s = value.toString()
    return if (s.length > 5) s.substring(0, 5) else s
}

/** "EN DIRECT" badge on live channels. */
@Composable
fun LiveBadge(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .background(PurplePalette.Purple400, PurpleShapes.Sm)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            "EN DIRECT",
            style = LocalPurpleType.current.capsLabel.copy(color = Color.White),
        )
    }
}
