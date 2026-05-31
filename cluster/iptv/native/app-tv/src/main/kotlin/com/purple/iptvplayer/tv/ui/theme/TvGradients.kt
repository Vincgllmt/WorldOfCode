package com.purple.iptvplayer.tv.ui.theme

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

fun cardGradient(seed: String): Brush {
    val palette = listOf(
        listOf(Color(0xFF2D1B69), Color(0xFF0D3B3B)),  // violet-sarcelle
        listOf(Color(0xFF6B1B1B), Color(0xFF2D0A45)),  // cramoisi
        listOf(Color(0xFF0A3D22), Color(0xFF1A0A4A)),  // forêt
        listOf(Color(0xFF5C2A00), Color(0xFF250A40)),  // ambre brûlé
        listOf(Color(0xFF0A2A4A), Color(0xFF1A0A45)),  // océan profond
        listOf(Color(0xFF4A3A00), Color(0xFF1A0A40)),  // or nuit
        listOf(Color(0xFF4A0A25), Color(0xFF0A0A3A)),  // rose crépuscule
        listOf(Color(0xFF003A3A), Color(0xFF1A0A4A)),  // sarcelle-violet
        listOf(Color(0xFF1A0A5C), Color(0xFF0A1A4A)),  // indigo
        listOf(Color(0xFF2A3A0A), Color(0xFF200A3A)),  // olive
        listOf(Color(0xFF3A1E00), Color(0xFF1A0A3A)),  // cuivre
        listOf(Color(0xFF0A2A1A), Color(0xFF1A0A45)),  // sauge
    )
    val hash = seed.hashCode()
    val idx  = ((hash % palette.size) + palette.size) % palette.size
    return Brush.linearGradient(
        colors = palette[idx],
        start  = Offset(0f, 0f),
        end    = Offset(Float.POSITIVE_INFINITY, Float.POSITIVE_INFINITY),
    )
}
