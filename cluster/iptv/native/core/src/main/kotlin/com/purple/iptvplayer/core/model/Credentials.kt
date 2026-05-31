package com.purple.iptvplayer.core.model

enum class PlaylistType { XTREAM, M3U }

data class Credentials(
    val host: String,
    val user: String? = null,
    val pass: String? = null,
    val type: PlaylistType = PlaylistType.XTREAM,
) {
    val isXtream: Boolean get() = type == PlaylistType.XTREAM

    fun copyWithHost(newHost: String) = copy(host = newHost)

    companion object {
        fun parseUrl(raw: String): Credentials? = runCatching {
            val trimmed = raw.trim()
            val uri = android.net.Uri.parse(trimmed)
            val user = uri.getQueryParameter("username")
            val pass = uri.getQueryParameter("password")
            if (!user.isNullOrEmpty() && !pass.isNullOrEmpty()) {
                val port = if (uri.port != -1) ":${uri.port}" else ""
                val host = "${uri.scheme}://${uri.host}$port"
                return Credentials(host = host, user = user, pass = pass, type = PlaylistType.XTREAM)
            }
            val path = uri.path ?: ""
            if (path.endsWith(".m3u") || path.endsWith(".m3u8") || trimmed.contains("m3u")) {
                return Credentials(host = trimmed, type = PlaylistType.M3U)
            }
            null
        }.getOrNull()
    }
}
