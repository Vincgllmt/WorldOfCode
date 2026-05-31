package com.purple.iptvplayer.tv.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.LocalContentColor
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

// ── Brand Palette ─────────────────────────────────────────────────────────────

object PurplePalette {
    val Purple50  = Color(0xFFF5ECFF)
    val Purple100 = Color(0xFFE7D4FF)
    val Purple200 = Color(0xFFD2B0FF)
    val Purple300 = Color(0xFFBF8FFF)
    val Purple400 = Color(0xFFB36BFC)  // primary CTA, focus, brand
    val Purple500 = Color(0xFFA855F7)
    val Purple600 = Color(0xFF8C3DE8)  // pressed
    val Purple700 = Color(0xFF6B22C0)

    val Bg0 = Color(0xFF0B0414)   // page floor / sidebar
    val Bg1 = Color(0xFF14082A)   // default screen background
    val Bg2 = Color(0xFF1B0E36)   // card surface
    val Bg3 = Color(0xFF251548)   // focused / hover
    val Bg4 = Color(0xFF2F1A57)   // selected row

    val Fg1 = Color(0xFFFFFFFF)
    val Fg2 = Color(0xC7FFFFFF)   // 78 %
    val Fg3 = Color(0x8CFFFFFF)   // 55 %
    val Fg4 = Color(0x52FFFFFF)   // 32 %
    val FgOnPrimary = Color(0xFFFFFFFF)

    val Line1 = Color(0x14FFFFFF)   // 8 % white — divider
    val Line2 = Color(0x73B36BFC)   // 45 % lavender — focus outline

    val Live    = Color(0xFFFF3B30)
    val Rating  = Color(0xFFFFC53D)
    val Success = Color(0xFF34D399)
    val Danger  = Color(0xFFFF5A5F)
}

// ── Backward-compat aliases (used by files not yet rewritten) ─────────────────

val TvPurple      = PurplePalette.Purple400
val TvPurpleGlow  = PurplePalette.Purple300
val TvBgApp       = PurplePalette.Bg1
val TvBgCard      = PurplePalette.Bg2
val TvBgHome      = PurplePalette.Bg1
val TvBgSurface   = PurplePalette.Bg3
val TvTextPrimary = PurplePalette.Fg1
val TvTextSub     = PurplePalette.Fg3
val TvBorder      = PurplePalette.Line1
val TvColorError  = PurplePalette.Danger
val TvColorGold   = PurplePalette.Rating

// ── Motion ────────────────────────────────────────────────────────────────────

object PurpleMotion {
    val EaseOutQuint = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    val EaseInOut    = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)
    const val DurationFast   = 120
    const val DurationBase   = 200
    const val DurationFocus  = 160
    const val DurationPage   = 240
    const val DurationHero   = 420
    const val HeroIntervalMs = 7_000L
    const val FocusScale     = 1.08f
    const val PressScale     = 0.96f
}

// ── Shapes ────────────────────────────────────────────────────────────────────

object PurpleShapes {
    val Xs   = RoundedCornerShape(6.dp)
    val Sm   = RoundedCornerShape(10.dp)
    val Md   = RoundedCornerShape(14.dp)
    val Lg   = RoundedCornerShape(18.dp)
    val Xl   = RoundedCornerShape(24.dp)
    val Pill = RoundedCornerShape(percent = 50)
}

// ── Spacing ───────────────────────────────────────────────────────────────────

object PurpleSpacing {
    val Xxs     = 4.dp
    val Xs      = 8.dp
    val Sm      = 12.dp
    val Md      = 16.dp
    val Lg      = 20.dp
    val Xl      = 24.dp
    val Xxl     = 32.dp
    val Section = 48.dp
    val TvSafeX = 96.dp
    val TvSafeY = 54.dp
}

// ── Typography ────────────────────────────────────────────────────────────────

@Immutable
data class PurpleType(
    val heroTitle:     TextStyle,
    val h1:            TextStyle,
    val h2:            TextStyle,
    val h3:            TextStyle,
    val body:          TextStyle,
    val bodySmall:     TextStyle,
    val meta:          TextStyle,
    val capsLabel:     TextStyle,
    val brandWordmark: TextStyle,
    val button:        TextStyle,
)

val DefaultPurpleType = PurpleType(
    heroTitle = TextStyle(
        fontFamily    = FontFamily.Default,
        fontWeight    = FontWeight.ExtraBold,
        fontSize      = 36.sp,
        lineHeight    = 40.sp,
        letterSpacing = (-0.02).em,
    ),
    h1 = TextStyle(
        fontFamily    = FontFamily.Default,
        fontWeight    = FontWeight.Bold,
        fontSize      = 26.sp,
        lineHeight    = 30.sp,
        letterSpacing = (-0.01).em,
    ),
    h2 = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize   = 20.sp,
        lineHeight = 24.sp,
    ),
    h3 = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize   = 17.sp,
        lineHeight = 22.sp,
    ),
    body = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize   = 15.sp,
        lineHeight = 22.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize   = 13.sp,
        lineHeight = 18.sp,
    ),
    meta = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize   = 13.sp,
        lineHeight = 13.sp,
    ),
    capsLabel = TextStyle(
        fontFamily    = FontFamily.Default,
        fontWeight    = FontWeight.SemiBold,
        fontSize      = 11.sp,
        lineHeight    = 11.sp,
        letterSpacing = 0.10.em,
    ),
    brandWordmark = TextStyle(
        fontFamily    = FontFamily.Default,
        fontWeight    = FontWeight.ExtraBold,
        fontSize      = 16.sp,
        lineHeight    = 16.sp,
        letterSpacing = 0.02.em,
    ),
    button = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize   = 15.sp,
        lineHeight = 15.sp,
    ),
)

val LocalPurpleType = staticCompositionLocalOf { DefaultPurpleType }

// ── Theme ─────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PurpleIptvTvTheme(content: @Composable () -> Unit) {
    val colors = darkColorScheme(
        primary            = PurplePalette.Purple400,
        onPrimary          = PurplePalette.FgOnPrimary,
        primaryContainer   = PurplePalette.Purple600,
        onPrimaryContainer = PurplePalette.FgOnPrimary,
        secondary          = PurplePalette.Purple300,
        onSecondary        = PurplePalette.Bg1,
        background         = PurplePalette.Bg1,
        onBackground       = PurplePalette.Fg1,
        surface            = PurplePalette.Bg2,
        onSurface          = PurplePalette.Fg1,
        surfaceVariant     = PurplePalette.Bg3,
        onSurfaceVariant   = PurplePalette.Fg2,
        error              = PurplePalette.Danger,
        onError            = PurplePalette.FgOnPrimary,
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
