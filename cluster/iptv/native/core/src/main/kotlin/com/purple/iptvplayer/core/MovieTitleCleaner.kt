package com.purple.iptvplayer.core

/**
 * Nettoyage des titres de films.
 *
 * Les fournisseurs suffixent fréquemment l'année de sortie : « Dune - 2024 ».
 * La puce de date affiche déjà cette information ; le doublon alourdit la
 * ligne sans ajouter de valeur (§40).
 */
object MovieTitleCleaner {

    private val YEAR_SUFFIX = Regex("""\s*[-–]\s*(19|20)\d{2}$""")

    /** Retire le suffixe année, s'il existe. */
    fun clean(title: String): String = title.trim().replace(YEAR_SUFFIX, "")
}
