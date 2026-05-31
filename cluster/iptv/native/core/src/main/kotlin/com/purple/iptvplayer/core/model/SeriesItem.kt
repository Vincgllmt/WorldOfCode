package com.purple.iptvplayer.core.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class SeriesItem(
    val id: Int,
    val name: String,
    val cover: String? = null,
    val group: String? = null,
    val rating: String? = null,
)

@JsonClass(generateAdapter = true)
data class SeriesDetail(
    val id: Int,
    val name: String,
    val cover: String? = null,
    val plot: String? = null,
    val seasons: Map<String, List<Episode>> = emptyMap(),
)

@JsonClass(generateAdapter = true)
data class Episode(
    val id: Int,
    val title: String,
    val season: Int,
    val episodeNum: Int,
    val url: String,
    val plot: String? = null,
    val cover: String? = null,
    val duration: String? = null,
)
