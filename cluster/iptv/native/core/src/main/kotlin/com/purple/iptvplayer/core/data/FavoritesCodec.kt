package com.purple.iptvplayer.core.data

import org.json.JSONArray

/**
 * Sérialisation des favoris, **dans l'ordre choisi par l'utilisateur**.
 *
 * Les favoris étaient persistés en `stringSetPreferencesKey`. Un `Set` ne porte
 * aucun ordre : l'écran les affichait donc dans l'ordre du catalogue du
 * fournisseur — mesuré sur appareil, ce n'était ni l'ordre d'ajout ni un ordre
 * choisi, et il changeait si le fournisseur réordonnait son catalogue.
 *
 * DataStore Preferences n'ayant pas de type liste, l'ordre est encodé en JSON,
 * comme [RecentItemsCodec] le fait déjà pour la reprise de lecture.
 *
 * Comme lui, ce décodage est lu depuis un `Flow` exposé à l'UI : une exception
 * remonterait à tous les collecteurs et crasherait l'écran, la valeur fautive
 * restant en base. Il doit **toujours dégrader, jamais lever** (cf. §2, règle 5).
 */
object FavoritesCodec {

    fun encode(ids: List<String>): String =
        JSONArray().apply { ids.forEach { put(it) } }.toString()

    /**
     * @param json contenu persisté, `null` si la clé n'existe pas encore.
     */
    fun decode(json: String?): List<String> {
        if (json.isNullOrBlank()) return emptyList()

        // Niveau 1 — document illisible (écriture interrompue, format inattendu) :
        // on repart d'une liste vide plutôt que de lever.
        val arr = runCatching { JSONArray(json) }.getOrNull() ?: return emptyList()

        // Niveau 2 — entrée isolée invalide : on l'écarte sans perdre les saines.
        // `distinct()` protège d'un doublon qu'un `Set` rendait impossible par
        // construction et qui afficherait deux fois la même chaîne.
        return (0 until arr.length())
            .mapNotNull { i -> runCatching { arr.getString(i) }.getOrNull() }
            .filter { it.isNotBlank() }
            .distinct()
    }

    /**
     * Reprend les favoris de l'ancien `Set`.
     *
     * Trié alphabétiquement : c'est le seul ordre initial **reproductible**. Reprendre
     * l'itération du `Set` donnerait un ordre de hachage, différent d'un appareil à
     * l'autre et instable entre deux exécutions.
     */
    fun fromLegacySet(legacy: Set<String>): List<String> =
        legacy.filter { it.isNotBlank() }.sorted()

    /**
     * Déplace l'élément [from] à la position [to].
     *
     * Un index hors bornes rend la liste inchangée : pendant un glisser-déposer,
     * l'UI peut émettre un index périmé si la liste change sous elle.
     */
    fun move(ids: List<String>, from: Int, to: Int): List<String> {
        if (from !in ids.indices || to !in ids.indices || from == to) return ids
        return ids.toMutableList().apply { add(to, removeAt(from)) }
    }
}
