package com.purple.iptvplayer.core.network

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Décodage conditionnel des libellés EPG.
 *
 * Les panneaux Xtream encodent généralement les titres en base64, mais certains les
 * envoient en clair. Un titre en clair composé uniquement de caractères de
 * l'alphabet base64 — cas très courant : « Football », « News » — ne doit pas être
 * décodé, sans quoi il est remplacé par des octets arbitraires.
 */
class EpgTextDecoderTest {

    private fun decode(s: String) = EpgTextDecoder.decodeBase64OrSelf(s)

    // ─── Le décodage attendu doit fonctionner ─────────────────────────────────

    @Test
    fun `un titre encode en base64 est decode`() {
        assertEquals("Journal", decode("Sm91cm5hbA=="))
    }

    @Test
    fun `un titre accentue encode en base64 est decode`() {
        assertEquals("Météo", decode("TcOpdMOpbw=="))
    }

    @Test
    fun `une description encodee en base64 est decodee`() {
        assertEquals(
            "Le journal de 20h",
            decode("TGUgam91cm5hbCBkZSAyMGg="),
        )
    }

    // ─── Un texte en clair ne doit jamais être détruit ────────────────────────

    @Test
    fun `un titre en clair de huit caracteres reste intact`() {
        assertEquals("Football", decode("Football"))
    }

    @Test
    fun `un titre en clair de quatre caracteres reste intact`() {
        assertEquals("News", decode("News"))
    }

    @Test
    fun `un titre en clair alphanumerique reste intact`() {
        for (titre in listOf("Sport", "Cinema", "Journal", "Documentaire", "Musique", "Telefilm")) {
            assertEquals(titre, decode(titre))
        }
    }

    @Test
    fun `un titre en clair contenant des espaces reste intact`() {
        assertEquals("Le Journal de 20h", decode("Le Journal de 20h"))
    }

    @Test
    fun `un titre en clair accentue reste intact`() {
        assertEquals("Météo marine", decode("Météo marine"))
    }

    @Test
    fun `une chaine vide reste vide`() {
        assertEquals("", decode(""))
    }
}
