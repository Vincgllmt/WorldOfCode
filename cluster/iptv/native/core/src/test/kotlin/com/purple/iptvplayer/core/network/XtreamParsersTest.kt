package com.purple.iptvplayer.core.network

import com.purple.iptvplayer.core.model.Credentials
import org.json.JSONException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Robustesse des parseurs de catalogue.
 *
 * Même défaut que P2, mais sur un chemin bien plus exposé : `parseChannels`,
 * `parseMovies` et `parseSeries` appellent `JSONArray(...)` et `getJSONObject(i)`
 * sans protection. Une seule entrée malformée — un panneau qui change de format,
 * une réponse tronquée — et **le catalogue entier est perdu**, pas seulement
 * l'entrée fautive.
 *
 * ⚠️ **La tolérance n'est pas uniforme, et c'est délibéré.** Une première version
 * rendait aussi une liste vide quand le document *entier* était illisible. C'était
 * une régression : `IptvRepository.fetchChannels` écrit `result` dans le cache sans
 * vérifier qu'il est non vide, et son repli sur cache périmé vit dans le `catch`.
 * Une page d'erreur HTML du panneau aurait donc **écrasé le catalogue en cache par
 * une liste vide**, sans jamais servir le repli hors-ligne.
 *
 * D'où l'asymétrie retenue :
 *
 * | Niveau | Comportement | Raison |
 * |---|---|---|
 * | document de flux illisible | **lève** | c'est une panne : le `catch` appelant doit servir le cache périmé |
 * | document de catégories illisible | dégrade | un libellé perdu ne vaut pas le catalogue |
 * | entrée isolée corrompue | écartée | une ligne fautive ne doit pas coûter les 11 889 autres |
 */
class XtreamParsersTest {

    private val client = XtreamApiClient()
    private val creds  = Credentials(host = "http://x.tv", user = "u", pass = "p")

    private val goodCats = """[{"category_id":"1","category_name":"FR"}]"""

    // ─── document entier illisible ────────────────────────────────────────────

    @Test
    fun `un document de chaines illisible remonte l erreur plutot que d ecraser le cache`() {
        assertThrows(JSONException::class.java) {
            client.parseChannels(goodCats, "{pas du json", creds)
        }
    }

    @Test
    fun `un document de categories illisible ne fait pas perdre les chaines`() {
        // Les catégories ne sont qu'un libellé : leur perte ne doit pas coûter le catalogue.
        val streams = """[{"name":"TF1","stream_id":1,"category_id":"1"}]"""
        val out = client.parseChannels("<html>erreur 502</html>", streams, creds)
        assertEquals(1, out.size)
        assertEquals("Others", out.first().group)
    }

    @Test
    fun `un document de films illisible remonte l erreur`() {
        assertThrows(JSONException::class.java) { client.parseMovies(goodCats, "", creds) }
    }

    @Test
    fun `un document de series illisible remonte l erreur`() {
        assertThrows(JSONException::class.java) { client.parseSeries(goodCats, "null") }
    }

    // ─── entrée isolée corrompue ──────────────────────────────────────────────

    @Test
    fun `une chaine corrompue est ecartee sans perdre les saines`() {
        val streams = """[
            {"name":"TF1","stream_id":1,"category_id":"1"},
            "ceci n'est pas un objet",
            {"name":"M6","stream_id":2,"category_id":"1"}
        ]"""
        val out = client.parseChannels(goodCats, streams, creds)
        assertEquals(listOf("TF1", "M6"), out.map { it.name })
    }

    @Test
    fun `un film corrompu est ecarte sans perdre les sains`() {
        val streams = """[{"name":"Film A","stream_id":1}, 42, {"name":"Film B","stream_id":2}]"""
        assertEquals(listOf("Film A", "Film B"), client.parseMovies(goodCats, streams, creds).map { it.name })
    }

    @Test
    fun `une serie corrompue est ecartee sans perdre les saines`() {
        val streams = """[{"name":"S1","series_id":1}, null, {"name":"S2","series_id":2}]"""
        assertEquals(listOf("S1", "S2"), client.parseSeries(goodCats, streams).map { it.name })
    }

    @Test
    fun `une categorie corrompue n affecte pas les autres`() {
        val cats = """[{"category_id":"1","category_name":"FR"}, "casse", {"category_id":"2","category_name":"US"}]"""
        val streams = """[{"name":"TF1","stream_id":1,"category_id":"2"}]"""
        assertEquals("US", client.parseChannels(cats, streams, creds).first().group)
    }

    // ─── cas limites ──────────────────────────────────────────────────────────

    @Test
    fun `un tableau vide donne une liste vide`() {
        assertTrue(client.parseChannels("[]", "[]", creds).isEmpty())
    }

    @Test
    fun `un objet la ou un tableau est attendu remonte l erreur`() {
        // Certains panneaux renvoient {"error":"..."} au lieu d'un tableau : c'est une
        // panne d'authentification, surtout pas « 0 chaîne » à mettre en cache.
        assertThrows(JSONException::class.java) {
            client.parseChannels(goodCats, """{"error":"auth"}""", creds)
        }
    }

    // ─── parseurs de détail ───────────────────────────────────────────────────

    @Test
    fun `une saison illisible ne fait pas perdre les autres saisons`() {
        val json = """{"info":{"name":"Sitcom"},"episodes":{
            "1":[{"id":10,"title":"Pilote","episode_num":1}],
            "2":"ceci n est pas un tableau"
        }}"""
        val out = client.parseSeriesDetail(json, 7, creds)
        assertEquals(listOf("Pilote"), out.seasons["1"]?.map { it.title })
        assertTrue("la saison cassée ne doit pas apparaître", out.seasons["2"].isNullOrEmpty())
    }

    @Test
    fun `un episode corrompu est ecarte sans perdre les autres`() {
        val json = """{"info":{"name":"Sitcom"},"episodes":{"1":[
            {"id":10,"title":"Pilote","episode_num":1},
            "casse",
            {"id":11,"title":"Final","episode_num":2}
        ]}}"""
        val out = client.parseSeriesDetail(json, 7, creds)
        assertEquals(listOf("Pilote", "Final"), out.seasons["1"]?.map { it.title })
    }

    @Test
    fun `un document de detail de serie illisible remonte l erreur`() {
        // Même raison que pour le catalogue : `fetchSeriesDetail` met le résultat en
        // cache sans le vérifier, une fiche vide y resterait figée.
        assertThrows(JSONException::class.java) { client.parseSeriesDetail("<html>502</html>", 7, creds) }
    }

    @Test
    fun `un document de detail de film illisible remonte l erreur`() {
        assertThrows(JSONException::class.java) { client.parseMovieDetail("<html>502</html>", creds) }
    }
}
