package com.purple.iptvplayer.core.network

import com.purple.iptvplayer.core.model.ContentType
import com.purple.iptvplayer.core.model.M3uItem

object M3uParserService {

    private const val UNKNOWN_NAME = "Unknown"

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
                    currentName  = extractDisplayName(line)
                    currentLogo  = logoRegex.find(line)?.groupValues?.get(1)
                    currentGroup = groupRegex.find(line)?.groupValues?.get(1)?.decodeIfNeeded()
                }
                line.isNotEmpty() && !line.startsWith("#") -> {
                    if (currentName != null) {
                        // `/series/` est testé en premier : les épisodes sont presque
                        // toujours servis en .mp4/.mkv et seraient sinon classés en film.
                        val type = when {
                            line.contains("/series/") -> ContentType.SERIES
                            line.contains("/movie/") || line.endsWith(".mp4") || line.endsWith(".mkv") -> ContentType.MOVIE
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
        // §109 — unicité par URL : une playlist malformée ou concaténée peut
        // contenir plusieurs fois la même entrée.
        return items.distinctBy { it.url }
    }

    /**
     * Nom affiché d'une ligne `#EXTINF`.
     *
     * Le nom est tout ce qui suit la première virgule placée **hors guillemets** :
     * une recherche par la fin tronquerait « Canal+, Le Sport » en « Le Sport », et
     * une recherche de la première virgule tout court se ferait piéger par un
     * attribut du type `group-title="Sports, Live"`.
     */
    private fun extractDisplayName(line: String): String {
        val raw = displayNamePart(line)?.trim()?.decodeIfNeeded()
        return if (raw.isNullOrEmpty()) UNKNOWN_NAME else raw
    }

    private fun displayNamePart(line: String): String? {
        var inQuotes = false
        for (i in line.indices) {
            when {
                line[i] == '"' -> inQuotes = !inQuotes
                line[i] == ',' && !inQuotes -> return line.substring(i + 1)
            }
        }
        return null
    }

    private fun String.decodeIfNeeded(): String = runCatching {
        if (none { it.code > 127 }) return this
        // Chars > U+00FF are already valid Unicode (emoji, Arabic, …) — don't corrupt them
        if (any { it.code > 255 }) return this
        String(toByteArray(Charsets.ISO_8859_1), Charsets.UTF_8)
    }.getOrDefault(this)
}
