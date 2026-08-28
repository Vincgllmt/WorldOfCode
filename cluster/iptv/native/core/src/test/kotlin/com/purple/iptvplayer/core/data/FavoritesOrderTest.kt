package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * #90 — le déplacement d'un favori doit porter sur l'identité, pas sur l'index
 * affiché. Le premier test est celui qui échouait : avec un orphelin en tête, l'ancien
 * chemin `move(indexAffiché, indexAffiché ± 1)` déplaçait la mauvaise chaîne.
 */
class FavoritesOrderTest {

    private val persistes = listOf("A", "B", "C")

    /** Le cas du défaut : `A` n'est plus au catalogue, l'écran ne montre que `[B, C]`. */
    @Test
    fun `descendre le premier visible saute l'orphelin qui le precede`() {
        val resultat = FavoritesOrder.move(persistes, "B", MoveDirection.DOWN, setOf("B", "C"))
        // Attendu : B passe derrière C. Visible : [C, B].
        assertEquals(listOf("A", "C", "B"), resultat)
        assertEquals(listOf("C", "B"), resultat.filter { it in setOf("B", "C") })
    }

    /**
     * Le terme de comparaison, figé ici pour qu'on ne le reperde pas : l'ancien chemin
     * passait l'index **affiché** à [FavoritesCodec.move]. Sur le même geste — descendre
     * `B`, index affiché 0 — il déplaçait `A`, et l'écran ne bougeait pas.
     */
    @Test
    fun `l'ancien chemin par index affiche deplacait la mauvaise chaine`() {
        val ancien = FavoritesCodec.move(persistes, 0, 1)
        assertEquals(listOf("B", "A", "C"), ancien)
        // Visible avant : [B, C]. Visible après : [B, C] — inchangé, alors que
        // l'utilisateur vient de demander un déplacement.
        assertEquals(listOf("B", "C"), ancien.filter { it in setOf("B", "C") })
    }

    /** Le symétrique : remonter le dernier visible. */
    @Test
    fun `remonter un visible saute l'orphelin qui le precede`() {
        val resultat = FavoritesOrder.move(persistes, "C", MoveDirection.UP, setOf("B", "C"))
        assertEquals(listOf("A", "C", "B"), resultat)
    }

    /** Un orphelin **au milieu** ne doit pas absorber le déplacement. */
    @Test
    fun `un orphelin intercale est traverse, pas deplace`() {
        val ids = listOf("B", "X", "C")
        val resultat = FavoritesOrder.move(ids, "B", MoveDirection.DOWN, setOf("B", "C"))
        assertEquals(listOf("X", "C", "B"), resultat)
        assertEquals(listOf("C", "B"), resultat.filter { it in setOf("B", "C") })
    }

    /** Sans orphelin, le comportement reste celui d'un déplacement d'un cran. */
    @Test
    fun `sans orphelin le deplacement reste d'un cran`() {
        val tous = setOf("A", "B", "C")
        assertEquals(listOf("B", "A", "C"), FavoritesOrder.move(persistes, "A", MoveDirection.DOWN, tous))
        assertEquals(listOf("A", "C", "B"), FavoritesOrder.move(persistes, "C", MoveDirection.UP, tous))
    }

    /** Aux extrémités **visibles**, rien ne bouge — même s'il reste des orphelins au-delà. */
    @Test
    fun `aux extremites visibles la liste ne bouge pas`() {
        val resolus = setOf("B", "C")
        assertEquals(persistes, FavoritesOrder.move(persistes, "B", MoveDirection.UP, resolus))
        assertEquals(persistes, FavoritesOrder.move(persistes, "C", MoveDirection.DOWN, resolus))
    }

    /** Un geste périmé — identité inconnue ou non résolue — ne casse rien. */
    @Test
    fun `une identite inconnue ou non resolue laisse la liste intacte`() {
        assertEquals(persistes, FavoritesOrder.move(persistes, "Z", MoveDirection.DOWN, setOf("A", "B", "C")))
        assertEquals(persistes, FavoritesOrder.move(persistes, "A", MoveDirection.DOWN, setOf("B", "C")))
    }
}
