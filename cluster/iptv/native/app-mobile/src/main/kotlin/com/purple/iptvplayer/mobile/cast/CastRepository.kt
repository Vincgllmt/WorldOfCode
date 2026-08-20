package com.purple.iptvplayer.mobile.cast

import android.content.Context
import android.net.Uri
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.player.CastFormats
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
    /** Extension refusée par le récepteur, si une diffusion a été écartée. */
    val unsupportedFormat: String? = null,
)

class CastRepository(
    private val context: Context,
    private val progressRepo: ProgressRepository,
) {

    private val _state = MutableStateFlow(CastInfo())
    val state: StateFlow<CastInfo> = _state.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var progressJob: Job? = null

    private data class PendingMedia(
        val url: String,
        val title: String,
        val cover: String?,
        val startPositionMs: Long = 0L,
        val mediaId: String? = null,
        val type: String? = null,
    )

    /** Contenu en cours de diffusion, pour enregistrer la reprise de lecture. */
    private var castedMediaId: String? = null
    private var castedTitle:   String? = null
    private var castedCover:   String? = null
    private var castedUrl:     String? = null
    private var castedType:    String? = null

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
                    castMedia(pm.url, pm.title, pm.cover, pm.startPositionMs, pm.mediaId, pm.type)
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
            // Dernier enregistrement avant de tout perdre : sans lui, arrêter le cast
            // juste après avoir avancé effaçait jusqu'à 10 s de progression.
            scope.launch { saveCastProgress() }
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
    fun setPendingMedia(
        url: String,
        title: String,
        cover: String?,
        startPositionMs: Long = 0L,
        mediaId: String? = null,
        type: String? = null,
    ) {
        pendingMedia = PendingMedia(url, title, cover, startPositionMs, mediaId, type)
        if (_state.value.isConnected) {
            castMedia(url, title, cover, startPositionMs, mediaId, type)
            pendingMedia = null
        }
    }

    fun clearPendingMedia() { pendingMedia = null }

    fun clearUnsupportedFormat() { _state.update { it.copy(unsupportedFormat = null) } }

    fun castMedia(
        url: String,
        title: String,
        cover: String?,
        startPositionMs: Long = 0L,
        mediaId: String? = null,
        type: String? = null,
    ) {
        val client = currentClient ?: return
        castedMediaId = mediaId
        castedTitle   = title
        castedCover   = cover
        castedUrl     = url
        castedType    = type
        // Un format non lu par le récepteur ne partira jamais : autant le dire tout de
        // suite plutôt que de laisser l'utilisateur devant une télécommande inerte.
        if (!CastFormats.isCastable(url)) {
            _state.update { it.copy(unsupportedFormat = CastFormats.extensionOf(url) ?: "") }
            return
        }
        _state.update { it.copy(unsupportedFormat = null) }
        val contentType = CastFormats.contentType(url)
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
            var sinceLastSave = 0
            while (isActive) {
                syncFromClient()
                sinceLastSave++
                // Toutes les 10 s, comme le lecteur local. Sans cela, un contenu regardé
                // sur le Chromecast n'apparaissait jamais dans « Reprendre la lecture » :
                // l'écran du lecteur se ferme au démarrage du cast, et c'est lui qui
                // enregistrait la progression — depuis un lecteur local mis en pause.
                if (sinceLastSave >= 10) {
                    sinceLastSave = 0
                    saveCastProgress()
                }
                delay(1_000)
            }
        }
    }

    private suspend fun saveCastProgress() {
        val id  = castedMediaId ?: return
        val st  = _state.value
        if (!st.isPlaying || st.positionMs <= 5_000L) return
        runCatching {
            progressRepo.saveProgress(
                mediaId    = id,
                positionMs = st.positionMs,
                url        = castedUrl,
                title      = castedTitle,
                cover      = castedCover,
                type       = castedType,
                durationMs = st.durationMs,
            )
        }
    }

    fun release() {
        castContext?.sessionManager?.removeSessionManagerListener(sessionListener, CastSession::class.java)
        scope.cancel()
    }
}
