package com.purple.iptvplayer.core.data

/**
 * Péremption du catalogue mis en cache sur disque.
 *
 * Logique pure, sans dépendance Android, pour être testable de façon déterministe :
 * l'instant courant est un paramètre.
 *
 * Le portage Kotlin de `CacheService` (Flutter) avait perdu cette durée de vie —
 * le catalogue n'expirait jamais, laissant indéfiniment en place des chaînes
 * supprimées par le fournisseur et des noms obsolètes.
 */
object CachePolicy {

    /** Durée de vie du catalogue en cache — identique à celle du jumeau Flutter. */
    const val TTL_MS = 24L * 60 * 60 * 1000

    /**
     * Un cache n'est servi que si son âge est connu et inférieur au TTL.
     *
     * Un horodatage nul (`File.lastModified()` échoue) ou situé dans le futur
     * (horloge reculée, restauration de sauvegarde) est traité comme périmé : mieux
     * vaut refaire l'appel réseau que servir un contenu dont on ignore l'âge.
     */
    fun isFresh(writtenAtMs: Long, now: Long, ttlMs: Long = TTL_MS): Boolean {
        if (writtenAtMs <= 0L) return false
        val age = now - writtenAtMs
        return age in 0 until ttlMs
    }
}
