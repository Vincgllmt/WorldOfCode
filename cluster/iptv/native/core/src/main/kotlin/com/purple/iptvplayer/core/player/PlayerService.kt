package com.purple.iptvplayer.core.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.C
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PlayerState(
    val status: PlayerStatus = PlayerStatus.IDLE,
    val title: String = "",
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val playbackSpeed: Float = 1f,
    val error: String? = null,
)

enum class PlayerStatus { IDLE, BUFFERING, PLAYING, PAUSED, ENDED, ERROR }

class PlayerService(context: Context) {

    val player: ExoPlayer = ExoPlayer.Builder(context).build()

    private val _state = MutableStateFlow(PlayerState())
    val state: StateFlow<PlayerState> = _state.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var progressJob: Job? = null

    init {
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                _state.value = _state.value.copy(
                    status = when (playbackState) {
                        Player.STATE_BUFFERING -> PlayerStatus.BUFFERING
                        Player.STATE_READY     -> if (player.isPlaying) PlayerStatus.PLAYING else PlayerStatus.PAUSED
                        Player.STATE_ENDED     -> PlayerStatus.ENDED
                        else                   -> PlayerStatus.IDLE
                    },
                    durationMs = player.duration.coerceAtLeast(0L),
                )
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                _state.value = _state.value.copy(
                    status = if (isPlaying) PlayerStatus.PLAYING else PlayerStatus.PAUSED,
                )
                if (isPlaying) startProgressPolling() else progressJob?.cancel()
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                super.onMediaItemTransition(mediaItem, reason)
                _state.value = _state.value.copy(
                    title = mediaItem?.mediaMetadata?.title?.toString() ?: ""
                )
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                _state.value = _state.value.copy(status = PlayerStatus.ERROR, error = error.message)
            }
        })
    }

    fun play(url: String, title: String = "", mediaId: String? = null) {
        val metadata = MediaMetadata.Builder().setTitle(title).build()
        val mediaItem = MediaItem.Builder().setUri(url).setMediaId(mediaId ?: url).setMediaMetadata(metadata).build()
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        _state.value = PlayerState(status = PlayerStatus.BUFFERING, title = title)
    }

    fun playPlaylist(items: List<Pair<String, String>>, startIndex: Int = 0) {
        val mediaItems = items.map {
            val metadata = MediaMetadata.Builder().setTitle(it.second).build()
            MediaItem.Builder().setUri(it.first).setMediaId(it.first).setMediaMetadata(metadata).build()
        }
        player.setMediaItems(mediaItems, startIndex, C.TIME_UNSET)
        player.prepare()
        player.playWhenReady = true
        _state.value = PlayerState(
            status = PlayerStatus.BUFFERING,
            title = items.getOrNull(startIndex)?.second ?: ""
        )
    }

    fun resume() { player.play() }

    fun pause() { player.pause() }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs)
        _state.value = _state.value.copy(positionMs = positionMs)
    }

    fun setSpeed(speed: Float) {
        player.setPlaybackSpeed(speed)
        _state.value = _state.value.copy(playbackSpeed = speed)
    }

    fun stop() {
        player.stop()
        progressJob?.cancel()
        _state.value = PlayerState()
    }

    fun release() {
        scope.cancel()
        player.release()
    }

    fun currentPositionMs(): Long = player.currentPosition.coerceAtLeast(0L)
    fun durationMs(): Long = player.duration.coerceAtLeast(0L)

    private fun startProgressPolling() {
        progressJob?.cancel()
        progressJob = scope.launch {
            while (isActive) {
                _state.value = _state.value.copy(
                    positionMs = player.currentPosition.coerceAtLeast(0L),
                    durationMs = player.duration.coerceAtLeast(0L),
                )
                delay(1_000)
            }
        }
    }
}
