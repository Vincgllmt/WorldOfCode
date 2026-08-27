package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.CredentialsRepository
import com.purple.iptvplayer.core.data.IptvRepository
import com.purple.iptvplayer.core.model.Credentials
import com.purple.iptvplayer.core.model.PlaylistType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

/** Causes d'échec de configuration que l'UI doit savoir traduire. */
enum class SetupFailure {
    INVALID_INPUT,
    NETWORK,
    UNKNOWN,
}

sealed class SetupState {
    object Idle    : SetupState()
    object Loading : SetupState()
    object Success : SetupState()
    /** @param reason cause typée, que chaque UI traduit avec ses propres ressources. */
    data class Error(val reason: SetupFailure) : SetupState()
}

class SetupViewModel(
    private val iptvRepo: IptvRepository,
    private val credRepo: CredentialsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<SetupState>(SetupState.Idle)
    val state: StateFlow<SetupState> = _state.asStateFlow()

    fun submitM3uUrl(url: String) {
        val creds = Credentials.parseUrl(url)
        if (creds == null) {
            _state.value = SetupState.Error(SetupFailure.INVALID_INPUT)
            return
        }
        validateAndSave(creds)
    }

    fun submitXtream(host: String, user: String, pass: String) {
        if (host.isBlank() || user.isBlank() || pass.isBlank()) {
            _state.value = SetupState.Error(SetupFailure.INVALID_INPUT)
            return
        }
        val cleanHost = if (host.endsWith("/")) host.dropLast(1) else host
        validateAndSave(Credentials(host = cleanHost, user = user, pass = pass, type = PlaylistType.XTREAM))
    }

    fun submitLocalFile(path: String) {
        if (path.isBlank()) { _state.value = SetupState.Error(SetupFailure.INVALID_INPUT); return }
        validateAndSave(Credentials(host = path, type = PlaylistType.M3U))
    }

    fun resetState() { _state.value = SetupState.Idle }

    private fun validateAndSave(creds: Credentials) {
        _state.value = SetupState.Loading
        viewModelScope.launch {
            val outcome = runCatching { iptvRepo.validate(creds) }
            _state.value = outcome.fold(
                onSuccess = { validated ->
                    validated?.let { credRepo.save(it) }
                    iptvRepo.invalidateCache()
                    SetupState.Success
                },
                onFailure = { SetupState.Error(it.toSetupFailure()) },
            )
        }
    }
}

/** Mappe une exception vers une cause typée, sans libellé écrit en dur. */
private fun Throwable.toSetupFailure(): SetupFailure = when (this) {
    is IOException -> SetupFailure.NETWORK
    is java.net.UnknownHostException -> SetupFailure.NETWORK
    is java.net.SocketTimeoutException -> SetupFailure.NETWORK
    else -> SetupFailure.UNKNOWN
}
