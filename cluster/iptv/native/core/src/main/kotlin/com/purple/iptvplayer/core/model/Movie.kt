package com.purple.iptvplayer.core.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Movie(
    val id: Int,
    val name: String,
    val url: String,
    val cover: String? = null,
    val group: String? = null,
    val rating: String? = null,
)

@JsonClass(generateAdapter = true)
data class MovieDetail(
    val id: Int,
    val name: String,
    val url: String,
    val cover: String? = null,
    val coverBig: String? = null,
    val description: String? = null,
    val duration: String? = null,
    val genre: String? = null,
    val cast: String? = null,
    val director: String? = null,
    val year: String? = null,
    val rating: String? = null,
)
