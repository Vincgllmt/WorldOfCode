package com.purple.iptvplayer.core.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Choix VF / VOSTFR.
 *
 * Les trois premiers cas ne sont pas inventés : ce sont les pistes **relevées à
 * l'octet avec ffprobe** sur trois films du catalogue réel de l'utilisateur, le
 * 2026-08-20. C'est ce relevé qui a établi la cause du constat de `raf.md`
 * (« la première piste de sous-titres ne fonctionne quasi jamais ») : la première
 * piste française est marquée *forced*, et une piste forcée ne porte que les
 * passages en langue étrangère.
 */
class VersionPolicyTest {

    // ── Doctor Strange in the Multiverse of Madness (MULTI), id 477580 ──────────
    private val dsAudio = listOf(
        TrackInfo("a1", "eng", "EN"),
        TrackInfo("a2", "fre", "FR"),
        TrackInfo("a3", "fre", "FR-CA"),
    )
    private val dsText = listOf(
        TrackInfo("s4", "eng", "EN Forced", isForced = true),
        TrackInfo("s5", "eng", "EN"),
        TrackInfo("s6", "fre", "FR Forced", isForced = true),
        TrackInfo("s7", "fre", "FR"),
    )

    @Test
    fun `la piste de sous-titres forcee est evitee au profit de la complete`() {
        val c = VersionPolicy.resolve(VersionMode.VOSTFR, dsAudio, dsText)!!
        assertEquals("s7", c.subtitle?.id)
        assertEquals("la piste FR Forced ne doit jamais etre choisie", false, c.subtitle?.isForced)
    }

    @Test
    fun `VOSTFR prend la version originale, pas la francaise`() {
        assertEquals("a1", VersionPolicy.resolve(VersionMode.VOSTFR, dsAudio, dsText)!!.audio?.id)
    }

    @Test
    fun `VF prend l audio francais et coupe les sous-titres`() {
        val c = VersionPolicy.resolve(VersionMode.VF, dsAudio, dsText)!!
        assertEquals("a2", c.audio?.id)
        assertNull("on ne sous-titre pas un doublage dans sa propre langue", c.subtitle)
    }

    // ── Monster Summer, id 393458 ───────────────────────────────────────────────
    @Test
    fun `un film a deux pistes audio propose les deux versions`() {
        val audio = listOf(TrackInfo("a1", "eng", "English"), TrackInfo("a2", "fre", "Français"))
        val text  = listOf(TrackInfo("s1", "fre", "Complets"))
        assertEquals(setOf(VersionMode.VF, VersionMode.VOSTFR), VersionPolicy.availableModes(audio, text))
        assertEquals("s1", VersionPolicy.resolve(VersionMode.VOSTFR, audio, text)!!.subtitle?.id)
    }

    // ── Avatar : De feu et de cendres (VOSTFR), id 447893 ────────────────────────
    @Test
    fun `une entree VOSTFR sans audio francais ne propose pas la VF`() {
        val audio = listOf(TrackInfo("a1", "eng", null))
        val text  = listOf(TrackInfo("s1", "eng", "FULL"), TrackInfo("s2", "fre", "FULL"))
        assertEquals(setOf(VersionMode.VOSTFR), VersionPolicy.availableModes(audio, text))
        assertNull(VersionPolicy.resolve(VersionMode.VF, audio, text))
        assertEquals("s2", VersionPolicy.resolve(VersionMode.VOSTFR, audio, text)!!.subtitle?.id)
    }

    // ── Cas limites ─────────────────────────────────────────────────────────────

    @Test
    fun `sans sous-titres francais la VOSTFR n est pas proposee`() {
        val audio = listOf(TrackInfo("a1", "eng", null), TrackInfo("a2", "fre", null))
        assertEquals(setOf(VersionMode.VF), VersionPolicy.availableModes(audio, emptyList()))
    }

    @Test
    fun `un film sans piste francaise ne propose aucune version`() {
        val audio = listOf(TrackInfo("a1", "eng", null))
        val text  = listOf(TrackInfo("s1", "eng", null))
        assertTrue(VersionPolicy.availableModes(audio, text).isEmpty())
    }

    @Test
    fun `une piste unique en francais ne propose que la VF`() {
        val audio = listOf(TrackInfo("a1", "fra", "VF"))
        assertEquals(setOf(VersionMode.VF), VersionPolicy.availableModes(audio, emptyList()))
    }

    @Test
    fun `les variantes du code de langue francais sont reconnues`() {
        listOf("fr", "fra", "fre", "FR", "fr-FR", "fr_CA", "French").forEach {
            assertTrue("$it doit etre reconnu comme francais", VersionPolicy.isFrench(it))
        }
        listOf("en", "eng", "es", null, "", "fri").forEach {
            assertTrue("$it ne doit pas etre francais", !VersionPolicy.isFrench(it))
        }
    }

    @Test
    fun `l audio francais quebecois sert de repli si le francais standard manque`() {
        // Ordre du conteneur respecté : FR avant FR-CA quand les deux existent.
        val audio = listOf(TrackInfo("a1", "eng", "EN"), TrackInfo("a2", "fre", "FR-CA"))
        assertEquals("a2", VersionPolicy.resolve(VersionMode.VF, audio, emptyList())!!.audio?.id)
    }

    // ── Version actuellement jouee ──────────────────────────────────────────────

    @Test
    fun `un audio francais est reconnu comme VF`() {
        assertEquals(VersionMode.VF, VersionPolicy.detect(TrackInfo("a", "fre"), null))
    }

    @Test
    fun `un audio original avec sous-titres francais est reconnu comme VOSTFR`() {
        assertEquals(
            VersionMode.VOSTFR,
            VersionPolicy.detect(TrackInfo("a", "eng"), TrackInfo("s", "fre")),
        )
    }

    @Test
    fun `un audio original sans sous-titres francais ne correspond a aucune version`() {
        assertNull(VersionPolicy.detect(TrackInfo("a", "eng"), null))
        assertNull(VersionPolicy.detect(TrackInfo("a", "eng"), TrackInfo("s", "eng")))
    }

    // ── Robin des Bois (2018), id 174946 — relevé ffprobe du 2026-08-20 ──────────
    // Les trois pistes portent forced=0 dans le conteneur : la piste forcée n'est
    // reconnaissable qu'à son **titre**. Se fier au seul drapeau la ferait choisir,
    // et c'est très exactement le symptôme signalé dans `raf.md`.
    @Test
    fun `une piste forcee non signalee par le conteneur est reconnue a son titre`() {
        val text = listOf(
            TrackInfo("s1", "fre", "Forced"),
            TrackInfo("s2", "fre", "French"),
            TrackInfo("s3", "fre", "French SDH"),
        )
        val audio = listOf(TrackInfo("a1", "eng", null))
        assertEquals("s2", VersionPolicy.resolve(VersionMode.VOSTFR, audio, text)!!.subtitle?.id)
    }

    @Test
    fun `le titre francais Forces est aussi reconnu`() {
        val text = listOf(TrackInfo("s1", "fre", "Sous-titres forcés"), TrackInfo("s2", "fre", "Complets"))
        val audio = listOf(TrackInfo("a1", "eng", null))
        assertEquals("s2", VersionPolicy.resolve(VersionMode.VOSTFR, audio, text)!!.subtitle?.id)
    }

    @Test
    fun `un titre contenant Forced sans etre une piste forcee n est pas ecarte a tort`() {
        // « Reinforced » contient « forced » : la détection doit être un mot, pas un
        // fragment, sinon on écarterait une piste parfaitement valable.
        val text = listOf(TrackInfo("s1", "fre", "Reinforced Edition"))
        val audio = listOf(TrackInfo("a1", "eng", null))
        assertEquals("s1", VersionPolicy.resolve(VersionMode.VOSTFR, audio, text)!!.subtitle?.id)
    }
}
