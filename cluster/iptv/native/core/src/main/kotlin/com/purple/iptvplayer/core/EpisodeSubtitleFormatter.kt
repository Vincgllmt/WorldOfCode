package com.purple.iptvplayer.core

/**
 * Extraction du nom d'épisode depuis un sous-titre composite.
 *
 * Les fournisseurs livrent des sous-titres du type
 * `S1 E1 · Nom de l'épisode`. Seul le nom après le dernier séparateur
 * « · » doit être affiché dans les listes de téléchargements (§92).
 */
object EpisodeSubtitleFormatter {

    /**
     * Extrait la portion après le dernier « · ».
     *
     * @param subtitle texte composite, potentiellement `null`
     * @param title    titre de repli si `subtitle` est absent ou ne contient
     *                 pas de séparateur
     */
    fun extractEpisodeName(subtitle: String?, title: String): String =
        subtitle?.substringAfterLast("· ")?.trim() ?: title
}
