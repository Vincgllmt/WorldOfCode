package com.purple.iptvplayer.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

/**
 * #109 — la propriété qui compte est l'**unicité**, pas la forme de la clé. Le premier
 * test est celui qui échouait : deux entrées M3U portant la même URL donnaient deux fois
 * la même clé, et Compose lève « Key … was used multiple times ».
 */
class ChannelKeyTest {

    private fun chaine(nom: String, url: String, groupe: String? = null) =
        Channel(name = nom, url = url, group = groupe)

    /** Le cas du défaut : doublon exact — même nom, même URL. */
    @Test
    fun `un doublon exact ne produit pas deux fois la meme cle`() {
        val liste = listOf(
            chaine("TF1", "http://x/1.ts"),
            chaine("TF1", "http://x/1.ts"),
        )
        val cles = ChannelKey.forList("live", liste)
        assertEquals(2, cles.distinct().size)
    }

    /** Le terme de comparaison, figé : l'ancienne clé collait sur ce même cas. */
    @Test
    fun `l'ancienne cle par URL collait sur un doublon`() {
        val liste = listOf(
            chaine("TF1", "http://x/1.ts"),
            chaine("TF1", "http://x/1.ts"),
        )
        val ancien = liste.map { "lrow_" + it.url }
        assertEquals(1, ancien.distinct().size)
    }

    /** Le même flux rangé dans deux thèmes : les deux lignes doivent coexister. */
    @Test
    fun `le meme flux dans deux themes reste affichable`() {
        val liste = listOf(
            chaine("beIN 1", "http://x/9.ts", "SPORT"),
            chaine("beIN 1", "http://x/9.ts", "FRANCE"),
        )
        assertEquals(2, ChannelKey.forList("live", liste).distinct().size)
    }

    /** Deux thèmes de la même `LazyColumn` ne doivent pas se marcher dessus au même rang. */
    @Test
    fun `deux portees ne collent pas au meme rang`() {
        val c = chaine("TF1", "http://x/1.ts")
        assertNotEquals(ChannelKey.of("live_SPORT", 0, c), ChannelKey.of("live_FRANCE", 0, c))
    }

    /** Une liste ordinaire garde des clés toutes distinctes. */
    @Test
    fun `une liste sans doublon reste entierement distincte`() {
        val liste = (1..50).map { chaine("C$it", "http://x/$it.ts") }
        val cles = ChannelKey.forList("live", liste)
        assertEquals(50, cles.distinct().size)
    }
}
