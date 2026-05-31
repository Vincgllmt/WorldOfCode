package com.purpleiptv.tv.theme

import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape

/**
 * Spacing scale (4dp base). TV layouts get more breathing room.
 * Safe area is 10% horizontal / 5% vertical of the 1920×1080 frame
 * (so 96 dp x 54 dp on a "1dp = 1px" reference TV).
 */
object PurpleSpacing {
    val Xxs = 4.dp
    val Xs  = 8.dp
    val Sm  = 12.dp
    val Md  = 16.dp
    val Lg  = 20.dp
    val Xl  = 24.dp
    val Xxl = 32.dp
    val Xxxl = 40.dp
    val Section = 48.dp
    val SectionLg = 64.dp
    val SectionXl = 80.dp
    val SectionXxl = 96.dp

    val TvSafeX = 96.dp
    val TvSafeY = 54.dp
}

/**
 * Corner radii. Posters use Lg; chips Sm; pills/CTAs the "Pill" shape.
 */
object PurpleShapes {
    val Xs   = RoundedCornerShape(6.dp)
    val Sm   = RoundedCornerShape(10.dp)
    val Md   = RoundedCornerShape(14.dp)
    val Lg   = RoundedCornerShape(18.dp)
    val Xl   = RoundedCornerShape(24.dp)
    val Pill = RoundedCornerShape(percent = 50)
}
