package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Réconciliation des droits avec ce que Play connaît réellement (défaut B2).
 *
 * `syncEntitlements()` n'ajoutait que des droits : un achat remboursé, révoqué ou
 * rétrofacturé disparaissait de la réponse de Play sans que l'accès soit jamais
 * retiré. `is_pro_user` restait vrai indéfiniment — y compris dans les
 * `EncryptedSharedPreferences`, couche anti-fraude qui jouait alors **contre**
 * l'éditeur.
 *
 * Le piège de la correction évidente : retirer les droits dès que la liste est vide
 * déconnecterait tous les abonnés légitimes lors d'une simple panne de facturation.
 * D'où la distinction, qui est tout l'objet de cette classe, entre « Play dit que tu
 * n'as rien » et « Play n'a pas répondu ».
 */
class EntitlementReconcilerTest {

    private val monthly  = "purple_monthly_099"
    private val yearly   = "purple_yearly_499"
    private val lifetime = "purple_lifetime_999"

    private fun answered(vararg ids: String) = QueryOutcome.Answered(ids.toList())

    // ── Ce que Play possède est accordé ──────────────────────────────────────

    @Test
    fun `un achat a vie donne l acces definitif`() {
        assertEquals(
            EntitlementDecision.Grant(lifetime),
            EntitlementReconciler.decide(answered(lifetime), answered()),
        )
    }

    @Test
    fun `un abonnement mensuel est accorde`() {
        assertEquals(
            EntitlementDecision.Grant(monthly),
            EntitlementReconciler.decide(answered(), answered(monthly)),
        )
    }

    @Test
    fun `l achat a vie prime sur un abonnement`() {
        assertEquals(
            EntitlementDecision.Grant(lifetime),
            EntitlementReconciler.decide(answered(lifetime), answered(monthly)),
        )
    }

    @Test
    fun `l abonnement annuel prime sur le mensuel`() {
        assertEquals(
            EntitlementDecision.Grant(yearly),
            EntitlementReconciler.decide(answered(), answered(monthly, yearly)),
        )
    }

    // ── Le cœur de B2 : retirer ce que Play ne reconnaît plus ────────────────

    @Test
    fun `Play ne possede plus rien donc l acces est retire`() {
        // Remboursement, révocation, rétrofacturation : les deux catalogues
        // répondent, et ne contiennent plus l'achat.
        assertEquals(
            EntitlementDecision.Revoke,
            EntitlementReconciler.decide(answered(), answered()),
        )
    }

    // ── Le garde-fou : une panne n'est pas une révocation ────────────────────

    @Test
    fun `une panne des deux catalogues ne retire rien`() {
        assertEquals(
            EntitlementDecision.Unknown,
            EntitlementReconciler.decide(QueryOutcome.Failed, QueryOutcome.Failed),
        )
    }

    @Test
    fun `une panne d un seul catalogue ne retire rien`() {
        // INAPP répond « rien », mais SUBS n'a pas répondu : on ne peut pas conclure
        // que l'utilisateur n'a aucun droit.
        assertEquals(
            EntitlementDecision.Unknown,
            EntitlementReconciler.decide(answered(), QueryOutcome.Failed),
        )
        assertEquals(
            EntitlementDecision.Unknown,
            EntitlementReconciler.decide(QueryOutcome.Failed, answered()),
        )
    }

    @Test
    fun `un droit trouve est accorde meme si l autre catalogue est en panne`() {
        // Asymétrie assumée : accorder est sans risque, retirer ne l'est pas.
        assertEquals(
            EntitlementDecision.Grant(lifetime),
            EntitlementReconciler.decide(answered(lifetime), QueryOutcome.Failed),
        )
    }

    @Test
    fun `un produit inconnu ne donne aucun droit et n empeche pas la revocation`() {
        assertEquals(
            EntitlementDecision.Revoke,
            EntitlementReconciler.decide(answered("purple_mystere"), answered()),
        )
    }

    // ── Play n'a autorite que sur ce qu'il a lui-meme installe ───────────────

    @Test
    fun `hors installation par Play, aucune revocation n est possible`() {
        // Mesure sur appareil : sur la variante `.debug`, dont l'applicationId est
        // suffixe, Play repond OK avec une liste VIDE — il ne connait tout simplement
        // pas ce paquet. Conclure « tu ne possedes rien » a retire l'acces a un
        // utilisateur premium. Play ne peut rien dire d'utile d'une installation qui
        // ne vient pas de lui (cf. §9 du CLAUDE.md).
        assertEquals(
            EntitlementDecision.Unknown,
            EntitlementReconciler.decide(answered(), answered(), playIsInstaller = false),
        )
    }

    @Test
    fun `hors installation par Play, un droit reconnu reste accorde`() {
        // Accorder reste sans risque : c'est retirer qui exige de l'autorite.
        assertEquals(
            EntitlementDecision.Grant(lifetime),
            EntitlementReconciler.decide(answered(lifetime), answered(), playIsInstaller = false),
        )
    }
}
