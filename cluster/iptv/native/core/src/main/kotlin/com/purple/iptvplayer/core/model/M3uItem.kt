package com.purple.iptvplayer.core.model

data class M3uItem(
    val name: String,
    val url: String,
    val logo: String? = null,
    val group: String? = null,
    val type: ContentType,
)

enum class ContentType { LIVE, MOVIE, SERIES }
