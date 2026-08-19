package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * UX-1 — état d'accès présenté à l'utilisateur.
 *
 * Le code ne distinguait qu'`isPro`, ce qui faisait annoncer « Essai gratuit :
 * 30 jours restants » à un abonné payant. La distinction qui manque est
 * **permanent / temporaire** : elle seule décide si un décompte a du sens.
 */
class AccessStateTest {

    private val now = 1_760_000_000_000L
    private val hour = 3_600_000L
    private val day = 86_400_000L

    @Test
    fun `achat a vie donne un etat permanent, sans decompte`() {
        assertEquals(
            "Un achat définitif n'a rien à décompter",
            AccessState.Pro,
            TrialPolicy.accessState(now, trialStartMs = now, expiryMs = null, isPro = true),
        )
    }

    @Test
    fun `achat a vie prime sur un abonnement encore actif`() {
        assertEquals(
            AccessState.Pro,
            TrialPolicy.accessState(now, trialStartMs = null, expiryMs = now + 20 * day, isPro = true),
        )
    }

    @Test
    fun `abonnement actif est un etat premium temporaire, pas un essai`() {
        assertEquals(
            "C'est le cœur du défaut : un abonné n'est pas un utilisateur d'essai",
            AccessState.Subscribed(daysLeft = 30),
            TrialPolicy.accessState(now, trialStartMs = now, expiryMs = now + 30 * day, isPro = false),
        )
    }

    @Test
    fun `abonnement expirant dans moins de 24h reste un abonnement, arrondi au jour superieur`() {
        // Même exigence que P1 : une troncature éjecterait un client à jour de paiement.
        assertEquals(
            AccessState.Subscribed(daysLeft = 1),
            TrialPolicy.accessState(now, trialStartMs = now - 30 * day, expiryMs = now + 10 * hour, isPro = false),
        )
    }

    @Test
    fun `abonnement prime sur un essai encore en cours`() {
        // L'essai vaut 3 jours, l'abonnement 30 : on ne doit pas annoncer le plus petit,
        // ni surtout le qualifier d'essai.
        assertEquals(
            AccessState.Subscribed(daysLeft = 30),
            TrialPolicy.accessState(now, trialStartMs = now, expiryMs = now + 30 * day, isPro = false),
        )
    }

    @Test
    fun `essai en cours reste un essai, avec son decompte`() {
        assertEquals(
            AccessState.Trial(daysLeft = 3),
            TrialPolicy.accessState(now, trialStartMs = now, expiryMs = null, isPro = false),
        )
    }

    @Test
    fun `essai entame decompte les jours restants`() {
        assertEquals(
            AccessState.Trial(daysLeft = 1),
            TrialPolicy.accessState(now, trialStartMs = now - 2 * day, expiryMs = null, isPro = false),
        )
    }

    @Test
    fun `essai epuise sans abonnement donne un etat expire`() {
        assertEquals(
            AccessState.Expired,
            TrialPolicy.accessState(now, trialStartMs = now - 5 * day, expiryMs = null, isPro = false),
        )
    }

    @Test
    fun `abonnement expire et essai epuise donnent un etat expire`() {
        assertEquals(
            AccessState.Expired,
            TrialPolicy.accessState(now, trialStartMs = now - 5 * day, expiryMs = now - day, isPro = false),
        )
    }

    @Test
    fun `abonnement expire ne reattribue pas d essai`() {
        // Même garde que P1 : un ancien abonné dont la date d'essai est perdue
        // (réinstallation) ne doit pas se voir offrir 3 jours gratuits.
        assertEquals(
            AccessState.Expired,
            TrialPolicy.accessState(now, trialStartMs = null, expiryMs = now - day, isPro = false),
        )
    }

    // ─── cohérence avec les règles d'accès déjà en place ──────────────────────

    @Test
    fun `l etat premium coincide avec isPremium`() {
        val cases = listOf(
            Triple(null as Long?, now + day, false),   // abonné
            Triple(now as Long?, null as Long?, true), // à vie
            Triple(now as Long?, null as Long?, false),// essai
        )
        for ((trialStart, expiry, pro) in cases) {
            val state = TrialPolicy.accessState(now, trialStart, expiry, pro)
            assertEquals(
                "accessState et isPremium doivent toujours s'accorder ($state)",
                TrialPolicy.isPremium(now, expiry, pro),
                state.isPremium,
            )
        }
    }

    @Test
    fun `l etat expire coincide avec l absence d acces`() {
        val state = TrialPolicy.accessState(now, now - 5 * day, null, false)
        assertEquals(
            TrialPolicy.hasAccess(now, now - 5 * day, null, false),
            state != AccessState.Expired,
        )
    }
}
