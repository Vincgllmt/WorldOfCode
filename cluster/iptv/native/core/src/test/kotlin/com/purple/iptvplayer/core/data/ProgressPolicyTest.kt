package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Un média vu jusqu'au bout sort de « Reprendre la lecture » et se rouvre au début (#43).
 *
 * Le défaut mesuré par lecture : la chaîne de progression n'avait qu'un seuil bas
 * (« > 5 s ») et aucune notion de fin. Un film regardé jusqu'au générique voyait sa
 * position enregistrée égale à sa durée — il restait dans la vitrine, barre pleine, et le
 * rouvrir le replaçait sur son générique.
 */
class ProgressPolicyTest {

    private val film = 5_400_000L      // 1 h 30
    private val episode = 1_200_000L   // 20 min

    // ── La fin d'un média ────────────────────────────────────────────────────

    @Test
    fun `le generique compte comme vu jusqu'au bout`() {
        // 90 % de 1 h 30, c'est 1 h 21 : le générique n'a pas à être regardé.
        assertTrue(ProgressPolicy.isComplete((film * 0.9f).toLong(), film))
        assertTrue(ProgressPolicy.isComplete(film, film))
    }

    @Test
    fun `un film arrete au milieu n'est pas termine`() {
        assertFalse(ProgressPolicy.isComplete(film / 2, film))
    }

    @Test
    fun `sans duree connue, aucune fin n'est supposee`() {
        // Un direct, ou un flux pas encore bufferisé : la position seule ne dit rien.
        assertFalse(ProgressPolicy.isComplete(3_600_000L, 0L))
    }

    // ── Ce qu'on écrit ───────────────────────────────────────────────────────

    @Test
    fun `un media ouvert par erreur n'est pas enregistre`() {
        assertEquals(ProgressPolicy.Decision.IGNORE, ProgressPolicy.decide(3_000L, film))
    }

    @Test
    fun `une lecture en cours est enregistree`() {
        assertEquals(ProgressPolicy.Decision.SAVE, ProgressPolicy.decide(600_000L, film))
    }

    @Test
    fun `une lecture menee a son terme est marquee terminee, pas enregistree`() {
        // C'est le défaut : cette position-là passait par la même écriture que les autres
        // et réinsérait le film en tête de « Reprendre la lecture ».
        assertEquals(ProgressPolicy.Decision.COMPLETED, ProgressPolicy.decide(film, film))
    }

    @Test
    fun `un direct reste enregistre, faute de fin connaissable`() {
        assertEquals(ProgressPolicy.Decision.SAVE, ProgressPolicy.decide(7_200_000L, 0L))
    }

    // ── Où l'on rouvre ───────────────────────────────────────────────────────

    @Test
    fun `un episode vu en entier se rouvre au debut`() {
        assertEquals(0L, ProgressPolicy.resumePosition(episode, episode))
    }

    @Test
    fun `un episode laisse en cours se rouvre ou on l'a laisse`() {
        assertEquals(300_000L, ProgressPolicy.resumePosition(300_000L, episode))
    }

    @Test
    fun `une position sans duree connue est rendue telle quelle`() {
        assertEquals(300_000L, ProgressPolicy.resumePosition(300_000L, 0L))
    }
}
