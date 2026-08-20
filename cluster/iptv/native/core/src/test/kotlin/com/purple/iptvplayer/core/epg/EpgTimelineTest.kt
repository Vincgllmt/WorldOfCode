package com.purple.iptvplayer.core.epg

import com.purple.iptvplayer.core.model.EpgProgram
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.TimeZone

/**
 * Sélection du programme courant et avancement — reprise du scénario **mesuré sur
 * appareil** en P11 : à 20:28 heure locale (Paris, UTC+2), le JT de 20h de TF1
 * s'affichait « EN DIRECT · 19:00 – 19:45 », barre d'avancement vide.
 *
 * Le panneau du fournisseur émet ses chaînes d'horaire en UTC+1 : `start` vaut donc
 * « 19:00:00 » quand le programme commence à 20:00 locales. Interpréter cette chaîne
 * comme de l'UTC la décale de deux heures — la sélection du programme courant échoue,
 * le code retombe sur `programs.firstOrNull()` (le bon programme par chance, l'API
 * renvoyant les diffusions à partir de maintenant) et l'avancement reste à zéro.
 *
 * Les instants sont exprimés en millisecondes epoch, donc indépendants du fuseau de
 * la machine qui exécute les tests.
 */
class EpgTimelineTest {

    /** 2026-08-20 18:00:00 UTC — soit 20:00 à Paris (UTC+2) et 19:00 chez le panneau (UTC+1). */
    private val startUtc = 1_787_248_800_000L
    private val quarter  = 45 * 60_000L
    /** 20:28 locales : 28 minutes après le début du programme. */
    private val now = startUtc + 28 * 60_000L

    private val jt = EpgProgram(
        title   = "Le Journal de 20h",
        start   = "2026-08-20 19:00:00",   // fuseau du panneau, UTC+1
        end     = "2026-08-20 19:45:00",
        startMs = startUtc,
        endMs   = startUtc + quarter,
    )
    private val meteo = EpgProgram(
        title   = "Meteo",
        start   = "2026-08-20 19:45:00",
        end     = "2026-08-20 20:00:00",
        startMs = startUtc + quarter,
        endMs   = startUtc + quarter + 15 * 60_000L,
    )

    @Test
    fun `le programme courant est choisi sur l horodatage Unix, pas sur la chaine`() {
        val snap = EpgTimeline.snapshot(listOf(jt, meteo), now)!!
        assertEquals("Le Journal de 20h", snap.current.title)
        assertEquals("Meteo", snap.next?.title)
    }

    @Test
    fun `l avancement reflete le temps ecoule et n est pas fige a zero`() {
        val snap = EpgTimeline.snapshot(listOf(jt, meteo), now)!!
        // 28 minutes sur 45 : environ deux tiers. C'est le symptôme mesuré en P11,
        // où la barre restait vide alors que le programme était engagé.
        assertEquals(28f / 45f, snap.progress, 0.01f)
    }

    @Test
    fun `l avancement progresse avec le temps`() {
        val debut = EpgTimeline.snapshot(listOf(jt), startUtc + 60_000L)!!.progress
        val fin   = EpgTimeline.snapshot(listOf(jt), startUtc + quarter - 60_000L)!!.progress
        assertTrue("l'avancement doit croitre ($debut -> $fin)", fin > debut)
    }

    @Test
    fun `un programme sans horodatage Unix retombe sur la chaine d horaire`() {
        // Repli : certains panneaux n'envoient pas start_timestamp. Le comportement
        // historique doit être conservé plutôt que de perdre le programme.
        val sansMs = jt.copy(startMs = null, endMs = null)
        val snap = EpgTimeline.snapshot(listOf(sansMs), 1_787_252_400_000L + 60_000L)
        assertEquals("Le Journal de 20h", snap?.current?.title)
    }

    @Test
    fun `une grille vide ne donne aucun instantane`() {
        assertNull(EpgTimeline.snapshot(emptyList(), now))
    }

    @Test
    fun `les horaires sont formates dans le fuseau de l appareil`() {
        // C'est l'autre moitié de P11 : afficher `start` brut donnait « 19:00 » à un
        // spectateur parisien dont l'horloge affichait 20:28.
        val paris = TimeZone.getTimeZone("Europe/Paris")
        assertEquals("20:00", EpgTimeline.formatTime(jt, end = false, tz = paris))
        assertEquals("20:45", EpgTimeline.formatTime(jt, end = true, tz = paris))
    }

    @Test
    fun `sans horodatage le formatage retombe sur la chaine du fournisseur`() {
        val sansMs = jt.copy(startMs = null, endMs = null)
        assertEquals("19:00", EpgTimeline.formatTime(sansMs, end = false, tz = TimeZone.getTimeZone("Europe/Paris")))
    }
}
