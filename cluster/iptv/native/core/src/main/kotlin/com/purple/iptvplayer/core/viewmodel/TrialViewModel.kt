package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.AccessState
import com.purple.iptvplayer.core.data.BillingRepository
import com.purple.iptvplayer.core.data.TrialRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

class TrialViewModel(
    private val trialRepo: TrialRepository,
    private val billingRepo: BillingRepository,
) : ViewModel() {

    private val _hasAccess = MutableStateFlow<Boolean?>(null)
    val hasAccess: StateFlow<Boolean?> = _hasAccess.asStateFlow()

    private val _remainingDays = MutableStateFlow(0)
    val remainingDays: StateFlow<Int> = _remainingDays.asStateFlow()

    private val _isPro = MutableStateFlow(false)
    val isPro: StateFlow<Boolean> = _isPro.asStateFlow()

    /**
     * À quel titre l'utilisateur a accès — essai, abonnement ou achat définitif.
     *
     * `null` tant que la résolution n'a pas abouti, comme [hasAccess] : une UI qui
     * lirait la valeur trop tôt afficherait l'état d'un utilisateur expiré (cf. P6).
     */
    private val _accessState = MutableStateFlow<AccessState?>(null)
    val accessState: StateFlow<AccessState?> = _accessState.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        trialRepo.initTrial()

        // Demander à Play ce qu'il en est AVANT de décider de l'accès : c'est lui qui
        // fait foi sur les abonnements, et il renouvelle sans prévenir l'application.
        // Sous délai borné — l'écran de lancement attend cette résolution, un service
        // de facturation lent ou injoignable ne doit pas figer le démarrage.
        withTimeoutOrNull(BILLING_SYNC_TIMEOUT_MS) {
            runCatching { billingRepo.syncEntitlements() }
        }

        val state = trialRepo.getAccessState()
        val days = trialRepo.getRemainingDays()
        _accessState.value = state
        _remainingDays.value = days
        _isPro.value = state is AccessState.Pro
        _hasAccess.value = state.hasAccess
    }

    private companion object {
        const val BILLING_SYNC_TIMEOUT_MS = 4_000L
    }
}
