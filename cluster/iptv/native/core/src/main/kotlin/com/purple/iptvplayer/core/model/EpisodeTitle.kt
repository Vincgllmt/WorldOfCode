package com.purple.iptvplayer.core.model

/**
 * Nettoyage du titre d'un épisode.
 *
 * Les fournisseurs préfixent presque toujours le nom de la série au titre de chaque
 * épisode : `A Shop for Killers Épisode 1`. Répété sur toute une saison, le vrai titre
 * se retrouve noyé en fin de ligne.
 *
 * Vit dans `core` et non dans une UI : la version TV portait déjà ce nettoyage (§21),
 * le mobile ne l'a jamais eu. Une logique dupliquée dans les deux présentations
 * finit toujours par diverger — c'est ce qui a produit le défaut du §28.
 */
object EpisodeTitle {

    private val SEPARATORS = charArrayOf(' ', ':', '-', '–', '—', ' ', '.', '|')

    /**
     * Retire le nom de la série en tête du titre, s'il y figure.
     *
     * Repli sur le titre d'origine si le retrait ne laisse rien : un épisode peut
     * légitimement porter le nom de la série.
     */
    fun stripSeriesName(title: String, seriesName: String): String {
        val cleaned = title.trim()
        if (seriesName.isBlank()) return cleaned
        if (!cleaned.startsWith(seriesName.trim(), ignoreCase = true)) return cleaned
        return cleaned.drop(seriesName.trim().length)
            .trimStart(*SEPARATORS)
            .ifBlank { cleaned }
    }

    /**
     * Identifiant sous lequel la progression d'un épisode est enregistrée.
     *
     * Ce format était réécrit à la main à **huit endroits** dans les deux UI. Il ne
     * vit plus qu'ici : lecture et écriture ne peuvent plus diverger.
     */
    fun progressId(seriesId: Int, episodeId: Int): String = "${seriesId}_${episodeId}"
}
