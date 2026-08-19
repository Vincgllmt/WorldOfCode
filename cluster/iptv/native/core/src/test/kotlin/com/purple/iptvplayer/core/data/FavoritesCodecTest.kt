package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Ordre des favoris.
 *
 * Les favoris étaient persistés en `Set`, qui ne porte aucun ordre : l'écran les
 * affichait donc dans l'ordre du **catalogue du fournisseur**, ni celui d'ajout ni
 * un ordre choisi. Passer à une liste ordonnée impose un codec, et ce codec est lu
 * depuis un `Flow` exposé à l'UI : il doit **toujours dégrader, jamais lever**
 * (même exigence que [RecentItemsCodec], cf. P2).
 */
class FavoritesCodecTest {

    // ─── aller-retour ─────────────────────────────────────────────────────────

    @Test
    fun `l aller-retour preserve l ordre exact`() {
        val ids = listOf("Canal+", "TF1 HD", "Arte")
        assertEquals(ids, FavoritesCodec.decode(FavoritesCodec.encode(ids)))
    }

    @Test
    fun `une liste vide se code et se relit`() {
        assertEquals(emptyList<String>(), FavoritesCodec.decode(FavoritesCodec.encode(emptyList())))
    }

    @Test
    fun `un nom contenant guillemets et accents survit a l aller-retour`() {
        val ids = listOf("""FR | "Le Sport" — HD""", "Télé-Loisirs")
        assertEquals(ids, FavoritesCodec.decode(FavoritesCodec.encode(ids)))
    }

    // ─── décodage défensif ────────────────────────────────────────────────────

    @Test
    fun `une valeur absente donne une liste vide`() {
        assertEquals(emptyList<String>(), FavoritesCodec.decode(null))
    }

    @Test
    fun `un document illisible donne une liste vide, sans lever`() {
        assertEquals(emptyList<String>(), FavoritesCodec.decode("{ ceci n'est pas du JSON"))
    }

    @Test
    fun `une entree corrompue est ecartee sans perdre les saines`() {
        assertEquals(
            listOf("TF1", "Arte"),
            FavoritesCodec.decode("""["TF1", null, "", "   ", "Arte"]"""),
        )
    }

    @Test
    fun `les doublons sont ecartes, la premiere position gagne`() {
        assertEquals(
            listOf("TF1", "Arte"),
            FavoritesCodec.decode("""["TF1", "Arte", "TF1"]"""),
        )
    }

    // ─── migration depuis l'ancien Set ────────────────────────────────────────

    @Test
    fun `la migration d un Set produit un ordre stable et previsible`() {
        // Un Set n'a pas d'ordre : trier alphabétiquement est le seul choix
        // reproductible. Sans cela, l'ordre initial dépendrait du hachage.
        assertEquals(
            listOf("Arte", "Canal+", "TF1"),
            FavoritesCodec.fromLegacySet(setOf("TF1", "Arte", "Canal+")),
        )
    }

    @Test
    fun `la migration d un Set vide donne une liste vide`() {
        assertEquals(emptyList<String>(), FavoritesCodec.fromLegacySet(emptySet()))
    }

    // ─── réordonnancement ─────────────────────────────────────────────────────

    @Test
    fun `deplacer un element vers le bas le place a l index vise`() {
        assertEquals(
            listOf("B", "C", "A"),
            FavoritesCodec.move(listOf("A", "B", "C"), from = 0, to = 2),
        )
    }

    @Test
    fun `deplacer un element vers le haut le place a l index vise`() {
        assertEquals(
            listOf("C", "A", "B"),
            FavoritesCodec.move(listOf("A", "B", "C"), from = 2, to = 0),
        )
    }

    @Test
    fun `deplacer sur place ne change rien`() {
        assertEquals(
            listOf("A", "B", "C"),
            FavoritesCodec.move(listOf("A", "B", "C"), from = 1, to = 1),
        )
    }

    @Test
    fun `un index hors bornes laisse la liste intacte plutot que de lever`() {
        // L'UI peut émettre un index périmé si la liste change pendant le glissement.
        val l = listOf("A", "B", "C")
        assertEquals(l, FavoritesCodec.move(l, from = 5, to = 0))
        assertEquals(l, FavoritesCodec.move(l, from = 0, to = 9))
        assertEquals(l, FavoritesCodec.move(l, from = -1, to = 1))
    }

    @Test
    fun `deplacer dans une liste vide ne leve pas`() {
        assertEquals(emptyList<String>(), FavoritesCodec.move(emptyList(), from = 0, to = 0))
    }
}
