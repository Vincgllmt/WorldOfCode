package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Règles d'accès : essai gratuit, abonnement, achat définitif.
 *
 * Instant de référence arbitraire mais fixe — aucun test ne doit dépendre de
 * l'heure réelle de la machine.
 */
class TrialPolicyTest {

    private val now = 1_760_000_000_000L // instant courant simulé
    private val hour = 3_600_000L
    private val day = 86_400_000L

    // ─── P1 : l'abonné payant ne doit jamais être éjecté ──────────────────────

    @Test
    fun `abonnement valide moins de 24h conserve l acces`() {
        val expiry = now + 10 * hour
        val trialStart = now - 30 * day // essai largement expiré

        assertTrue(
            "Un abonné dont l'abonnement expire dans 10 h doit garder l'accès",
            TrialPolicy.hasAccess(now, trialStart, expiry, isPro = false),
        )
    }

    @Test
    fun `abonnement valide moins de 24h compte au moins un jour restant`() {
        val expiry = now + 10 * hour

        assertEquals(
            1,
            TrialPolicy.remainingDays(now, trialStartMs = now - 30 * day, expiryMs = expiry, isPro = false),
        )
    }

    @Test
    fun `abonnement valide a la derniere minute conserve l acces`() {
        val expiry = now + 60_000L

        assertTrue(
            TrialPolicy.hasAccess(now, trialStartMs = now - 30 * day, expiryMs = expiry, isPro = false),
        )
    }

    @Test
    fun `hasAccess et isPremium ne se contredisent jamais`() {
        // Balayage de toute la dernière journée d'abonnement, heure par heure.
        for (h in 0..23) {
            val expiry = now + h * hour + 60_000L
            val premium = TrialPolicy.isPremium(now, expiry, isPro = false)
            val access = TrialPolicy.hasAccess(now, now - 30 * day, expiry, isPro = false)

            assertEquals(
                "Incohérence à H+$h : isPremium=$premium mais hasAccess=$access",
                premium,
                access,
            )
        }
    }

    // ─── P1 (effet de bord) : pas de réattribution d'essai ────────────────────

    @Test
    fun `abonnement expire ne reoffre pas d essai quand la date de debut est perdue`() {
        // Réinstallation : trial_start_date absent, mais l'utilisateur a déjà été abonné.
        assertEquals(
            0,
            TrialPolicy.remainingDays(now, trialStartMs = null, expiryMs = now - day, isPro = false),
        )
    }

    @Test
    fun `abonnement expire ne rend pas l acces via l essai`() {
        assertFalse(
            TrialPolicy.hasAccess(now, trialStartMs = now - 30 * day, expiryMs = now - day, isPro = false),
        )
    }

    // ─── Non-régression : comportements déjà corrects ─────────────────────────

    @Test
    fun `achat definitif donne un acces illimite`() {
        assertEquals(TrialPolicy.PRO_DAYS, TrialPolicy.remainingDays(now, null, null, isPro = true))
        assertTrue(TrialPolicy.hasAccess(now, null, null, isPro = true))
        assertTrue(TrialPolicy.isPremium(now, expiryMs = null, isPro = true))
    }

    @Test
    fun `abonnement de 30 jours retourne 30 jours`() {
        assertEquals(
            30,
            TrialPolicy.remainingDays(now, trialStartMs = null, expiryMs = now + 30 * day, isPro = false),
        )
    }

    @Test
    fun `premier lancement ouvre trois jours d essai`() {
        assertEquals(
            TrialPolicy.TRIAL_DAYS,
            TrialPolicy.remainingDays(now, trialStartMs = null, expiryMs = null, isPro = false),
        )
        assertEquals(
            TrialPolicy.TRIAL_DAYS,
            TrialPolicy.remainingDays(now, trialStartMs = now, expiryMs = null, isPro = false),
        )
    }

    @Test
    fun `l essai decroit jour par jour puis expire`() {
        assertEquals(3, TrialPolicy.remainingDays(now, now - 1 * hour, null, isPro = false))
        assertEquals(2, TrialPolicy.remainingDays(now, now - 25 * hour, null, isPro = false))
        assertEquals(1, TrialPolicy.remainingDays(now, now - 49 * hour, null, isPro = false))
        assertEquals(0, TrialPolicy.remainingDays(now, now - 73 * hour, null, isPro = false))
        assertEquals(0, TrialPolicy.remainingDays(now, now - 365 * day, null, isPro = false))
    }

    @Test
    fun `l essai en cours n est pas premium`() {
        assertTrue(TrialPolicy.hasAccess(now, trialStartMs = now, expiryMs = null, isPro = false))
        assertFalse(TrialPolicy.isPremium(now, expiryMs = null, isPro = false))
    }
}
