package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * B3 — prix affiché sur l'écran d'achat.
 *
 * `PurchaseScreen` lisait `oneTimePurchaseOfferDetails?.formattedPrice ?: "N/A"`,
 * champ nul pour un abonnement : les deux abonnements s'affichaient « N/A » alors
 * que Play connaissait leur prix (0,99 €, vérifié sur la feuille de paiement).
 *
 * Exactement le défaut déjà corrigé pour le **tri** dans `priceMicros()` ; la
 * correction avait oublié l'**affichage**. La décision est extraite ici pour
 * qu'on ne puisse plus la corriger d'un seul côté.
 */
class OfferPriceTest {

    @Test
    fun `achat unique affiche son prix`() {
        assertEquals("9,99 €", OfferPrice.formatted(oneTime = "9,99 €", subscriptionPhases = emptyList()))
    }

    @Test
    fun `abonnement affiche le prix de sa premiere phase tarifaire`() {
        assertEquals(
            "C'est le cas qui affichait « N/A » sur l'appareil",
            "0,99 €",
            OfferPrice.formatted(oneTime = null, subscriptionPhases = listOf("0,99 €")),
        )
    }

    @Test
    fun `abonnement a plusieurs phases retient la premiere`() {
        // Offre d'essai puis prix courant : c'est la première phase qui est facturée.
        assertEquals(
            "0,00 €",
            OfferPrice.formatted(oneTime = null, subscriptionPhases = listOf("0,00 €", "4,99 €")),
        )
    }

    @Test
    fun `achat unique prime si les deux sont presents`() {
        assertEquals("9,99 €", OfferPrice.formatted(oneTime = "9,99 €", subscriptionPhases = listOf("0,99 €")))
    }

    @Test
    fun `repli seulement si aucun prix n est connu`() {
        assertEquals(OfferPrice.UNKNOWN, OfferPrice.formatted(oneTime = null, subscriptionPhases = emptyList()))
    }

    @Test
    fun `une phase vide n est pas un prix`() {
        assertEquals(OfferPrice.UNKNOWN, OfferPrice.formatted(oneTime = null, subscriptionPhases = listOf("", "  ")))
    }

    @Test
    fun `un prix vide pour un achat unique retombe sur l abonnement`() {
        assertEquals("0,99 €", OfferPrice.formatted(oneTime = "  ", subscriptionPhases = listOf("0,99 €")))
    }
}
