package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * « Reprendre la lecture » : une série n'y occupe qu'une place.
 *
 * Le défaut mesuré à l'usage : lancer plusieurs épisodes d'une même série les empilait
 * tous, parce que la déduplication portait sur `"<seriesId>_<episodeId>"`, différent d'un
 * épisode à l'autre.
 */
class RecentPolicyTest {

    private fun episode(seriesId: Int, episodeId: Int, at: Long = 0L) = RecentItem(
        id        = "${seriesId}_$episodeId",
        url       = "http://x/$episodeId",
        title     = "S1 E$episodeId",
        cover     = null,
        type      = "series",
        progress  = 60_000L,
        duration  = 1_200_000L,
        timestamp = at,
    )

    private fun movie(id: String, at: Long = 0L) = RecentItem(
        id        = id,
        url       = "http://x/$id",
        title     = id,
        cover     = null,
        type      = "movie",
        progress  = 60_000L,
        duration  = 5_400_000L,
        timestamp = at,
    )

    @Test
    fun `un episode remplace un autre episode de la meme serie`() {
        val list = RecentPolicy.upsert(listOf(episode(42, 1)), episode(42, 2))

        assertEquals(1, list.size)
        assertEquals("42_2", list.first().id)
    }

    @Test
    fun `le dernier episode passe en tete`() {
        val start = listOf(episode(42, 1), movie("movie_7"))
        val list  = RecentPolicy.upsert(start, episode(42, 5))

        assertEquals(listOf("42_5", "movie_7"), list.map { it.id })
    }

    @Test
    fun `deux series distinctes coexistent`() {
        val list = RecentPolicy.upsert(listOf(episode(42, 1)), episode(43, 1))

        assertEquals(listOf("43_1", "42_1"), list.map { it.id })
    }

    @Test
    fun `rejouer le meme episode ne le duplique pas`() {
        var list = listOf<RecentItem>()
        repeat(3) { list = RecentPolicy.upsert(list, episode(42, 3, at = it.toLong())) }

        assertEquals(1, list.size)
        assertEquals(2L, list.first().timestamp)
    }

    @Test
    fun `un film reste dedoublonne sur son identifiant exact`() {
        val list = RecentPolicy.upsert(listOf(movie("movie_7"), movie("movie_8")), movie("movie_7", at = 9L))

        assertEquals(listOf("movie_7", "movie_8"), list.map { it.id })
        assertEquals(9L, list.first().timestamp)
    }

    /**
     * Un identifiant de film peut ressembler à celui d'un épisode (`"movie_7"` contient un
     * `_`). Le regroupement ne doit s'appliquer qu'au type `series`, sinon deux films se
     * chasseraient l'un l'autre.
     */
    @Test
    fun `le regroupement ne deborde pas sur les autres types`() {
        val list = RecentPolicy.upsert(listOf(movie("movie_7")), movie("movie_8"))

        assertEquals(2, list.size)
    }

    @Test
    fun `la liste reste plafonnee`() {
        val start = (1..RecentItemsCodec.MAX_ITEMS).map { movie("movie_$it") }
        val list  = RecentPolicy.upsert(start, movie("movie_neuf"))

        assertEquals(RecentItemsCodec.MAX_ITEMS, list.size)
        assertEquals("movie_neuf", list.first().id)
    }

    /**
     * §8.15 — une suppression qui laisse derrière elle une entrée du même groupe paraît
     * sans effet : l'épisode plus ancien reprend la place au premier rafraîchissement.
     */
    @Test
    fun `retirer une serie retire tous ses episodes`() {
        val start = listOf(episode(42, 5), episode(42, 1), movie("movie_7"))
        val list  = RecentPolicy.remove(start, "42_5")

        assertEquals(listOf("movie_7"), list.map { it.id })
    }

    @Test
    fun `retirer un film ne touche pas au reste`() {
        val start = listOf(movie("movie_7"), episode(42, 1))
        val list  = RecentPolicy.remove(start, "movie_7")

        assertEquals(listOf("42_1"), list.map { it.id })
    }

    @Test
    fun `retirer un identifiant absent ne change rien`() {
        val start = listOf(movie("movie_7"))

        assertEquals(start, RecentPolicy.remove(start, "movie_9"))
    }

    // ── La vitrine ne montre pas ce qui est déjà vu (#43) ─────────────────────

    /**
     * Les entrées écrites avant que la règle de fin n'existe portent `progress == duration`.
     * Elles ne peuvent pas être retirées par une migration — la vitrine les écarte à la
     * lecture, sinon la rangée resterait pleine de contenus déjà vus.
     */
    @Test
    fun `un media vu jusqu'au bout ne s'affiche plus`() {
        val fini    = movie("movie_7").copy(progress = 5_400_000L, duration = 5_400_000L)
        val encours = movie("movie_8")

        assertEquals(listOf("movie_8"), RecentPolicy.visible(listOf(fini, encours)).map { it.id })
    }

    @Test
    fun `un direct reste affiche, sa duree est inconnue`() {
        val direct = movie("chaine_1").copy(progress = 7_200_000L, duration = 0L)

        assertEquals(listOf("chaine_1"), RecentPolicy.visible(listOf(direct)).map { it.id })
    }
}
