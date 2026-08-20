package com.purple.iptvplayer.mobile.viewmodel

import androidx.lifecycle.ViewModel
import com.purple.iptvplayer.mobile.cast.CastInfo
import com.purple.iptvplayer.mobile.cast.CastRepository
import kotlinx.coroutines.flow.StateFlow

class CastViewModel(private val repo: CastRepository) : ViewModel() {
    val state: StateFlow<CastInfo> = repo.state

    fun setPendingMedia(url: String, title: String, cover: String?, startPositionMs: Long = 0L, mediaId: String? = null, type: String? = null) =
        repo.setPendingMedia(url, title, cover, startPositionMs, mediaId, type)
    fun clearPendingMedia() = repo.clearPendingMedia()
    fun castMedia(url: String, title: String, cover: String?, startPositionMs: Long = 0L, mediaId: String? = null, type: String? = null) = repo.castMedia(url, title, cover, startPositionMs, mediaId, type)
    fun play()  = repo.play()
    fun pause() = repo.pause()
    fun stop()  = repo.stop()
    fun seekTo(posMs: Long)  = repo.seekTo(posMs)
    fun skipForward()  = repo.skipForward()
    fun skipBackward() = repo.skipBackward()
    fun disconnect()   = repo.disconnect()
    fun clearUnsupportedFormat() = repo.clearUnsupportedFormat()
    fun isCasting(): Boolean = repo.state.value.isConnected

    override fun onCleared() {
        super.onCleared()
        repo.clearPendingMedia()
    }
}
