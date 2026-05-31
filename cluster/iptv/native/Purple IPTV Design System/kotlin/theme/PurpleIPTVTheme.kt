package com.purpleiptv.tv.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.tv.material3.ColorScheme
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme
import androidx.tv.material3.LocalContentColor

/**
 * Wraps `androidx.tv.material3.MaterialTheme` with Purple IPTV tokens.
 *
 * Use everywhere as the root:
 * ```
 *     PurpleIPTVTheme {
 *         App()
 *     }
 * ```
 *
 * Inside the tree, call:
 *   - `PurplePalette.Purple400` etc. for brand colors
 *   - `LocalPurpleType.current.h1` etc. for typography
 *   - `PurpleShapes.Lg` for radii
 *   - `PurpleSpacing.Md` for spacing
 *
 * The MaterialTheme color scheme is also mapped onto the brand tokens
 * so any default Material components (Button, Card) inherit them too.
 */
@Composable
fun PurpleIPTVTheme(content: @Composable () -> Unit) {
    val colors: ColorScheme = darkColorScheme(
        primary               = PurplePalette.Purple400,
        onPrimary             = PurplePalette.FgOnPrimary,
        primaryContainer      = PurplePalette.Purple600,
        onPrimaryContainer    = PurplePalette.FgOnPrimary,
        secondary             = PurplePalette.Purple300,
        onSecondary           = PurplePalette.Bg1,
        background            = PurplePalette.Bg1,
        onBackground          = PurplePalette.Fg1,
        surface               = PurplePalette.Bg2,
        onSurface             = PurplePalette.Fg1,
        surfaceVariant        = PurplePalette.Bg3,
        onSurfaceVariant      = PurplePalette.Fg2,
        error                 = PurplePalette.Danger,
        onError               = PurplePalette.FgOnPrimary,
        border                = PurplePalette.Line1,
        borderVariant         = PurplePalette.Line2,
    )
    MaterialTheme(colorScheme = colors) {
        CompositionLocalProvider(
            LocalPurpleType provides DefaultPurpleType,
            LocalContentColor provides PurplePalette.Fg1,
        ) {
            content()
        }
    }
}
