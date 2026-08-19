package com.purple.iptvplayer.core.data

/**
 * Prix à afficher pour une offre, quel que soit son type.
 *
 * Un abonnement n'a pas d'`oneTimePurchaseOfferDetails` : lire ce seul champ
 * faisait afficher « N/A » aux deux abonnements sur l'écran d'achat, alors que
 * Play en connaissait le prix (vérifié sur appareil : la feuille de paiement
 * annonçait 0,99 € pour une offre affichée « N/A »).
 *
 * Le même défaut avait déjà été corrigé pour le **tri** dans
 * `BillingRepository.priceMicros()`, mais pas pour l'**affichage**. La décision
 * est extraite ici pour qu'on ne puisse plus la corriger d'un seul côté.
 */
object OfferPrice {

    /** Affiché quand aucun prix n'est connu — un tiret cadratin, pas un sigle technique. */
    const val UNKNOWN = "—"

    /**
     * @param oneTime prix d'un achat unique, `null` pour un abonnement.
     * @param subscriptionPhases prix des phases tarifaires, dans l'ordre. La première
     *   est celle qui sera facturée en premier (une éventuelle période d'essai).
     */
    fun formatted(oneTime: String?, subscriptionPhases: List<String>): String =
        oneTime?.takeIf { it.isNotBlank() }
            ?: subscriptionPhases.firstOrNull { it.isNotBlank() }
            ?: UNKNOWN
}
