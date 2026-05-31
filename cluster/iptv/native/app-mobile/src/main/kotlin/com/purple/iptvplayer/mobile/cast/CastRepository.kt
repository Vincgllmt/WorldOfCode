package com.purple.iptvplayer.mobile.cast

import android.content.Context
import android.net.Uri
import com.google.android.gms.cast.MediaInfo
import com.google.android.gms.cast.MediaLoadRequestData
import com.google.android.gms.cast.MediaMetadata
import com.google.android.gms.cast.MediaSeekOptions
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.common.images.WebImage
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManagerListener
import com.google.android.gms.cast.framework.media.RemoteMediaClient
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

data class CastInfo(
    val isConnected: Boolean = false,
    val isConnecting: Boolean = false,
    val deviceName: String = "",
    val mediaTitle: String = "",
    val mediaCover: String? = null,
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val isPlaying: Boolean = false,
)

class CastRepository(private val context: Context) {

    private val _state = MutableStateFlow(CastInfo())
    val state: StateFlow<CastInfo> = _state.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var progressJob: Job? = null

    private data class PendingMedia(val url: String, val title: String, val cover: String?, val startPositionMs: Long = 0L)

    // Media to load when a new cast session starts
    private var pendingMedia: PendingMedia? = null

    private val castContext: CastContext? by lazy {
        runCatching { CastContext.getSharedInstance(context) }.getOrNull()
    }

    private val mediaCallback = object : RemoteMediaClient.Callback() {
        override fun onStatusUpdated() = syncFromClient()
        override fun onMetadataUpdated() = syncFromClient()
    }

    private val sessionListener = object : SessionManagerListener<CastSession> {
        override fun onSessionStarting(session: CastSession) {
            _state.update { it.copy(isConnecting = true) }
        }
        override fun onSessionStarted(session: CastSession, sessionId: String) {
            _state.update { it.copy(isConnected = true, isConnecting = false,
                deviceName = session.castDevice?.friendlyName ?: "") }
            session.remoteMediaClient?.registerCallback(mediaCallback)
            startProgressPolling()
            pendingMedia?.let { pm ->
                scope.launch {
                    delay(800L) // let session fully initialize before loading
                    castMedia(pm.url, pm.title, pm.cover, pm.startPositionMs)
                    pendingMedia = null
                }
            }
        }
        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
            _state.update { it.copy(isConnected = true, isConnecting = false,
                deviceName = session.castDevice?.friendlyName ?: "") }
            session.remoteMediaClient?.registerCallback(mediaCallback)
            startProgressPolling()
        }
        override fun onSessionEnded(session: CastSession, error: Int) {
            session.remoteMediaClient?.unregisterCallback(mediaCallback)
            progressJob?.cancel()
            _state.update { it.copy(isConnected = false, isConnecting = false,
                isPlaying = false, mediaTitle = "", mediaCover = null,
                positionMs = 0L, durationMs = 0L) }
        }
        override fun onSessionSuspended(session: CastSession, reason: Int) {
            _state.update { it.copy(isConnected = false, isPlaying = false) }
        }
        override fun onSessionStartFailed(session: CastSession, error: Int) {
            _state.update { it.copy(isConnecting = false) }
        }
        override fun onSessionEnding(session: CastSession) {}
        override fun onSessionResumeFailed(session: CastSession, error: Int) {}
        override fun onSessionResuming(session: CastSession, sessionId: String) {}
    }

    init {
        castContext?.sessionManager?.addSessionManagerListener(sessionListener, CastSession::class.java)
        // Restore state if already connected (e.g., app restart while casting)
        castContext?.sessionManager?.currentCastSession?.takeIf { it.isConnected }?.let { session ->
            _state.update { it.copy(isConnected = true,
                deviceName = session.castDevice?.friendlyName ?: "") }
            session.remoteMediaClient?.registerCallback(mediaCallback)
            startProgressPolling()
        }
    }

    /** Call when user is on a content screen so media auto-loads on cast connect. */
    fun setPendingMedia(url: String, title: String, cover: String?, startPositionMs: Long = 0L) {
        pendingMedia = PendingMedia(url, title, cover, startPositionMs)
        if (_state.value.isConnected) {
            castMedia(url, title, cover, startPositionMs)
            pendingMedia = null
        }
    }

    fun clearPendingMedia() { pendingMedia = null }

    fun castMedia(url: String, title: String, cover: String?, startPositionMs: Long = 0L) {
        val client = currentClient ?: return
        val contentType = when {
            url.contains(".m3u8", ignoreCase = true) -> "application/x-mpegURL"
            url.contains(".mpd",  ignoreCase = true) -> "application/dash+xml"
            else                                     -> "video/mp2t"
        }
        val metadata = MediaMetadata(MediaMetadata.MEDIA_TYPE_MOVIE).apply {
            putString(MediaMetadata.KEY_TITLE, title)
            cover?.let { runCatching { addImage(WebImage(Uri.parse(it))) } }
        }
        val mediaInfo = MediaInfo.Builder(url)
            .setStreamType(MediaInfo.STREAM_TYPE_BUFFERED)
            .setContentType(contentType)
            .setMetadata(metadata)
            .build()
        client.load(
            MediaLoadRequestData.Builder()
                .setMediaInfo(mediaInfo)
                .setAutoplay(true)
                .setCurrentTime(startPositionMs)
                .build()
        )
        _state.update { it.copy(mediaTitle = title, mediaCover = cover, isPlaying = true) }
    }

    fun play()  = currentClient?.play()
    fun pause() = currentClient?.pause()

    fun stop() {
        currentClient?.stop()
        _state.update { it.copy(mediaTitle = "", mediaCover = null,
            positionMs = 0L, durationMs = 0L, isPlaying = false) }
    }

    fun seekTo(posMs: Long) {
        currentClient?.seek(
            MediaSeekOptions.Builder()
                .setPosition(posMs)
                .setResumeState(MediaSeekOptions.RESUME_STATE_UNCHANGED)
                .build()
        )
        _state.update { it.copy(positionMs = posMs) }
    }

    fun skipForward(ms: Long = 10_000L) =
        seekTo((_state.value.positionMs + ms).coerceAtMost(_state.value.durationMs.coerceAtLeast(1L)))

    fun skipBackward(ms: Long = 10_000L) =
        seekTo((_state.value.positionMs - ms).coerceAtLeast(0L))

    fun disconnect() = castContext?.sessionManager?.endCurrentSession(true)

    private val currentClient: RemoteMediaClient?
        get() = castContext?.sessionManager?.currentCastSession?.remoteMediaClient

    private fun syncFromClient() {
        val client = currentClient ?: return
        val status = client.mediaStatus ?: return
        _state.update { it.copy(
            isPlaying  = client.isPlaying,
            positionMs = client.approximateStreamPosition.coerceAtLeast(0L),
            durationMs = (status.mediaInfo?.streamDuration ?: 0L).coerceAtLeast(0L),
        ) }
    }

    private fun startProgressPolling() {
        progressJob?.cancel()
        progressJob = scope.launch {
            while (isActive) {
                syncFromClient()
                delay(1_000)
            }
        }
    }

    fun release() {
        castContext?.sessionManager?.removeSessionManagerListener(sessionListener, CastSession::class.java)
        scope.cancel()
    }
}
