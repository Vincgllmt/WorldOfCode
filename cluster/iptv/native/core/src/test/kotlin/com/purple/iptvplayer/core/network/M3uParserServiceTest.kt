package com.purple.iptvplayer.core.network

import com.purple.iptvplayer.core.model.ContentType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Analyse des playlists M3U.
 *
 * Dans le format M3U, le nom affiché est tout ce qui suit la **première** virgule
 * située après les attributs — et non ce qui suit la dernière. Les noms de chaînes
 * contenant une virgule sont courants (« Canal+, Le Sport »), tout comme les
 * virgules à l'intérieur d'un attribut entre guillemets.
 */
class M3uParserServiceTest {

    // ─── P3 : le nom ne doit pas être tronqué à la virgule ────────────────────

    @Test
    fun `un nom contenant une virgule est conserve entierement`() {
        val m3u = """
            #EXTM3U
            #EXTINF:-1 tvg-logo="http://h/l.png" group-title="FR",Canal+, Le Sport
            http://host/live/1.ts
        """.trimIndent()

        assertEquals("Canal+, Le Sport", M3uParserService.parse(m3u).single().name)
    }

    @Test
    fun `un nom contenant plusieurs virgules est conserve entierement`() {
        val m3u = """
            #EXTINF:-1 group-title="FR",RMC Sport 1, Ligue 1, HD
            http://host/live/2.ts
        """.trimIndent()

        assertEquals("RMC Sport 1, Ligue 1, HD", M3uParserService.parse(m3u).single().name)
    }

    @Test
    fun `une virgule dans un attribut ne decale pas le nom`() {
        val m3u = """
            #EXTINF:-1 tvg-id="fr,1" group-title="Sports, Live",Canal+, Le Sport
            http://host/live/3.ts
        """.trimIndent()

        val item = M3uParserService.parse(m3u).single()

        assertEquals("Canal+, Le Sport", item.name)
        assertEquals("Sports, Live", item.group)
    }

    @Test
    fun `une entree sans nom retombe sur Unknown`() {
        val m3u = """
            #EXTINF:-1 group-title="FR",
            http://host/live/4.ts
        """.trimIndent()

        assertEquals("Unknown", M3uParserService.parse(m3u).single().name)
    }

    // ─── Non-régression ───────────────────────────────────────────────────────

    @Test
    fun `un nom simple est lu tel quel`() {
        val m3u = """
            #EXTM3U
            #EXTINF:-1 tvg-logo="http://h/tf1.png" group-title="FR",TF1
            http://host/live/5.ts
        """.trimIndent()

        val item = M3uParserService.parse(m3u).single()

        assertEquals("TF1", item.name)
        assertEquals("http://h/tf1.png", item.logo)
        assertEquals("FR", item.group)
        assertEquals("http://host/live/5.ts", item.url)
    }

    @Test
    fun `les attributs absents sont nuls`() {
        val m3u = """
            #EXTINF:-1,Chaine Nue
            http://host/live/6.ts
        """.trimIndent()

        val item = M3uParserService.parse(m3u).single()

        assertEquals("Chaine Nue", item.name)
        assertNull(item.logo)
        assertNull(item.group)
    }

    @Test
    fun `le type de contenu est deduit de l url`() {
        val m3u = """
            #EXTINF:-1,Direct
            http://host/live/7.ts
            #EXTINF:-1,Un Film
            http://host/movie/8.mkv
            #EXTINF:-1,Une Serie
            http://host/series/9.mp4
        """.trimIndent()

        assertEquals(
            listOf(ContentType.LIVE, ContentType.MOVIE, ContentType.SERIES),
            M3uParserService.parse(m3u).map { it.type },
        )
    }

    @Test
    fun `une entree sans url est ignoree`() {
        val m3u = """
            #EXTINF:-1,Sans Url
            #EXTINF:-1,Avec Url
            http://host/live/10.ts
        """.trimIndent()

        assertEquals(listOf("Avec Url"), M3uParserService.parse(m3u).map { it.name })
    }

    @Test
    fun `une playlist vide rend une liste vide`() {
        assertEquals(emptyList<Any>(), M3uParserService.parse(""))
        assertEquals(emptyList<Any>(), M3uParserService.parse("#EXTM3U"))
    }

    @Test
    fun `plusieurs entrees sont toutes lues`() {
        val m3u = """
            #EXTM3U
            #EXTINF:-1 group-title="FR",TF1
            http://host/live/a.ts
            #EXTINF:-1 group-title="FR",France 2
            http://host/live/b.ts
        """.trimIndent()

        assertEquals(listOf("TF1", "France 2"), M3uParserService.parse(m3u).map { it.name })
    }
    /**
     * #109 — le doublon exact part, mais un même flux rangé dans deux thèmes reste.
     *
     * Mesuré à l'écran avant correction (§61) : avec `distinctBy { it.url }`, une
     * playlist listant le même flux dans « AAA SPORT » et « BBB FRANCE » n'affichait
     * que `2 chaînes` puis `1 chaîne` — la seconde occurrence était perdue.
     */
    @Test
    fun `doublon exact ecarte, meme flux dans deux themes conserve`() {
        val m3u = """
            #EXTM3U
            #EXTINF:-1 group-title="SPORT",beIN 1
            http://x/bein1.ts
            #EXTINF:-1 group-title="SPORT",beIN 1
            http://x/bein1.ts
            #EXTINF:-1 group-title="FRANCE",beIN 1
            http://x/bein1.ts
        """.trimIndent()

        val items = M3uParserService.parse(m3u)

        assertEquals(2, items.size)
        assertEquals(listOf("SPORT", "FRANCE"), items.map { it.group })
        // La clé de liste, elle, doit rester unique — c'est ce qui rend le doublon
        // de thème inoffensif côté Compose.
        assertEquals(2, items.map { it.url to it.group }.distinct().size)
    }
}
