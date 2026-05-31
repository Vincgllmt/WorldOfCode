package com.purple.iptvplayer.core.model

import com.squareup.moshi.JsonClass

enum class DownloadType   { MOVIE, EPISODE }
enum class DownloadStatus { QUEUED, DOWNLOADING, COMPLETED, FAILED }

@JsonClass(generateAdapter = true)
data class DownloadItem(
    val id:            String,
    val type:          DownloadType,
    val title:         String,
    val subtitle:      String?  = null,   // "S1 E3 · Episode title"
    val url:           String,
    val cover:         String?  = null,
    val seriesId:      Int?     = null,
    val seriesName:    String?  = null,
    val season:        Int?     = null,
    val episodeNum:    Int?     = null,
    val localPath:     String?  = null,
    val status:        DownloadStatus = DownloadStatus.QUEUED,
    val fileSizeBytes: Long     = 0L,
    val downloadedBytes: Long   = 0L,
) {
    val progress: Int
        get() = if (fileSizeBytes > 0) ((downloadedBytes.toFloat() / fileSizeBytes) * 100).toInt().coerceIn(0, 100) else 0
}
