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

sealed class SetupState {
    object Idle    : SetupState()
    object Loading : SetupState()
    object Success : SetupState()
    data class Error(val message: String) : SetupState()
}

class SetupViewModel(
    private val iptvRepo: IptvRepository,
    private val credRepo: CredentialsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<SetupState>(SetupState.Idle)
    val state: StateFlow<SetupState> = _state.asStateFlow()

    fun submitM3uUrl(url: String) {
        val creds = Credentials.parseUrl(url)
            ?: run { _state.value = SetupState.Error("Invalid M3U URL. Please provide a valid playlist URL."); return }
        validateAndSave(creds)
    }

    fun submitXtream(host: String, user: String, pass: String) {
        if (host.isBlank() || user.isBlank() || pass.isBlank()) {
            _state.value = SetupState.Error("All fields are required.")
            return
        }
        val cleanHost = if (host.endsWith("/")) host.dropLast(1) else host
        validateAndSave(Credentials(host = cleanHost, user = user, pass = pass, type = PlaylistType.XTREAM))
    }

    fun submitLocalFile(path: String) {
        if (path.isBlank()) { _state.value = SetupState.Error("Please select a file."); return }
        validateAndSave(Credentials(host = path, type = PlaylistType.M3U))
    }

    fun resetState() { _state.value = SetupState.Idle }

    private fun validateAndSave(creds: Credentials) {
        _state.value = SetupState.Loading
        viewModelScope.launch {
            val valid = runCatching { iptvRepo.validate(creds) }.getOrNull()
            if (valid != null) {
                credRepo.save(valid)
                iptvRepo.invalidateCache()
                _state.value = SetupState.Success
            } else {
                _state.value = SetupState.Error("Could not connect to the server. Please check your credentials.")
            }
        }
    }
}
