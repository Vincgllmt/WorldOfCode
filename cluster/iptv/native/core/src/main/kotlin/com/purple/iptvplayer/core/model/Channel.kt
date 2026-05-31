package com.purple.iptvplayer.core.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Channel(
    val name: String,
    val url: String,
    val logo: String? = null,
    val group: String? = null,
    val streamId: Int? = null,
    val epgId: String? = null,
)
