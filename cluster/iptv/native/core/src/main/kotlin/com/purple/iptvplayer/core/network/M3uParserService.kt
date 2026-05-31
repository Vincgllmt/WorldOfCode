package com.purple.iptvplayer.core.network

import com.purple.iptvplayer.core.model.ContentType
import com.purple.iptvplayer.core.model.M3uItem

object M3uParserService {

    private val nameRegex  = Regex(""",([^,]*)$""")
    private val logoRegex  = Regex("""tvg-logo="([^"]*)"""")
    private val groupRegex = Regex("""group-title="([^"]*)"""")

    fun parse(content: String): List<M3uItem> {
        val items = mutableListOf<M3uItem>()
        var currentName: String? = null
        var currentLogo: String? = null
        var currentGroup: String? = null

        for (rawLine in content.lineSequence()) {
            val line = rawLine.trim()
            when {
                line.startsWith("#EXTINF:") -> {
                    currentName  = nameRegex.find(line)?.groupValues?.get(1)?.trim()?.decodeIfNeeded() ?: "Unknown"
                    currentLogo  = logoRegex.find(line)?.groupValues?.get(1)
                    currentGroup = groupRegex.find(line)?.groupValues?.get(1)?.decodeIfNeeded()
                }
                line.isNotEmpty() && !line.startsWith("#") -> {
                    if (currentName != null) {
                        val type = when {
                            line.contains("/movie/") || line.endsWith(".mp4") || line.endsWith(".mkv") -> ContentType.MOVIE
                            line.contains("/series/") -> ContentType.SERIES
                            else -> ContentType.LIVE
                        }
                        items += M3uItem(
                            name  = currentName,
                            url   = line,
                            logo  = currentLogo,
                            group = currentGroup,
                            type  = type,
                        )
                    }
                    currentName = null; currentLogo = null; currentGroup = null
                }
            }
        }
        return items
    }

    private fun String.decodeIfNeeded(): String = runCatching {
        if (none { it.code > 127 }) return this
        // Chars > U+00FF are already valid Unicode (emoji, Arabic, …) — don't corrupt them
        if (any { it.code > 255 }) return this
        String(toByteArray(Charsets.ISO_8859_1), Charsets.UTF_8)
    }.getOrDefault(this)
}
