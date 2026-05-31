package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.model.Episode
import com.purple.iptvplayer.core.player.PlayerService
import com.purple.iptvplayer.core.player.PlayerState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class PlayerViewModel(
    val playerService: PlayerService,
    private val progressRepo: ProgressRepository,
    private val settingsRepo: com.purple.iptvplayer.core.data.SettingsRepository,
) : ViewModel() {

    val playerState: StateFlow<PlayerState> = playerService.state

    val subtitleSize       = settingsRepo.subtitleSize
    val subtitleColor      = settingsRepo.subtitleColor
    val subtitleBackground = settingsRepo.subtitleBackground
    val language           = settingsRepo.language

    private var currentMediaId: String? = null
    private var currentUrl:     String? = null
    private var currentTitle:   String? = null
    private var currentCover:   String? = null
    private var currentType:    String? = null

    fun playMedia(url: String, title: String, mediaId: String? = null, startPositionMs: Long = 0L, cover: String? = null, type: String? = null) {
        currentMediaId = mediaId
        currentUrl     = url
        currentTitle   = title
        currentCover   = cover
        currentType    = type
        playerService.play(url, title, mediaId)
        if (startPositionMs > 0L) {
            viewModelScope.launch {
                delay(800) // wait for ExoPlayer to buffer before seeking
                playerService.seekTo(startPositionMs)
            }
        }
        startProgressSaving()
    }

    fun playWithEpisodes(episodes: List<Episode>, startIndex: Int, mediaId: String? = null, seriesCover: String? = null) {
        currentMediaId = mediaId
        val ep = episodes.getOrNull(startIndex)
        currentUrl     = ep?.url
        currentTitle   = ep?.title
        currentCover   = ep?.cover?.takeIf { it.isNotEmpty() } ?: seriesCover
        currentType    = "series"
        
        val items = episodes.map { Pair(it.url, it.title) }
        playerService.playPlaylist(items, startIndex)
        startProgressSaving()
    }

    fun nextEpisode(): Boolean {
        if (playerService.player.hasNextMediaItem()) {
            playerService.player.seekToNextMediaItem()
            // We should update currentUrl/title here too if we want perfect history for auto-advance
            // But usually the first one is enough or we rely on transition callback.
            return true
        }
        return false
    }

    fun previousEpisode(): Boolean {
        if (playerService.player.hasPreviousMediaItem()) {
            playerService.player.seekToPreviousMediaItem()
            return true
        }
        return false
    }

    fun pause()  = playerService.pause()
    fun resume() = playerService.resume()
    fun seekTo(positionMs: Long) = playerService.seekTo(positionMs)
    fun restart() = playerService.seekTo(0L)
    fun setSpeed(speed: Float) = playerService.setSpeed(speed)
    fun stop() { saveProgressNow(); playerService.stop() }

    fun hasPreviousEpisode(): Boolean = playerService.player.hasPreviousMediaItem()
    fun hasNextEpisode(): Boolean = playerService.player.hasNextMediaItem()
    fun currentEpisodeIndex(): Int = playerService.player.currentMediaItemIndex

    fun getNextMediaTitle(): String? {
        val nextIdx = playerService.player.currentMediaItemIndex + 1
        if (nextIdx < playerService.player.mediaItemCount) {
            return playerService.player.getMediaItemAt(nextIdx).mediaMetadata.title?.toString()
        }
        return null
    }

    fun updateSubtitleSize(size: Float) {
        viewModelScope.launch { settingsRepo.setSubtitleSize(size) }
    }

    fun updateSubtitleColor(color: String) {
        viewModelScope.launch { settingsRepo.setSubtitleColor(color) }
    }

    fun updateSubtitleBackground(enabled: Boolean) {
        viewModelScope.launch { settingsRepo.setSubtitleBackground(enabled) }
    }

    fun updateLanguage(lang: String) {
        viewModelScope.launch { settingsRepo.setLanguage(lang) }
    }

    private fun startProgressSaving() {
        viewModelScope.launch {
            while (true) {
                delay(10_000)
                saveProgressNow()
            }
        }
    }

    private fun saveProgressNow() {
        val id = currentMediaId ?: return
        val pos = playerService.currentPositionMs()
        val dur = playerService.state.value.durationMs
        if (pos > 5_000L) {
            viewModelScope.launch { 
                progressRepo.saveProgress(
                    mediaId    = id, 
                    positionMs = pos,
                    url        = currentUrl,
                    title      = currentTitle,
                    cover      = currentCover,
                    type       = currentType,
                    durationMs = dur
                ) 
            }
        }
    }

    suspend fun getSavedProgress(mediaId: String): Long = progressRepo.getProgress(mediaId)

    override fun onCleared() {
        super.onCleared()
        val id = currentMediaId ?: return
        val pos = playerService.currentPositionMs()
        val dur = playerService.state.value.durationMs
        if (pos > 5_000L) {
            CoroutineScope(Dispatchers.IO).launch {
                progressRepo.saveProgress(
                    mediaId    = id,
                    positionMs = pos,
                    url        = currentUrl,
                    title      = currentTitle,
                    cover      = currentCover,
                    type       = currentType,
                    durationMs = dur
                )
            }
        }
    }
}
