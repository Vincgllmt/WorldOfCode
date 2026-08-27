// `CancellableContinuation.resume(value) { onCancellation }` est encore marquée
// expérimentale. Elle est utilisée par les quatre enveloppes suspend de ce fichier ;
// l'opt-in est déclaré une fois ici plutôt que répété sur chacune.
@file:OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)

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

interface BillingRepository {
    val products: StateFlow<List<ProductDetails>>
    val purchaseResult: SharedFlow<PurchaseResult>
    suspend fun connect(): Boolean
    suspend fun queryProducts()
    fun launchBillingFlow(activity: Activity, product: ProductDetails): Boolean
    suspend fun restorePurchases(): Int
    suspend fun syncEntitlements(): Int
    fun release()

    companion object {
        const val MONTHLY_ID  = BillingProducts.MONTHLY_ID
        const val YEARLY_ID   = BillingProducts.YEARLY_ID
        const val LIFETIME_ID = BillingProducts.LIFETIME_ID
    }
}

class BillingRepositoryImpl(
    private val context: Context,
    private val trialRepo: TrialRepository,
) : BillingRepository {
    companion object {
        private const val PLAY_STORE_PACKAGE = "com.android.vending"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val _products = MutableStateFlow<List<ProductDetails>>(emptyList())
    override val products: StateFlow<List<ProductDetails>> = _products.asStateFlow()

    private val _purchaseResult = MutableSharedFlow<PurchaseResult>()
    override val purchaseResult: SharedFlow<PurchaseResult> = _purchaseResult.asSharedFlow()

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

    override suspend fun connect(): Boolean = suspendCancellableCoroutine { cont ->
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
    override suspend fun queryProducts() {
        if (!billingClient.isReady && !connect()) {
            _purchaseResult.emit(PurchaseResult.Error("Service de facturation indisponible."))
            return
        }

        val found     = mutableListOf<ProductDetails>()
        val failures  = mutableListOf<String>()

        for (type in listOf(BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS)) {
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(BillingRepository.MONTHLY_ID, BillingRepository.YEARLY_ID, BillingRepository.LIFETIME_ID).map { id ->
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(id)
                            .setProductType(type)
                            .build()
                    }
                ).build()

            val (billingResult, productDetailsList) = billingClient.queryProductDetailsSuspend(params)
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                found += productDetailsList
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
    override fun launchBillingFlow(activity: Activity, product: ProductDetails): Boolean {
        val builder = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product)

        if (product.productType == BillingClient.ProductType.SUBS) {
            val offerToken = product.subscriptionOfferDetails?.firstOrNull()?.offerToken
            if (offerToken == null) {
                scope.launch { _purchaseResult.emit(PurchaseResult.Error("Offre indisponible pour ${product.productId}.")) }
                return false
            }
            builder.setOfferToken(offerToken)
        } else if (product.oneTimePurchaseOfferDetails == null) {
            scope.launch { _purchaseResult.emit(PurchaseResult.Error("Offre indisponible pour ${product.productId}.")) }
            return false
        }

        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(builder.build()))
            .build()
        val result = billingClient.launchBillingFlow(activity, params)
        if (result.responseCode != BillingClient.BillingResponseCode.OK) {
            scope.launch { _purchaseResult.emit(PurchaseResult.Error(describe(result))) }
            return false
        }
        return true
    }

    /**
     * Restaure les achats, **abonnements compris**.
     *
     * N'interroger que `INAPP` signifiait qu'un abonné réinstallant l'application
     * ne récupérait jamais son accès.
     */
    override suspend fun restorePurchases(): Int {
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
    override suspend fun syncEntitlements(): Int {
        if (!billingClient.isReady && !connect()) return 0

        val outcomes = mutableMapOf<String, QueryOutcome>()
        val owned    = mutableListOf<Purchase>()

        for (type in listOf(BillingClient.ProductType.INAPP, BillingClient.ProductType.SUBS)) {
            val params = QueryPurchasesParams.newBuilder().setProductType(type).build()
            val (result, purchases) = billingClient.queryPurchasesSuspend(params)
            // Le BillingResult était jeté (`val (_, …)`) : c'est ce qui rendait
            // impossible de distinguer « tu ne possèdes rien » d'une panne, et donc
            // impossible de retirer un droit sans risquer de déconnecter les abonnés
            // légitimes.
            outcomes[type] = if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                val purchased = purchases.filter {
                    it.purchaseState == Purchase.PurchaseState.PURCHASED
                }
                owned += purchased
                QueryOutcome.Answered(purchased.flatMap { it.products })
            } else {
                QueryOutcome.Failed
            }
        }

        // Acquitter les achats neufs, quel que soit le verdict : sans acquittement,
        // Play rembourse automatiquement au bout de trois jours.
        owned.forEach { acknowledgeIfNeeded(it) }

        val decision = EntitlementReconciler.decide(
            inapp = outcomes.getValue(BillingClient.ProductType.INAPP),
            subs  = outcomes.getValue(BillingClient.ProductType.SUBS),
            playIsInstaller = installedByPlay(),
        )
        return when (decision) {
            is EntitlementDecision.Grant -> {
                deliverProduct(listOf(decision.productId))
                _purchaseResult.emit(PurchaseResult.Success(decision.productId))
                1
            }
            EntitlementDecision.Revoke -> {
                // Remboursement, révocation, rétrofacturation : Play a répondu et ne
                // reconnaît plus rien. L'essai en cours n'est pas touché.
                trialRepo.revokeEntitlements()
                0
            }
            EntitlementDecision.Unknown -> 0
        }
    }

    /**
     * L'application a-t-elle été installée par le Play Store ?
     *
     * Seule condition sous laquelle la liste d'achats de Play fait autorité pour ce
     * paquet. Une build installée à la main — variante de debug, partage interne,
     * chargement latéral — reçoit « OK, aucun achat » parce que Play ne connaît pas
     * l'`applicationId`, pas parce que l'utilisateur n'a rien acheté.
     */
    private fun installedByPlay(): Boolean = runCatching {
        val pm = context.packageManager
        val installer = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            pm.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
            @Suppress("DEPRECATION")
            pm.getInstallerPackageName(context.packageName)
        }
        installer == PLAY_STORE_PACKAGE
    }.getOrDefault(false)

    private suspend fun acknowledgeIfNeeded(purchase: Purchase) {
        if (purchase.isAcknowledged) return
        val ackParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken).build()
        billingClient.acknowledgePurchaseSuspend(ackParams)
    }

    private suspend fun handlePurchase(purchase: Purchase): Boolean {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return false
        deliverProduct(purchase.products)
        acknowledgeIfNeeded(purchase)
        _purchaseResult.emit(PurchaseResult.Success(purchase.products.firstOrNull() ?: ""))
        return true
    }

    private suspend fun deliverProduct(productIds: List<String>) {
        when {
            productIds.contains(BillingRepository.MONTHLY_ID)  -> trialRepo.activateSubscription(30L * 24 * 3600 * 1000)
            productIds.contains(BillingRepository.YEARLY_ID)   -> trialRepo.activateSubscription(365L * 24 * 3600 * 1000)
            productIds.contains(BillingRepository.LIFETIME_ID) -> trialRepo.setPro()
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

    override fun release() { scope.cancel(); billingClient.endConnection() }
}

/**
 * Enveloppes `suspend` des trois appels asynchrones de Play Billing.
 *
 * Elles remplacent l'artefact **`billing-ktx`**, abandonné lors du passage en v9 :
 * celui-ci dépend de `kotlin-stdlib` 2.2.10, dont les métadonnées sont illisibles par
 * le compilateur Kotlin 2.0 du projet — au point que `listOf` lui-même devenait non
 * résolu. L'artefact `billing` est du Java pur, sans dépendance Kotlin, et migre donc
 * sans toucher au toolchain.
 *
 * Même forme que [BillingRepository.connect], qui enveloppait déjà `startConnection`
 * à la main : ces trois fonctions ne font que prolonger une pratique existante.
 */
private suspend fun BillingClient.queryProductDetailsSuspend(
    params: QueryProductDetailsParams,
): Pair<BillingResult, List<ProductDetails>> = suspendCancellableCoroutine { cont ->
    queryProductDetailsAsync(params) { result, queryResult ->
        // v8+ : la réponse est un QueryProductDetailsResult, non plus une List directe.
        if (cont.isActive) cont.resume(result to queryResult.productDetailsList) {}
    }
}

private suspend fun BillingClient.queryPurchasesSuspend(
    params: QueryPurchasesParams,
): Pair<BillingResult, List<Purchase>> = suspendCancellableCoroutine { cont ->
    queryPurchasesAsync(params) { result, purchases ->
        if (cont.isActive) cont.resume(result to purchases) {}
    }
}

private suspend fun BillingClient.acknowledgePurchaseSuspend(
    params: AcknowledgePurchaseParams,
): BillingResult = suspendCancellableCoroutine { cont ->
    acknowledgePurchase(params) { result ->
        if (cont.isActive) cont.resume(result) {}
    }
}

sealed class PurchaseResult {
    data class Success(val productId: String) : PurchaseResult()
    data class Error(val message: String) : PurchaseResult()
    /** Feuille de paiement refermée par l'utilisateur — pas un échec. */
    object Cancelled : PurchaseResult()
}
