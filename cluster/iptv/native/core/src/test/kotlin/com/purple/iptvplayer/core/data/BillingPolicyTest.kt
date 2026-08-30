package com.purple.iptvplayer.core.data

import com.android.billingclient.api.BillingClient
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Un code de retour Play Billing se traduit en cause **typée**, jamais en phrase (#R9).
 *
 * Le défaut d'origine : `BillingRepository` portait la même table, mais elle produisait
 * directement des libellés **français** — « Service Play indisponible » — dans un module
 * partagé par les deux applications, donc affichés tels quels en anglais. Sortir la
 * décision ici la rend vérifiable sans Android, et interdit d'y remettre un libellé :
 * le type de retour ne le permet plus.
 */
class BillingPolicyTest {

    @Test
    fun `chaque code connu a sa cause propre`() {
        val attendu = mapOf(
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE  to PurchaseFailure.BILLING_UNAVAILABLE,
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED to PurchaseFailure.SERVICE_DISCONNECTED,
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE  to PurchaseFailure.SERVICE_UNAVAILABLE,
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE     to PurchaseFailure.ITEM_UNAVAILABLE,
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED   to PurchaseFailure.ITEM_ALREADY_OWNED,
            BillingClient.BillingResponseCode.DEVELOPER_ERROR      to PurchaseFailure.DEVELOPER_ERROR,
        )
        for ((code, cause) in attendu) {
            assertEquals("code $code", cause, BillingPolicy.failureFor(code))
        }
    }

    @Test
    fun `deux codes distincts ne se confondent pas`() {
        // Le test précédent passerait encore si tout retournait la même chose ; celui-ci
        // ne le peut pas.
        val causes = listOf(
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE,
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED,
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE,
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE,
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED,
            BillingClient.BillingResponseCode.DEVELOPER_ERROR,
        ).map { BillingPolicy.failureFor(it) }
        assertEquals(causes.size, causes.toSet().size)
    }

    @Test
    fun `un code inconnu tombe sur UNKNOWN plutot que de lever`() {
        assertEquals(PurchaseFailure.UNKNOWN, BillingPolicy.failureFor(9_999))
        assertEquals(PurchaseFailure.UNKNOWN, BillingPolicy.failureFor(-42))
    }

    @Test
    fun `OK et USER_CANCELED ne sont pas des echecs a afficher`() {
        // Ils sont interceptés en amont — `PurchaseResult.Success` et `Cancelled`. S'ils
        // arrivaient ici, mieux vaut UNKNOWN qu'une cause qui accuserait le service.
        assertEquals(PurchaseFailure.UNKNOWN, BillingPolicy.failureFor(BillingClient.BillingResponseCode.OK))
        assertEquals(PurchaseFailure.UNKNOWN, BillingPolicy.failureFor(BillingClient.BillingResponseCode.USER_CANCELED))
    }

    @Test
    fun `toute cause de facturation est atteignable par un code`() {
        // Garde-fou : une cause ajoutée à l'énumération sans être branchée ici serait
        // muette — c'est le motif « déclaré mais jamais branché » du projet.
        val produites = (-1..12).map { BillingPolicy.failureFor(it) }.toSet()
        val attenduesDepuisPlay = setOf(
            PurchaseFailure.BILLING_UNAVAILABLE,
            PurchaseFailure.SERVICE_DISCONNECTED,
            PurchaseFailure.SERVICE_UNAVAILABLE,
            PurchaseFailure.ITEM_UNAVAILABLE,
            PurchaseFailure.ITEM_ALREADY_OWNED,
            PurchaseFailure.DEVELOPER_ERROR,
            PurchaseFailure.UNKNOWN,
        )
        assertEquals(attenduesDepuisPlay, produites)
    }
}
