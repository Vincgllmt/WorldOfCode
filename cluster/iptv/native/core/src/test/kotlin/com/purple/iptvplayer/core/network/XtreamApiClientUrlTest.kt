package com.purple.iptvplayer.core.network

import com.purple.iptvplayer.core.model.Credentials
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Construction de l'URL `player_api.php`.
 *
 * Cette URL conditionne l'authentification et la totalité des appels catalogue :
 * si elle est malformée, l'utilisateur ne peut pas se connecter du tout, sans
 * message explicatif.
 *
 * Les identifiants doivent être encodés. `Credentials.parseUrl()` les extrait via
 * `Uri.getQueryParameter()`, qui **décode** le pourcentage ; les réémettre bruts
 * casse l'aller-retour.
 */
class XtreamApiClientUrlTest {

    private val client = XtreamApiClient()

    private fun creds(user: String?, pass: String?) =
        Credentials(host = "http://panel.example.com:8080", user = user, pass = pass)

    @Test
    fun `un mot de passe contenant un plus n est pas transforme en espace`() {
        // PHP décode « + » en espace dans une query string : sans encodage,
        // le mot de passe « ab+cd » arrive au serveur comme « ab cd ».
        val url = client.playerApiUrl(creds("bob", "ab+cd"))

        assertTrue("« + » doit être encodé en %2B, obtenu : $url", url.contains("password=ab%2Bcd"))
    }

    @Test
    fun `un mot de passe contenant un et-commercial n injecte pas de parametre`() {
        val url = client.playerApiUrl(creds("bob", "a&admin=1"))

        assertFalse("« & » brut scinde la query, obtenu : $url", url.contains("password=a&admin=1"))
        assertTrue(url.contains("password=a%26admin%3D1"))
    }

    @Test
    fun `un mot de passe contenant un diese ne tronque pas l url`() {
        // Un « # » brut transforme tout ce qui suit en fragment : le serveur ne le voit jamais.
        val url = client.playerApiUrl(creds("bob", "pa#ss"), action = "get_live_streams")

        assertTrue("« # » doit être encodé, obtenu : $url", url.contains("password=pa%23ss"))
        assertTrue(url.contains("action=get_live_streams"))
    }

    @Test
    fun `un identifiant contenant un espace est encode`() {
        val url = client.playerApiUrl(creds("jean dupont", "secret"))

        assertFalse("Un espace brut rend l'URL invalide, obtenu : $url", url.contains("username=jean dupont"))
    }

    @Test
    fun `des identifiants absents ne produisent pas le litteral null`() {
        val url = client.playerApiUrl(creds(null, null))

        assertFalse("Interpolation de null, obtenu : $url", url.contains("null"))
    }

    // ─── Non-régression ───────────────────────────────────────────────────────

    @Test
    fun `des identifiants alphanumeriques sont inchanges`() {
        assertEquals(
            "http://panel.example.com:8080/player_api.php?username=bob&password=s3cr3t",
            client.playerApiUrl(creds("bob", "s3cr3t")),
        )
    }

    @Test
    fun `l action est ajoutee a la query`() {
        assertEquals(
            "http://panel.example.com:8080/player_api.php?username=bob&password=s3cr3t&action=get_series",
            client.playerApiUrl(creds("bob", "s3cr3t"), action = "get_series"),
        )
    }

    @Test
    fun `les parametres supplementaires sont ajoutes apres l action`() {
        assertEquals(
            "http://panel.example.com:8080/player_api.php?username=bob&password=s3cr3t&action=get_vod_info&vod_id=42",
            client.playerApiUrl(creds("bob", "s3cr3t"), action = "get_vod_info", extra = "&vod_id=42"),
        )
    }
}

/**
 * Construction des URL de flux.
 *
 * Les identifiants y sont des **segments de chemin** : un mot de passe contenant
 * `/`, `?` ou `#` casse l'URL, et l'espace doit s'y écrire `%20` — un `+` y
 * resterait littéral au lieu de désigner un espace.
 */
class XtreamStreamUrlTest {

    private val client = XtreamApiClient()

    private fun creds(user: String?, pass: String?) =
        Credentials(host = "http://panel.example.com:8080", user = user, pass = pass)

    @Test
    fun `un mot de passe contenant un slash ne casse pas le chemin`() {
        val url = client.streamUrl(creds("bob", "pa/ss"), "live", 12345, "ts")

        assertEquals("http://panel.example.com:8080/live/bob/pa%2Fss/12345.ts", url)
    }

    @Test
    fun `un espace dans un segment de chemin s ecrit en pourcent-vingt`() {
        val url = client.streamUrl(creds("jean dupont", "secret"), "movie", 7, "mkv")

        assertTrue("Un « + » resterait littéral dans un chemin, obtenu : $url", url.contains("/jean%20dupont/"))
    }

    @Test
    fun `un mot de passe contenant un diese ne tronque pas le chemin`() {
        val url = client.streamUrl(creds("bob", "pa#ss"), "series", 99, "mp4")

        assertEquals("http://panel.example.com:8080/series/bob/pa%23ss/99.mp4", url)
    }

    @Test
    fun `un pourcent dans un mot de passe est transmis tel quel dans le chemin`() {
        // Constaté en conditions réelles : le panneau compare le chemin brut, et
        // encoder « % » en « %25 » modifiait toutes les URL de flux d'un abonnement.
        assertEquals(
            "http://panel.example.com:8080/live/bob/ab%cd12/9.ts",
            client.streamUrl(creds("bob", "ab%cd12"), "live", 9, "ts"),
        )
    }

    @Test
    fun `des identifiants alphanumeriques donnent une url inchangee`() {
        assertEquals(
            "http://panel.example.com:8080/live/bob/s3cr3t/12345.ts",
            client.streamUrl(creds("bob", "s3cr3t"), "live", 12345, "ts"),
        )
    }
}
