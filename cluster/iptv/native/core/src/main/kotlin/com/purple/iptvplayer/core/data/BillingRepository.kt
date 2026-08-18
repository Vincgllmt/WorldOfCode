package com.purple.iptvplayer.core.data

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

class BillingRepository(
    private val context: Context,
    private val trialRepo: TrialRepository,
) {
    companion object {
        const val MONTHLY_ID  = "purple_monthly_099"
        const val YEARLY_ID   = "purple_yearly_499"
        const val LIFETIME_ID = "purple_lifetime_999"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    val products: StateFlow<List<ProductDetails>> = _products.asStateFlow()

    private val _purchaseResult = MutableSharedFlow<PurchaseResult>()
    val purchaseResult: SharedFlow<PurchaseResult> = _purchaseResult.asSharedFlow()

    private val purchasesUpdatedListener = PurchasesUpdatedListener { result, purchases ->
        scope.launch {
            when {
                result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null ->
                    for (purchase in purchases) handlePurchase(purchase)
                // Une annulation n'est pas une erreur : la signaler comme telle affichait
                // un message d'échec à qui refermait simplement la feuille de paiement.
                result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED ->
                    _purchaseResult.emit(PurchaseResult.Cancelled)
                else -> _purchaseResult.emit(PurchaseResult.Error(describe(result)))
            }
        }
    }

    private val billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(purchasesUpdatedListener)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    suspend fun connect(): Boolean = suspendCancellableCoroutine { cont ->
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (cont.isActive) cont.resume(result.responseCode == BillingClient.BillingResponseCode.OK) {}
            }
            override fun onBillingServiceDisconnected() {
                if (cont.isActive) cont.resume(false) {}
            }
        })
    }

    /**
     * Interroge les trois produits **dans les deux catalogues**, achat unique et
     * abonnement.
     *
     * N'interroger que `INAPP` faisait disparaître silencieusement tout produit
     * déclaré comme abonnement dans la Play Console : l'écran n'en proposait plus
     * qu'un seul, sans que rien ne l'explique. Un type qui ne correspond à aucun
     * produit renvoie simplement une liste vide, la double interrogation est donc
     * sans risque.
     */
    suspend fun queryProducts() {
        if (!billingClient.isReady && !connect()) {
            _purchaseResult.emit(PurchaseResult.Error("Service de facturation indisponible."))
            return
        }

        val found     = mutableListOf<ProductDetails>()
        val failures  = mutableListOf<String>()

        for (type in listOf(BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS)) {
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(MONTHLY_ID, YEARLY_ID, LIFETIME_ID).map { id ->
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(id)
                            .setProductType(type)
                            .build()
                    }
                ).build()

            val (billingResult, productDetailsList) = billingClient.queryProductDetails(params)
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                found += productDetailsList ?: emptyList()
            } else {
                failures += "$type: ${describe(billingResult)}"
            }
        }

        _products.value = found.distinctBy { it.productId }.sortedBy { it.priceMicros() }

        // Un échec total doit être visible. Sans cela, l'écran affichait « aucun produit
        // disponible » aussi bien quand la Play Console est mal configurée que quand le
        // service est en panne, sans moyen de distinguer les deux.
        if (found.isEmpty() && failures.isNotEmpty()) {
            _purchaseResult.emit(PurchaseResult.Error(failures.joinToString(" | ")))
        }
    }

    /**
     * Prix affiché, quel que soit le type de produit.
     *
     * Un abonnement n'a pas d'`oneTimePurchaseOfferDetails` : trier dessus plaçait
     * tous les abonnements en tête, à prix nul.
     */
    private fun ProductDetails.priceMicros(): Long =
        oneTimePurchaseOfferDetails?.priceAmountMicros
            ?: subscriptionOfferDetails
                ?.firstOrNull()
                ?.pricingPhases
                ?.pricingPhaseList
                ?.firstOrNull()
                ?.priceAmountMicros
            ?: Long.MAX_VALUE

    /**
     * Ouvre la feuille de paiement pour un achat unique **ou** un abonnement.
     *
     * L'implémentation précédente sortait en silence sur
     * `oneTimePurchaseOfferDetails ?: return` : pour un abonnement, appuyer sur le
     * bouton ne produisait strictement rien, sans message. Un abonnement exige en
     * outre un `offerToken`, qui manquait.
     */
    fun launchBillingFlow(activity: Activity, product: ProductDetails) {
        val builder = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product)

        if (product.productType == BillingClient.ProductType.SUBS) {
            val offerToken = product.subscriptionOfferDetails?.firstOrNull()?.offerToken
            if (offerToken == null) {
                scope.launch { _purchaseResult.emit(PurchaseResult.Error("Offre indisponible pour ${product.productId}.")) }
                return
            }
            builder.setOfferToken(offerToken)
        } else if (product.oneTimePurchaseOfferDetails == null) {
            scope.launch { _purchaseResult.emit(PurchaseResult.Error("Offre indisponible pour ${product.productId}.")) }
            return
        }

        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(builder.build()))
            .build()
        billingClient.launchBillingFlow(activity, params)
    }

    /**
     * Restaure les achats, **abonnements compris**.
     *
     * N'interroger que `INAPP` signifiait qu'un abonné réinstallant l'application
     * ne récupérait jamais son accès.
     */
    suspend fun restorePurchases(): Int {
        if (!billingClient.isReady && !connect()) {
            _purchaseResult.emit(PurchaseResult.Error("Service de facturation indisponible."))
            return 0
        }
        return syncEntitlements()
    }

    /**
     * Réaligne les droits d'accès locaux sur ce que Play connaît réellement.
     *
     * **À appeler à chaque démarrage.** Play gère le renouvellement des abonnements
     * mais ne réveille pas l'application pour l'en informer : sans cette
     * synchronisation, l'échéance locale posée à la souscription expirait au bout de
     * 30 jours et un abonné à jour de paiement se retrouvait bloqué, sans autre
     * recours que d'aller appuyer lui-même sur « Restaurer » — tous les mois.
     *
     * Silencieuse par construction : au démarrage, un service de facturation
     * indisponible ne doit pas produire de message d'erreur.
     *
     * @return le nombre d'achats actifs pris en compte.
     */
    suspend fun syncEntitlements(): Int {
        if (!billingClient.isReady && !connect()) return 0
        var restored = 0
        for (type in listOf(BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS)) {
            val params = QueryPurchasesParams.newBuilder().setProductType(type).build()
            val (_, purchases) = billingClient.queryPurchasesAsync(params)
            purchases?.forEach { if (handlePurchase(it)) restored++ }
        }
        return restored
    }

    private suspend fun handlePurchase(purchase: Purchase): Boolean {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return false
        deliverProduct(purchase.products)
        if (!purchase.isAcknowledged) {
            val ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken).build()
            billingClient.acknowledgePurchase(ackParams)
        }
        _purchaseResult.emit(PurchaseResult.Success(purchase.products.firstOrNull() ?: ""))
        return true
    }

    private suspend fun deliverProduct(productIds: List<String>) {
        when {
            productIds.contains(MONTHLY_ID)  -> trialRepo.activateSubscription(30L * 24 * 3600 * 1000)
            productIds.contains(YEARLY_ID)   -> trialRepo.activateSubscription(365L * 24 * 3600 * 1000)
            productIds.contains(LIFETIME_ID) -> trialRepo.setPro()
        }
    }

    /** Message exploitable : `debugMessage` est souvent vide et n'est pas destiné à l'utilisateur. */
    private fun describe(result: BillingResult): String {
        val code = result.responseCode
        val label = when (code) {
            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE  -> "Facturation indisponible sur cet appareil"
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> "Service Play déconnecté"
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE  -> "Service Play indisponible"
            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE     -> "Produit introuvable dans la Play Console"
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED   -> "Produit déjà possédé"
            BillingClient.BillingResponseCode.DEVELOPER_ERROR      -> "Configuration de facturation invalide"
            else -> "Erreur de facturation"
        }
        return result.debugMessage.takeIf { it.isNotBlank() }?.let { "$label ($code) : $it" } ?: "$label ($code)"
    }

    fun release() { scope.cancel(); billingClient.endConnection() }
}

sealed class PurchaseResult {
    data class Success(val productId: String) : PurchaseResult()
    data class Error(val message: String) : PurchaseResult()
    /** Feuille de paiement refermée par l'utilisateur — pas un échec. */
    object Cancelled : PurchaseResult()
}
