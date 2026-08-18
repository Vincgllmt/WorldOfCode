package com.purple.iptvplayer.core.data

/**
 * Règles d'accès à l'application : essai gratuit, abonnement, achat définitif.
 *
 * Logique pure et sans dépendance Android, extraite de [TrialRepository] pour être
 * testable de façon déterministe : l'instant courant est un paramètre, jamais un
 * appel à `System.currentTimeMillis()`.
 *
 * [TrialRepository] reste responsable de la lecture/écriture des valeurs
 * persistées ; toute la décision est ici.
 */
object TrialPolicy {

    /** Durée de l'essai gratuit, en jours. */
    const val TRIAL_DAYS = 3

    /** Valeur sentinelle renvoyée pour un achat définitif (« à vie »). */
    const val PRO_DAYS = 999

    private const val DAY_MS = 86_400_000L

    fun remainingDays(
        now: Long,
        trialStartMs: Long?,
        expiryMs: Long?,
        isPro: Boolean,
    ): Int {
        if (isPro) return PRO_DAYS
        return maxOf(
            subscriptionDaysLeft(now, expiryMs),
            trialDaysLeft(now, trialStartMs, expiryMs),
        )
    }

    /**
     * Jours d'abonnement restants, **arrondis au jour supérieur**.
     *
     * L'arrondi supérieur est essentiel : une troncature ramènerait à `0` tout
     * abonnement expirant dans moins de 24 h, ce qui éjecterait de l'application
     * un client à jour de paiement pendant sa dernière journée.
     */
    private fun subscriptionDaysLeft(now: Long, expiryMs: Long?): Int {
        if (expiryMs == null) return 0
        val remainingMs = expiryMs - now
        if (remainingMs <= 0L) return 0
        return ceilDiv(remainingMs, DAY_MS)
    }

    /**
     * Jours d'essai restants.
     *
     * Un utilisateur ayant déjà souscrit (`expiryMs != null`) dont la date de début
     * d'essai a été perdue — réinstallation, restauration de sauvegarde — ne se voit
     * pas réattribuer un essai gratuit.
     */
    private fun trialDaysLeft(now: Long, trialStartMs: Long?, expiryMs: Long?): Int {
        if (trialStartMs == null) return if (expiryMs == null) TRIAL_DAYS else 0
        val daysPassed = ((now - trialStartMs) / DAY_MS).toInt()
        return (TRIAL_DAYS - daysPassed).coerceAtLeast(0)
    }

    private fun ceilDiv(value: Long, divisor: Long): Int =
        ((value + divisor - 1) / divisor).toInt()

    fun hasAccess(
        now: Long,
        trialStartMs: Long?,
        expiryMs: Long?,
        isPro: Boolean,
    ): Boolean = remainingDays(now, trialStartMs, expiryMs, isPro) > 0

    fun isPremium(
        now: Long,
        expiryMs: Long?,
        isPro: Boolean,
    ): Boolean {
        if (isPro) return true
        return expiryMs != null && expiryMs > now
    }
}
