package com.purple.iptvplayer.core.viewmodel

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.android.billingclient.api.ProductDetails
import com.purple.iptvplayer.core.data.BillingRepository
import com.purple.iptvplayer.core.data.PurchaseFailure
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
    /**
     * Échec d'achat, de chargement d'offres ou de restauration.
     *
     * ⚠️ **Ne jamais y mettre un libellé écrit en dur.** Les trois messages qui vivaient
     * ici étaient en **français codé en dur**, dans un module partagé par les deux
     * applications : « Aucun achat à restaurer sur ce compte Google. » s'affichait tel quel
     * dans l'interface anglaise de l'app TV (observé §43). C'est le défaut M1 transposé
     * dans `core`, où il touche les deux UI au lieu d'une.
     *
     * Il portait aussi un second champ `message`, présenté comme « déjà localisé par Play
     * Billing » et **prioritaire** sur la cause typée. La prémisse était fausse : ce champ
     * recevait soit le préfixe français fabriqué par `BillingRepository.describe()`, soit
     * le `message` d'une exception — technique et anglais. Comme il passait devant
     * [reason], les ressources traduites n'étaient presque jamais affichées. Champ retiré
     * (#R9, §67).
     *
     * @param reason cause **typée**, que chaque UI traduit avec ses propres ressources.
     */
    data class PurchaseError(val reason: PurchaseFailure) : PurchaseScreenState()
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
        if (billingRepo.products.value.isNotEmpty()) {
            _state.value = PurchaseScreenState.Idle
            return@launch
        }
        _state.value = PurchaseScreenState.Loading
        // L'échec était auparavant avalé par un runCatching muet : l'écran retombait
        // sur « aucun produit disponible » sans distinguer une Play Console mal
        // configurée d'une panne de service.
        val outcome = runCatching {
            billingRepo.connect()
            billingRepo.queryProducts()
        }
        _state.value = outcome.fold(
            onSuccess = { PurchaseScreenState.Idle },
            onFailure = { PurchaseScreenState.PurchaseError(PurchaseFailure.OFFERS_UNAVAILABLE) },
        )
    }

    fun purchase(activity: Activity, product: ProductDetails) {
        _state.value = PurchaseScreenState.Purchasing
        billingRepo.launchBillingFlow(activity, product)
    }

    fun restorePurchases() = viewModelScope.launch {
        _state.value = PurchaseScreenState.Purchasing
        val outcome = runCatching { billingRepo.restorePurchases() }
        _isPro.value = trialRepo.isPro()
        _remainingDays.value = trialRepo.getRemainingDays()
        // Une restauration qui ne trouve rien doit le dire : rester silencieuse
        // laissait croire à un échec de l'application.
        _state.value = when {
            outcome.isFailure     -> PurchaseScreenState.PurchaseError(PurchaseFailure.RESTORE_FAILED)
            outcome.getOrNull() == 0 -> PurchaseScreenState.PurchaseError(PurchaseFailure.NOTHING_TO_RESTORE)
            else                  -> PurchaseScreenState.Idle
        }
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
                    // Cause typée : c'est l'UI qui choisit la langue, pas `core`.
                    _state.value = PurchaseScreenState.PurchaseError(result.reason)
                }
                // Refermer la feuille de paiement ramène simplement à l'écran, sans message d'échec.
                PurchaseResult.Cancelled -> {
                    _state.value = PurchaseScreenState.Idle
                }
            }
        }
    }
}
