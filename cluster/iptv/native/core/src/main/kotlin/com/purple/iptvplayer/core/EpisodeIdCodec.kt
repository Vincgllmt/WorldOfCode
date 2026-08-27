package com.purple.iptvplayer.core

/**
 * Codec pour les identifiants d'épisode sous lesquels la progression est
 * enregistrée.
 *
 * L'encodage `${seriesId}_${episodeId}` était réécrit à la main à huit
 * endroits ; l'absence de décodeur officiel (§56) rendait impossible la
 * lecture cohérente de ces clés depuis n'importe quel module.
 */
object EpisodeIdCodec {

    /** Encode un couple `(seriesId, episodeId)` en clé de progression. */
    fun encode(seriesId: Int, episodeId: Int): String = "${seriesId}_${episodeId}"

    /**
     * Décode une clé de progression.
     *
     * @return le couple `(seriesId, episodeId)` ou `null` si le format est
     *   invalide.
     */
    fun decode(progressId: String): Pair<Int, Int>? {
        val parts = progressId.split("_")
        if (parts.size != 2) return null
        val seriesId = parts[0].toIntOrNull() ?: return null
        val episodeId = parts[1].toIntOrNull() ?: return null
        return seriesId to episodeId
    }
}
