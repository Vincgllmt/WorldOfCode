package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Décodage de la liste « Reprendre la lecture ».
 *
 * Ces entrées sont exposées via un `Flow` collecté par l'UI : le décodage doit
 * dégrader silencieusement plutôt que lever, sans quoi une seule entrée corrompue
 * rend la fonctionnalité définitivement inutilisable — l'utilisateur ne pouvant
 * même plus réparer l'état, puisque l'écriture relit la liste avant de la mettre à jour.
 */
class RecentItemsCodecTest {

    private fun item(id: String, title: String = "Titre $id") = RecentItem(
        id = id,
        url = "http://host/$id.ts",
        title = title,
        cover = "http://host/$id.jpg",
        type = "movie",
        progress = 120_000L,
        duration = 5_400_000L,
        timestamp = 1_760_000_000_000L,
    )

    // ─── P2 : le décodage ne doit jamais lever ────────────────────────────────

    @Test
    fun `un json malforme rend une liste vide sans lever`() {
        assertEquals(emptyList<RecentItem>(), RecentItemsCodec.parse("{oops"))
    }

    @Test
    fun `une chaine vide rend une liste vide sans lever`() {
        assertEquals(emptyList<RecentItem>(), RecentItemsCodec.parse(""))
    }

    @Test
    fun `un json tronque rend une liste vide sans lever`() {
        // Écriture interrompue : le fichier s'arrête au milieu d'une entrée.
        val truncated = RecentItemsCodec.encode(listOf(item("1"))).dropLast(12)
        assertEquals(emptyList<RecentItem>(), RecentItemsCodec.parse(truncated))
    }

    @Test
    fun `une entree sans titre est ignoree et les autres sont conservees`() {
        // Cas typique d'une montée de version ayant modifié le schéma.
        val json = """
            [
              {"id":"1","url":"u1","title":"Film 1","cover":"c1","type":"movie","progress":1,"duration":2,"timestamp":3},
              {"id":"2","url":"u2","cover":"c2","type":"movie","progress":1,"duration":2,"timestamp":3},
              {"id":"3","url":"u3","title":"Film 3","cover":"c3","type":"movie","progress":1,"duration":2,"timestamp":3}
            ]
        """.trimIndent()

        val parsed = RecentItemsCodec.parse(json)

        assertEquals(listOf("1", "3"), parsed.map { it.id })
    }

    @Test
    fun `une entree au type invalide est ignoree et les autres sont conservees`() {
        val json = """
            [
              {"id":"1","url":"u1","title":"Film 1","cover":"c1","type":"movie","progress":"pas-un-nombre","duration":2,"timestamp":3},
              {"id":"2","url":"u2","title":"Film 2","cover":"c2","type":"movie","progress":1,"duration":2,"timestamp":3}
            ]
        """.trimIndent()

        assertEquals(listOf("2"), RecentItemsCodec.parse(json).map { it.id })
    }

    @Test
    fun `un element non objet est ignore`() {
        val json = """["chaine-parasite",{"id":"2","url":"u","title":"T","cover":"c","type":"movie","progress":1,"duration":2,"timestamp":3}]"""

        assertEquals(listOf("2"), RecentItemsCodec.parse(json).map { it.id })
    }

    // ─── Non-régression : le format existant doit rester lisible ──────────────

    @Test
    fun `une liste vide se decode en liste vide`() {
        assertEquals(emptyList<RecentItem>(), RecentItemsCodec.parse("[]"))
    }

    @Test
    fun `l aller-retour encodage decodage preserve les donnees`() {
        val original = listOf(item("1"), item("2"), item("3"))

        assertEquals(original, RecentItemsCodec.parse(RecentItemsCodec.encode(original)))
    }

    @Test
    fun `une jaquette absente se decode en null`() {
        val json = """[{"id":"1","url":"u","title":"T","cover":"","type":"movie","progress":1,"duration":2,"timestamp":3}]"""

        assertNull(RecentItemsCodec.parse(json).single().cover)
    }

    @Test
    fun `une url absente se decode en chaine vide`() {
        val json = """[{"id":"1","title":"T","cover":"c","type":"movie","progress":1,"duration":2,"timestamp":3}]"""

        assertEquals("", RecentItemsCodec.parse(json).single().url)
    }

    @Test
    fun `les entrees valides restent lisibles apres une entree corrompue`() {
        val json = """[{"broken":true},{"id":"2","url":"u","title":"T","cover":"c","type":"series","progress":9,"duration":10,"timestamp":11}]"""

        val parsed = RecentItemsCodec.parse(json)

        assertTrue(parsed.size == 1)
        assertEquals("series", parsed.single().type)
        assertEquals(9L, parsed.single().progress)
    }
}
