package com.purpleiptv.tv.theme

import androidx.compose.animation.core.CubicBezierEasing

/**
 * Motion. Quick, confident, content-first. No bounces, no springs.
 *
 *  - Focus: scale 1 → 1.08 in ~160 ms with EaseOutQuint, plus glow.
 *  - Page transitions: 240 ms fade. No slides.
 *  - Hero crossfade: 7 s interval, 420 ms fade between.
 */
object PurpleMotion {
    val EaseOutQuint = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    val EaseInOut    = CubicBezierEasing(0.65f, 0f, 0.35f, 1f)

    const val DurationFast = 120
    const val DurationBase = 200
    const val DurationSlow = 380
    const val DurationFocus = 160
    const val DurationPage  = 240
    const val DurationHero  = 420
    const val HeroIntervalMs = 7_000L

    const val FocusScale = 1.08f
    const val PressScale = 0.96f
}
