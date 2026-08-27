package com.purple.iptvplayer.core

/**
 * Normalisation des clés de thème / genre.
 *
 * Les fournisseurs livrent des groupes avec des espaces irréguliers, et les
 * comparaisons doivent être insensibles à la casse. Trois écritures de la
 * même normalisation vivaient dans `TvMoviesScreen` (§41) ; elles ne vivent
 * plus que ici.
 */
object GenrePolicy {

    /** Clé utilisable pour un `groupBy` : trimme, jamais `null`. */
    fun key(group: String?): String = group?.trim() ?: ""

    /** Clé de tri insensible à la casse. */
    fun sortKey(group: String?): String = key(group).lowercase()

    /**
     * Liste des thèmes uniques et normalisés, triée alphabétiquement.
     *
     * Remplace `mapNotNull { it.group }.distinct().sorted()`.
     */
    fun distinctSorted(groups: List<String?>): List<String> =
        groups.mapNotNull { it?.trim()?.takeIf { g -> g.isNotEmpty() } }
            .distinct()
            .sortedBy { it.lowercase() }

    /**
     * Groupe une collection par thème normalisé, puis trie les groupes :
     * favoris en premier, puis ordre alphabétique insensible à la casse.
     */
    fun <T> groupAndSort(
        items: List<T>,
        groupOf: (T) -> String?,
        favorites: Collection<String>,
    ): List<Pair<String, List<T>>> =
        items
            .filter { !groupOf(it).isNullOrBlank() }
            .groupBy { key(groupOf(it)!!) }
            .entries
            .sortedWith(
                compareBy(
                    { !favorites.contains(it.key) },
                    { sortKey(it.key) },
                ),
            )
            .map { it.key to it.value }
}
