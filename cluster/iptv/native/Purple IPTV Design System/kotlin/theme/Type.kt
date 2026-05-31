package com.purpleiptv.tv.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.em
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf

/**
 * Typography. The production font is unknown — Poppins is the working
 * substitute (closest geometric sans we identified). Swap to whatever
 * the production app actually ships once that's resolved.
 *
 * Drop Poppins TTFs in `res/font/poppins_{weight}.ttf` and the resource
 * resolver will pick them up. Until then this falls back to Roboto.
 */
val PoppinsFamily: FontFamily = FontFamily.Default
    // Replace with: FontFamily(
    //     Font(R.font.poppins_regular, FontWeight.Normal),
    //     Font(R.font.poppins_medium,  FontWeight.Medium),
    //     Font(R.font.poppins_semibold,FontWeight.SemiBold),
    //     Font(R.font.poppins_bold,    FontWeight.Bold),
    //     Font(R.font.poppins_extrabold, FontWeight.ExtraBold),
    // )

/** Floor: never go below these on a TV screen. */
@Immutable
data class PurpleType(
    val heroTitle:  TextStyle,
    val display:    TextStyle,
    val h1:         TextStyle,
    val h2:         TextStyle,
    val h3:         TextStyle,
    val body:       TextStyle,
    val bodySmall:  TextStyle,
    val meta:       TextStyle,
    val capsLabel:  TextStyle,
    val brandWordmark: TextStyle,
    val button:     TextStyle,
)

val DefaultPurpleType = PurpleType(
    heroTitle = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 64.sp,
        lineHeight = (64 * 0.95).sp,
        letterSpacing = (-0.04).em,
    ),
    display = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 56.sp,
        lineHeight = (56 * 1.05).sp,
        letterSpacing = (-0.02).em,
    ),
    h1 = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 44.sp,
        lineHeight = (44 * 1.1).sp,
        letterSpacing = (-0.02).em,
    ),
    h2 = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = (32 * 1.2).sp,
    ),
    h3 = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 26.sp,
        lineHeight = (26 * 1.3).sp,
    ),
    body = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 22.sp,
        lineHeight = (22 * 1.5).sp,
    ),
    bodySmall = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 18.sp,
        lineHeight = (18 * 1.5).sp,
    ),
    meta = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.Medium,
        fontSize = 18.sp,
        lineHeight = 18.sp,
    ),
    /** All-caps eyebrow: signature treatment for section labels. */
    capsLabel = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.14.em,
    ),
    brandWordmark = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 22.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.02.em,
    ),
    button = TextStyle(
        fontFamily = PoppinsFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 22.sp,
        letterSpacing = 0.2.sp,
    ),
)

val LocalPurpleType = staticCompositionLocalOf { DefaultPurpleType }
