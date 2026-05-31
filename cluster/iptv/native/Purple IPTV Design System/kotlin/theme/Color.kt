package com.purpleiptv.tv.theme

import androidx.compose.ui.graphics.Color

/**
 * Purple IPTV color tokens.
 * Direct ports of the CSS vars in colors_and_type.css.
 *
 *  Brand layer: a single vivid lavender. It does exactly three jobs —
 *  paint primary CTAs, paint focus / selection, paint the brand mark.
 *  Never appears in body copy, icons-not-selected, or large backgrounds.
 *
 *  Background layer: deep blue-purple, near-black. One step lighter per
 *  level of elevation.
 */
object PurplePalette {
    // ----- Brand · Lavender -----
    val Purple50  = Color(0xFFF5ECFF)
    val Purple100 = Color(0xFFE7D4FF)
    val Purple200 = Color(0xFFD2B0FF)
    val Purple300 = Color(0xFFBF8FFF)
    val Purple400 = Color(0xFFB36BFC)  // primary CTA, focus, brand
    val Purple500 = Color(0xFFA855F7)
    val Purple600 = Color(0xFF8C3DE8)  // pressed
    val Purple700 = Color(0xFF6B22C0)

    // ----- Background · Deep Violet -----
    val Bg0 = Color(0xFF0B0414)   // page floor
    val Bg1 = Color(0xFF14082A)   // default screen bg
    val Bg2 = Color(0xFF1B0E36)   // card surface
    val Bg3 = Color(0xFF251548)   // elevated / hover
    val Bg4 = Color(0xFF2F1A57)   // selected row

    // ----- Foreground -----
    val Fg1 = Color(0xFFFFFFFF)
    val Fg2 = Color(0xC7FFFFFF)   // 78%
    val Fg3 = Color(0x8CFFFFFF)   // 55%
    val Fg4 = Color(0x52FFFFFF)   // 32%
    val FgOnPrimary = Color(0xFFFFFFFF)

    // ----- Lines -----
    val Line1 = Color(0x14FFFFFF)             // 8% white — divider
    val Line2 = Color(0x73B36BFC)             // 45% lavender — focus outline
    val Line3 = Color(0xD9B36BFC)             // 85% lavender — pressed outline

    // ----- Semantic -----
    val Live     = Color(0xFFFF3B30)
    val Rating   = Color(0xFFFFC53D)
    val Success  = Color(0xFF34D399)
    val Warning  = Color(0xFFFBBF24)
    val Danger   = Color(0xFFFF5A5F)
    val Info     = Color(0xFF60A5FA)

    val SubtitleWhite  = Color(0xFFFFFFFF)
    val SubtitleYellow = Color(0xFFF2E028)
}
