package com.purple.iptvplayer.tv.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.ClickableSurfaceDefaults
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
    /**
     * Contenu posé **sur un fond d'accent** — G10.
     *
     * Il valait blanc, et surtout presque personne ne le lisait : les composants codaient
     * `Fg1` en dur pendant que `focusedContainerColor` passait à `Purple400`. Mesuré au
     * pixel : blanc sur `Bg2` = **18,06 : 1** au repos, blanc sur `#B36BFC` = **3,27 : 1**
     * au focus. L'élément désigné devenait le moins lisible de l'écran — l'inverse de ce
     * qu'il faut à trois mètres.
     *
     * En sombre sur le même lavande : **6,00 : 1** — au-dessus du seuil WCAG AA (4,5), et
     * c'est le plafond praticable : `#0B0414`, presque noir, ne monte qu'à 6,17. Le
     * remplissage — l'identité du produit — ne bouge pas ; seul le contenu s'inverse.
     *
     * ⚠️ **Ne vaut que sur l'accent *clair*.** Sur `Purple600` (état pressé, plus sombre),
     * ce jeton retombe à **3,68 : 1** alors que le blanc y donne 5,32. Le contenu doit
     * suivre la clarté du fond, pas être uniforme — cf. [TvSurfaceDefaults.onAccent].
     */
    val FgOnPrimary = Color(0xFF12061F)

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

// ── Surfaces focalisables ─────────────────────────────────────────────────────

/**
 * Jeux de couleurs partagés des `Surface` TV.
 *
 * La décision « quel contenu sur un fond d'accent » ne doit exister qu'à **un seul**
 * endroit (§8.2) : elle était écrite composant par composant, et aucun ne la faisait
 * suivre l'état de focus.
 *
 * `androidx.tv.material3.Surface` publie sa couleur de contenu dans `LocalContentColor`
 * selon l'état d'interaction : il suffit de déclarer `focusedContentColor` et de laisser
 * les `Text`/`Icon` en hériter, au lieu de coder `Fg1`.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
object TvSurfaceDefaults {

    /** Ligne ou carte qui se remplit d'accent au focus. */
    @Composable
    fun onAccent(
        containerColor: Color = PurplePalette.Bg2,
        contentColor: Color = PurplePalette.Fg1,
    ) = androidx.tv.material3.ClickableSurfaceDefaults.colors(
        containerColor        = containerColor,
        contentColor          = contentColor,
        focusedContainerColor = PurplePalette.Purple400,
        // Accent CLAIR → contenu sombre : 6,00 : 1 au lieu de 3,27.
        focusedContentColor   = PurplePalette.FgOnPrimary,
        pressedContainerColor = PurplePalette.Purple600,
        // Accent SOMBRE → contenu clair : 5,32 : 1. Garder le jeton sombre ici le ferait
        // tomber à 3,68 — un uniforme aurait dégradé l'état pressé en corrigeant le focus.
        pressedContentColor   = PurplePalette.Fg1,
    )
}

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
    // M3 — 34 des 64 tailles de police étaient sous 14 sp. Le minimum Android TV est
    // 12 sp, la recommandation pour du texte courant 18 sp ; seules 6 valeurs sur 64
    // l'atteignaient. Le socle est relevé ici, les littéraux au fil des écrans.
    body = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize   = 18.sp,
        lineHeight = 26.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize   = 15.sp,
        lineHeight = 21.sp,
    ),
    meta = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize   = 14.sp,
        lineHeight = 16.sp,
    ),
    capsLabel = TextStyle(
        fontFamily    = FontFamily.Default,
        fontWeight    = FontWeight.SemiBold,
        fontSize      = 12.sp,          // plancher Android TV
        lineHeight    = 14.sp,
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

/**
 * Micro-étiquette — badges LIVE, FILM, SÉRIE, BEST DEAL.
 *
 * Plancher Android TV : **12 sp**. Les badges de « Ma liste » étaient à 8 sp, soit 16 px de
 * haut sur un écran 1080p ; ceux du paywall et du lecteur à 10 sp.
 */
val TvBadgeText = TextStyle(
    fontFamily    = FontFamily.Default,
    fontWeight    = FontWeight.Black,
    fontSize      = 12.sp,
    lineHeight    = 14.sp,
    letterSpacing = 0.08.em,
)

/** Plancher absolu de l'interface TV. Aucun style ne doit descendre en dessous. */
val TvMinFontSize = 12.sp

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
