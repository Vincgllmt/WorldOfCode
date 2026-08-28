package com.purple.iptvplayer.core.data

/** Sens d'un déplacement dans « Ma liste ». */
enum class MoveDirection { UP, DOWN }

/**
 * Déplacement d'un favori **par identité**, jamais par index d'affichage.
 *
 * ⚠️ **Le défaut que cet objet supprime (#90).** L'écran n'affiche que les favoris
 * qu'il a su résoudre dans le catalogue ; la liste persistée, elle, garde aussi les
 * orphelins — un favori est stocké **par nom**, et les correctifs P3/P7 ont changé les
 * noms nettoyés, donc tout favori posé avant eux est orphelin. Deux référentiels
 * d'index coexistaient : l'UI passait l'index de la liste résolue, `core` l'appliquait
 * à la liste persistée.
 *
 * Exemple mesuré : persistés `[A, B, C]`, `A` absent du catalogue ⇒ l'écran montre
 * `[B, C]`. « Descendre » sur `B` envoyait `move(0, 1)`, ce qui déplaçait **`A`**
 * derrière `B`. L'affichage ne bougeait pas, l'ordre persisté était corrompu, et
 * l'utilisateur retouchait jusqu'à obtenir n'importe quoi.
 *
 * La règle est donc : **aucun index ne traverse la frontière UI/core.** L'appelant
 * donne une identité et un sens ; la traduction vers la liste persistée se fait ici,
 * et se teste ici — cette décision était écrite une fois par UI (règle 1).
 */
object FavoritesOrder {

    /**
     * Déplace [id] d'un cran dans [ids], en ne comptant que les entrées de [resolved].
     *
     * Le voisin visé est le **prochain favori résolu** dans le sens demandé : les
     * orphelins traversés gardent leur place relative, et le résultat visible à
     * l'écran est bien un déplacement d'exactement un cran.
     *
     * Rend [ids] inchangée si l'identité est inconnue, non résolue, ou déjà à
     * l'extrémité — l'UI peut émettre un geste périmé si la liste change sous elle.
     */
    fun move(
        ids: List<String>,
        id: String,
        direction: MoveDirection,
        resolved: Set<String>,
    ): List<String> {
        val from = ids.indexOf(id)
        if (from < 0 || id !in resolved) return ids

        val voisins = when (direction) {
            MoveDirection.UP   -> (from - 1) downTo 0
            MoveDirection.DOWN -> (from + 1)..ids.lastIndex
        }
        val to = voisins.firstOrNull { ids[it] in resolved } ?: return ids
        return FavoritesCodec.move(ids, from, to)
    }
}
