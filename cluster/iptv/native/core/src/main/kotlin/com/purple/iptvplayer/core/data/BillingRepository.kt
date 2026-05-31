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
            if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
                for (purchase in purchases) handlePurchase(purchase)
            } else {
                _purchaseResult.emit(PurchaseResult.Error(result.debugMessage))
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

    suspend fun queryProducts() {
        if (!billingClient.isReady) connect()
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(MONTHLY_ID, YEARLY_ID, LIFETIME_ID).map { id ->
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                }
            ).build()

        val (billingResult, productDetailsList) = billingClient.queryProductDetails(params)
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            val sorted = (productDetailsList ?: emptyList()).sortedBy { it.oneTimePurchaseOfferDetails?.priceAmountMicros }
            _products.value = sorted
        }
    }

    fun launchBillingFlow(activity: Activity, product: ProductDetails) {
        val offerDetails = product.oneTimePurchaseOfferDetails ?: return
        val productList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(product)
                .build()
        )
        val params = BillingFlowParams.newBuilder().setProductDetailsParamsList(productList).build()
        billingClient.launchBillingFlow(activity, params)
    }

    suspend fun restorePurchases() {
        if (!billingClient.isReady) connect()
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        val (_, purchases) = billingClient.queryPurchasesAsync(params)
        purchases?.forEach { handlePurchase(it) }
    }

    private suspend fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return
        deliverProduct(purchase.products)
        if (!purchase.isAcknowledged) {
            val ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken).build()
            billingClient.acknowledgePurchase(ackParams)
        }
        _purchaseResult.emit(PurchaseResult.Success(purchase.products.firstOrNull() ?: ""))
    }

    private suspend fun deliverProduct(productIds: List<String>) {
        when {
            productIds.contains(MONTHLY_ID)  -> trialRepo.activateSubscription(30L * 24 * 3600 * 1000)
            productIds.contains(YEARLY_ID)   -> trialRepo.activateSubscription(365L * 24 * 3600 * 1000)
            productIds.contains(LIFETIME_ID) -> trialRepo.setPro()
        }
    }

    fun release() { scope.cancel(); billingClient.endConnection() }
}

sealed class PurchaseResult {
    data class Success(val productId: String) : PurchaseResult()
    data class Error(val message: String) : PurchaseResult()
}
