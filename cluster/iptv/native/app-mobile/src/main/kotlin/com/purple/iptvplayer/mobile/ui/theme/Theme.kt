package com.purple.iptvplayer.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val IptvColorScheme = darkColorScheme(
    primary         = Purple,
    secondary       = PurpleDark,
    tertiary        = PurpleGlow,
    background      = BgApp,
    surface         = BgSurface,
    onPrimary       = TextPrimary,
    onSecondary     = TextPrimary,
    onBackground    = TextPrimary,
    onSurface       = TextPrimary,
    error           = ColorError,
)

@Composable
fun PurpleIptvTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = IptvColorScheme,
        content     = content,
    )
}
