package com.purpleiptv.tv.model

import androidx.compose.runtime.Immutable

/**
 * Pure-data models that mirror the playlist / API shape.
 * No `@Composable` here — these are passed as state, not rendered.
 */

@Immutable
data class Movie(
    val id: String,
    val title: String,
    val year: Int,
    val rating: Double,
    val duration: String,
    val genres: List<String>,
    val director: String? = null,
    val plot: String? = null,
    /** Backdrop / hero artwork URL */
    val backdropUrl: String? = null,
    /** Portrait poster URL */
    val posterUrl: String? = null,
    /** Fallback gradient when artwork is missing */
    val accentColor: Long = 0xFF1B0E36L,
)

@Immutable
data class Series(
    val id: String,
    val title: String,
    val seasons: Int,
    val episodes: Int,
    val posterUrl: String? = null,
    val backdropUrl: String? = null,
    val accentColor: Long = 0xFF1B0E36L,
)

@Immutable
data class Channel(
    val id: String,
    val name: String,
    val group: String,
    val logoUrl: String? = null,
    val streamUrl: String,
    val nowPlayingTitle: String? = null,
    val nowPlayingStart: String? = null,
    val nowPlayingEnd: String? = null,
    val nowPlayingProgress: Float = 0f,
)

@Immutable
data class Genre(
    val name: String,
    val count: Int,
    val isSaved: Boolean = false,
)

@Immutable
data class ContinueWatchingItem(
    val id: String,
    val title: String,
    val subtitle: String,        // "Continue watching" or "S3 E5 · Trouble Coffee"
    val backdropUrl: String? = null,
    val accentColor: Long = 0xFF1B0E36L,
    val progress: Float = 0f,    // 0f..1f
    val isSeries: Boolean = false,
)

@Immutable
data class FeaturedHero(
    val movie: Movie,
    val tagline: String,
)
