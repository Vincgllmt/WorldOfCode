package com.purple.iptvplayer.core.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class EpgProgram(
    val title: String,
    val start: String,
    val end: String,
    val description: String? = null,
)
