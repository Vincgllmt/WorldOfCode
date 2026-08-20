package com.purple.iptvplayer.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Cas repris de l'écran réel : la fiche mobile de « A Shop for Killers » affichait
 * « E1 · A Shop for Killers Épisode 1 » sur chaque ligne.
 */
class EpisodeTitleTest {

    @Test
    fun `le nom de la serie est retire du titre de l episode`() {
        assertEquals(
            "Épisode 1",
            EpisodeTitle.stripSeriesName("A Shop for Killers Épisode 1", "A Shop for Killers"),
        )
    }

    @Test
    fun `les separateurs courants sont absorbes`() {
        listOf(
            "The Walking Dead : Dead City De vieilles connaissances" to "The Walking Dead : Dead City",
            "Simpson - Un ami pour Homer"                            to "Simpson",
            "Kaamelott – Le Banquet"                                 to "Kaamelott",
            "Columbo | Le Grand Jeu"                                 to "Columbo",
        ).forEach { (title, series) ->
            val out = EpisodeTitle.stripSeriesName(title, series)
            assertEquals("$out ne doit plus commencer par la serie", false, out.startsWith(series))
            assertEquals("$out ne doit pas commencer par une espace", false, out.first().isWhitespace())
        }
    }

    @Test
    fun `la casse n empeche pas le retrait`() {
        assertEquals("Pilote", EpisodeTitle.stripSeriesName("LOST Pilote", "Lost"))
    }

    @Test
    fun `un titre qui ne commence pas par la serie est laisse intact`() {
        assertEquals("Le Grand Bleu", EpisodeTitle.stripSeriesName("Le Grand Bleu", "Columbo"))
    }

    @Test
    fun `un episode portant exactement le nom de la serie garde son titre`() {
        assertEquals("Columbo", EpisodeTitle.stripSeriesName("Columbo", "Columbo"))
    }

    @Test
    fun `un nom de serie vide ne change rien`() {
        assertEquals("Épisode 4", EpisodeTitle.stripSeriesName("  Épisode 4 ", ""))
    }
}
