package com.purple.iptvplayer.core.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Ce que l'on a le droit de proposer dans le sélecteur de pistes, et sous quel nom.
 *
 * Les deux défauts couverts ici sont ceux remontés à l'usage sur l'app TV
 * (« le changement de piste provoque une erreur ») : une piste que l'appareil ne sait pas
 * décoder était choisissable, et deux pistes de même langue portaient le même nom.
 */
class TrackPolicyTest {

    private fun track(
        id: String = "0:0",
        language: String? = null,
        label: String? = null,
        isForced: Boolean = false,
        isSupported: Boolean = true,
    ) = TrackInfo(id = id, language = language, label = label, isForced = isForced, isSupported = isSupported)

    // ── Ce qui est choisissable ───────────────────────────────────────────────

    @Test
    fun `une piste prise en charge est choisissable`() {
        assertTrue(TrackPolicy.isSelectable(track(isSupported = true)))
    }

    @Test
    fun `une piste que le decodeur refuse ne l'est pas`() {
        // Le cas réel : un E-AC3 listé par ExoPlayer sur un boîtier sans le décodeur.
        // Rien ne le distinguait des autres, et le choisir faisait échouer la lecture.
        assertFalse(TrackPolicy.isSelectable(track(language = "fre", isSupported = false)))
    }

    @Test
    fun `couper les sous-titres reste toujours possible`() {
        // `null` = « aucune piste » : c'est le seul moyen de sortir d'une piste illisible,
        // il ne doit dépendre d'aucune capacité de décodage.
        assertTrue(TrackPolicy.canSelect(null))
    }

    @Test
    fun `une version dont la piste est illisible n'est pas applicable`() {
        assertFalse(TrackPolicy.canSelect(track(isSupported = false)))
    }

    // ── Le nom affiché ────────────────────────────────────────────────────────

    @Test
    fun `deux pistes de meme langue restent distinctes`() {
        // Le défaut : le libellé était `langue ?: titre`, dans cet ordre. Les deux pistes
        // s'affichaient « français », et on ne pouvait pas savoir ce que l'on choisissait.
        val vf51 = track(id = "0:0", language = "fre", label = "VF 5.1")
        val vfSt = track(id = "0:1", language = "fre", label = "VF stéréo")

        assertEquals("français — VF 5.1",    TrackPolicy.label(vf51, "français", "Piste 1"))
        assertEquals("français — VF stéréo", TrackPolicy.label(vfSt, "français", "Piste 2"))
    }

    @Test
    fun `un titre qui repete la langue n'est pas accole`() {
        // Le fournisseur écrit tantôt « Français », tantôt le code, tantôt le nom anglais.
        // Aucun n'apporte plus que la langue déjà résolue.
        val aliases = setOf("French", "fr")
        assertEquals("français", TrackPolicy.label(track(language = "fre", label = "Français"), "français", "Piste 1", languageAliases = aliases))
        assertEquals("français", TrackPolicy.label(track(language = "fre", label = "French"),   "français", "Piste 1", languageAliases = aliases))
        assertEquals("français", TrackPolicy.label(track(language = "fre", label = "  fr  "),   "français", "Piste 1", languageAliases = aliases))
        // Le code porté par la piste elle-même compte toujours comme un alias.
        assertEquals("français", TrackPolicy.label(track(language = "fre", label = "FRE"),      "français", "Piste 1"))
    }

    @Test
    fun `un titre porteur d'information n'est jamais efface`() {
        // Pas d'heuristique de sous-chaîne : « Frenchy » n'est pas « French ». Perdre un
        // titre coûte plus cher que d'en garder un redondant (cf. §8.1).
        assertEquals(
            "français — Frenchy",
            TrackPolicy.label(track(language = "fre", label = "Frenchy"), "français", "Piste 1",
                              languageAliases = setOf("French")),
        )
    }

    @Test
    fun `sans titre on garde la langue, sans langue on garde le titre`() {
        assertEquals("anglais",   TrackPolicy.label(track(language = "eng"), "anglais", "Piste 1"))
        assertEquals("Commentaire", TrackPolicy.label(track(label = "Commentaire"), null, "Piste 1"))
    }

    @Test
    fun `une piste sans langue ni titre retombe sur le libelle numerote`() {
        assertEquals("Piste 3", TrackPolicy.label(track(), null, "Piste 3"))
    }

    @Test
    fun `les alias d'une langue couvrent code, forme courte et nom anglais`() {
        val aliases = TrackPolicy.languageAliases("fre")
        assertTrue("fre" in aliases)
        assertTrue(aliases.any { it.equals("French", ignoreCase = true) })
        // Un code vide ou absent ne produit rien plutôt qu'un alias parasite.
        assertTrue(TrackPolicy.languageAliases(null).isEmpty())
        assertTrue(TrackPolicy.languageAliases("  ").isEmpty())
    }

    @Test
    fun `une piste forcee est signalee`() {
        val forced = track(language = "fre", isForced = true)
        assertEquals("français (forcés)", TrackPolicy.label(forced, "français", "Piste 1", "(forcés)"))
    }

    @Test
    fun `la mention forcee n'est pas doublee quand le titre la porte deja`() {
        // Relevé sur le catalogue réel (cf. VersionPolicy) : « FR Forced » avec le drapeau
        // du conteneur à 0. Sans cette garde on afficherait « FR Forced (forcés) ».
        val labelled = track(language = "fre", label = "FR Forced")
        assertEquals("français — FR Forced", TrackPolicy.label(labelled, "français", "Piste 1", "Forced"))
    }

    @Test
    fun `sans suffixe demande rien n'est ajoute`() {
        val forced = track(language = "fre", isForced = true)
        assertEquals("français", TrackPolicy.label(forced, "français", "Piste 1", forcedSuffix = null))
    }
}
