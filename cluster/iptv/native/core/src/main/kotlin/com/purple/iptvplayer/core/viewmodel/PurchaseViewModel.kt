package com.purple.iptvplayer.core.viewmodel

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.android.billingclient.api.ProductDetails
import com.purple.iptvplayer.core.data.BillingRepository
import com.purple.iptvplayer.core.data.PurchaseResult
import com.purple.iptvplayer.core.data.TrialRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class PurchaseScreenState {
    object Loading    : PurchaseScreenState()
    object Idle       : PurchaseScreenState()
    object Purchasing : PurchaseScreenState()
    data class PurchaseSuccess(val productId: String) : PurchaseScreenState()
    data class PurchaseError(val message: String) : PurchaseScreenState()
}

class PurchaseViewModel(
    private val billingRepo: BillingRepository,
    private val trialRepo: TrialRepository,
) : ViewModel() {

    val products: StateFlow<List<ProductDetails>> = billingRepo.products

    private val _state = MutableStateFlow<PurchaseScreenState>(PurchaseScreenState.Loading)
    val state: StateFlow<PurchaseScreenState> = _state.asStateFlow()

    private val _remainingDays = MutableStateFlow(0)
    val remainingDays: StateFlow<Int> = _remainingDays.asStateFlow()

    private val _isPro = MutableStateFlow(false)
    val isPro: StateFlow<Boolean> = _isPro.asStateFlow()

    init {
        observePurchaseResults()
        viewModelScope.launch {
            _remainingDays.value = trialRepo.getRemainingDays()
            _isPro.value = trialRepo.isPro()
        }
        loadProducts()
    }

    fun loadProducts() = viewModelScope.launch {
        _state.value = PurchaseScreenState.Loading
        runCatching {
            if (!billingRepo.products.value.isEmpty()) {
                _state.value = PurchaseScreenState.Idle; return@launch
            }
            billingRepo.connect()
            billingRepo.queryProducts()
        }
        _state.value = PurchaseScreenState.Idle
    }

    fun purchase(activity: Activity, product: ProductDetails) {
        _state.value = PurchaseScreenState.Purchasing
        billingRepo.launchBillingFlow(activity, product)
    }

    fun restorePurchases() = viewModelScope.launch {
        _state.value = PurchaseScreenState.Purchasing
        runCatching { billingRepo.restorePurchases() }
        _state.value = PurchaseScreenState.Idle
    }

    fun resetState() { _state.value = PurchaseScreenState.Idle }

    private fun observePurchaseResults() = viewModelScope.launch {
        billingRepo.purchaseResult.collect { result ->
            when (result) {
                is PurchaseResult.Success -> {
                    _isPro.value = trialRepo.isPro()
                    _remainingDays.value = trialRepo.getRemainingDays()
                    _state.value = PurchaseScreenState.PurchaseSuccess(result.productId)
                }
                is PurchaseResult.Error -> {
                    _state.value = PurchaseScreenState.PurchaseError(result.message)
                }
            }
        }
    }
}
