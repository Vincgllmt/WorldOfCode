package com.purple.iptvplayer.core.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Péremption du catalogue en cache.
 *
 * Le portage Kotlin de `CacheService` (Flutter) avait perdu la durée de vie de 24 h :
 * le catalogue n'expirait jamais. Conséquences observées sur appareil — chaînes
 * supprimées par le fournisseur toujours affichées, noms obsolètes figés, nouvelles
 * chaînes jamais visibles, et cela indéfiniment faute de déconnexion manuelle.
 */
class CachePolicyTest {

    private val now = 1_760_000_000_000L
    private val hour = 3_600_000L

    @Test
    fun `un cache tout juste ecrit est frais`() {
        assertTrue(CachePolicy.isFresh(writtenAtMs = now, now = now))
    }

    @Test
    fun `un cache de vingt-trois heures est encore frais`() {
        assertTrue(CachePolicy.isFresh(writtenAtMs = now - 23 * hour, now = now))
    }

    @Test
    fun `un cache de vingt-cinq heures est perime`() {
        assertFalse(CachePolicy.isFresh(writtenAtMs = now - 25 * hour, now = now))
    }

    @Test
    fun `un cache vieux d une semaine est perime`() {
        assertFalse(CachePolicy.isFresh(writtenAtMs = now - 7 * 24 * hour, now = now))
    }

    @Test
    fun `la duree de vie est de vingt-quatre heures`() {
        assertTrue(CachePolicy.isFresh(writtenAtMs = now - CachePolicy.TTL_MS + 1, now = now))
        assertFalse(CachePolicy.isFresh(writtenAtMs = now - CachePolicy.TTL_MS, now = now))
    }

    @Test
    fun `un horodatage indisponible est traite comme perime`() {
        // File.lastModified() renvoie 0 quand la date est illisible : ne pas servir
        // un cache dont on ignore l'âge.
        assertFalse(CachePolicy.isFresh(writtenAtMs = 0L, now = now))
    }

    @Test
    fun `un horodatage dans le futur est traite comme perime`() {
        // Horloge reculée, restauration de sauvegarde : un cache « à venir » est suspect.
        assertFalse(CachePolicy.isFresh(writtenAtMs = now + hour, now = now))
    }
}
