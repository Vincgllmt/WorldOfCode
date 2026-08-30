package com.purple.iptvplayer.core.data

import com.android.billingclient.api.BillingClient

/**
 * Causes d'échec d'achat, **typées**, que chaque UI traduit avec ses propres ressources.
 *
 * ⚠️ **Aucun libellé ici, ni nulle part ailleurs dans `core`.** Un module sans `Context`
 * ne peut pas savoir dans quelle langue l'utilisateur lit. Cette énumération existait
 * déjà pour les trois causes de l'écran d'achat ; `BillingRepository` la contournait en
 * fabriquant ses propres phrases **en français** (#R9), qui s'affichaient telles quelles
 * dans l'interface anglaise.
 */
enum class PurchaseFailure {
    /** La Play Console ne renvoie aucune offre, ou le service est indisponible. */
    OFFERS_UNAVAILABLE,
    /** La restauration a levé. */
    RESTORE_FAILED,
    /** La restauration a abouti mais ce compte Google ne possède aucun achat. */
    NOTHING_TO_RESTORE,
    /** L'appareil ne sait pas facturer (pas de Play Store, profil restreint…). */
    BILLING_UNAVAILABLE,
    /** Le service Play s'est déconnecté en cours de route. */
    SERVICE_DISCONNECTED,
    /** Le service Play ne répond pas, ou la connexion n'a pas pu s'établir. */
    SERVICE_UNAVAILABLE,
    /** Le produit demandé n'existe pas côté Play Console. */
    ITEM_UNAVAILABLE,
    /** Ce compte possède déjà le produit — c'est une restauration qui s'ignore. */
    ITEM_ALREADY_OWNED,
    /** Configuration de facturation invalide : une erreur de développement, pas d'usage. */
    DEVELOPER_ERROR,
    /** Le produit existe mais ne porte aucune offre exploitable. */
    OFFER_UNAVAILABLE,
    /** Tout le reste. */
    UNKNOWN,
}

/**
 * Traduit un code de retour Play Billing en cause typée.
 *
 * Objet pur, testable sans Android — c'est tout l'intérêt de l'avoir sorti de
 * `BillingRepository`, où la même table produisait directement des phrases françaises.
 */
object BillingPolicy {

    fun failureFor(responseCode: Int): PurchaseFailure = when (responseCode) {
        BillingClient.BillingResponseCode.BILLING_UNAVAILABLE  -> PurchaseFailure.BILLING_UNAVAILABLE
        BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> PurchaseFailure.SERVICE_DISCONNECTED
        BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE  -> PurchaseFailure.SERVICE_UNAVAILABLE
        BillingClient.BillingResponseCode.ITEM_UNAVAILABLE     -> PurchaseFailure.ITEM_UNAVAILABLE
        BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED   -> PurchaseFailure.ITEM_ALREADY_OWNED
        BillingClient.BillingResponseCode.DEVELOPER_ERROR      -> PurchaseFailure.DEVELOPER_ERROR
        else                                                   -> PurchaseFailure.UNKNOWN
    }
}
