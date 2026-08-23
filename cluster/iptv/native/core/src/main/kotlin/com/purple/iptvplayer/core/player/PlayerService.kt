package com.purple.iptvplayer.core.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
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
    /** Index de l'élément courant dans la liste de lecture. */
    val mediaItemIndex: Int = 0,
    val error: String? = null,
)

enum class PlayerStatus { IDLE, BUFFERING, PLAYING, PAUSED, ENDED, ERROR }

/**
 * Réconciliation des statuts du lecteur.
 *
 * **Le défaut corrigé (G1, cause réelle).** ExoPlayer notifie `onPlayerError`, puis
 * bascule en `STATE_IDLE` — ce qui déclenche `onPlaybackStateChanged`, dont la branche
 * `else` posait `PlayerStatus.IDLE` **par-dessus** `PlayerStatus.ERROR`. Le statut d'erreur
 * ne survivait donc pas à l'appel suivant.
 *
 * C'est pour cela que l'écran de lecture TV restait noir et muet, et — la logique vivant
 * dans `core` — **le bloc d'erreur du mobile n'a jamais fonctionné non plus**, bien qu'il
 * soit écrit depuis toujours (`PlayerScreen.kt:208`). L'audit avait attribué G1 à l'absence
 * de rendu côté TV : c'était vrai mais second.
 */
object PlayerStatusPolicy {

    /**
     * @param previous statut courant, avant l'événement.
     * @param incoming statut déduit du nouvel état de lecture.
     *
     * `ERROR` n'est effacé que par une **relance** — `BUFFERING` ou tout état actif — et
     * jamais par le `IDLE` qui suit mécaniquement l'échec.
     */
    fun reconcile(previous: PlayerStatus, incoming: PlayerStatus): PlayerStatus =
        if (previous == PlayerStatus.ERROR && incoming == PlayerStatus.IDLE) PlayerStatus.ERROR
        else incoming
}

class PlayerService(context: Context) {

    val player: ExoPlayer = ExoPlayer.Builder(context).build()

    private val _state = MutableStateFlow(PlayerState())
    val state: StateFlow<PlayerState> = _state.asStateFlow()

    // ── Versions VF / VOSTFR ─────────────────────────────────────────────────
    // La décision vit dans VersionPolicy (logique pure, testée) ; ce service ne fait
    // que traduire les pistes ExoPlayer vers elle et appliquer son verdict. Les deux
    // UI consomment ces flux — la sélection de pistes ne doit pas être réécrite dans
    // chacune, c'est ce qui a produit la divergence de §28.

    private val _audioTracks = MutableStateFlow<List<TrackInfo>>(emptyList())
    val audioTracks: StateFlow<List<TrackInfo>> = _audioTracks.asStateFlow()

    private val _textTracks = MutableStateFlow<List<TrackInfo>>(emptyList())
    val textTracks: StateFlow<List<TrackInfo>> = _textTracks.asStateFlow()

    private val _availableVersions = MutableStateFlow<Set<VersionMode>>(emptySet())
    val availableVersions: StateFlow<Set<VersionMode>> = _availableVersions.asStateFlow()

    private val _selectedVersion = MutableStateFlow<VersionMode?>(null)
    val selectedVersion: StateFlow<VersionMode?> = _selectedVersion.asStateFlow()

    /** Retrouve la piste ExoPlayer derrière l'identifiant opaque d'un [TrackInfo]. */
    private var trackHandles: Map<String, Pair<Tracks.Group, Int>> = emptyMap()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var progressJob: Job? = null

    init {
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                val incoming = when (playbackState) {
                    Player.STATE_BUFFERING -> PlayerStatus.BUFFERING
                    Player.STATE_READY     -> if (player.isPlaying) PlayerStatus.PLAYING else PlayerStatus.PAUSED
                    Player.STATE_ENDED     -> PlayerStatus.ENDED
                    else                   -> PlayerStatus.IDLE
                }
                _state.value = _state.value.copy(
                    // Sans cette réconciliation, le STATE_IDLE qui suit `onPlayerError`
                    // effaçait le statut ERROR — cf. PlayerStatusPolicy.
                    status     = PlayerStatusPolicy.reconcile(_state.value.status, incoming),
                    durationMs = player.duration.coerceAtLeast(0L),
                )
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                // Même garde : `isPlaying = false` accompagne un échec et poserait PAUSED
                // par-dessus ERROR, ce qui donnerait un lecteur « en pause » sur un flux
                // qui n'a jamais démarré.
                val incoming = if (isPlaying) PlayerStatus.PLAYING else PlayerStatus.PAUSED
                _state.value = _state.value.copy(
                    status = if (_state.value.status == PlayerStatus.ERROR && !isPlaying)
                                 PlayerStatus.ERROR else incoming,
                )
                if (isPlaying) startProgressPolling() else progressJob?.cancel()
            }

            override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                super.onMediaItemTransition(mediaItem, reason)
                _state.value = _state.value.copy(
                    title = mediaItem?.mediaMetadata?.title?.toString() ?: "",
                    mediaItemIndex = player.currentMediaItemIndex,
                )
            }

            override fun onTracksChanged(tracks: Tracks) {
                refreshTracks(tracks)
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                _state.value = _state.value.copy(status = PlayerStatus.ERROR, error = error.message)
            }
        })
    }

    private fun resetTracks() {
        trackHandles             = emptyMap()
        _audioTracks.value       = emptyList()
        _textTracks.value        = emptyList()
        _availableVersions.value = emptySet()
        _selectedVersion.value   = null
    }

    private fun refreshTracks(tracks: Tracks) {
        val handles = mutableMapOf<String, Pair<Tracks.Group, Int>>()
        val audio   = mutableListOf<TrackInfo>()
        val text    = mutableListOf<TrackInfo>()
        var selectedAudio: TrackInfo? = null
        var selectedText:  TrackInfo? = null

        tracks.groups.forEachIndexed { groupIndex, group ->
            if (group.type != C.TRACK_TYPE_AUDIO && group.type != C.TRACK_TYPE_TEXT) return@forEachIndexed
            for (trackIndex in 0 until group.length) {
                val format = group.getTrackFormat(trackIndex)
                val id = "$groupIndex:$trackIndex"
                val info = TrackInfo(
                    id       = id,
                    language = format.language,
                    label    = format.label,
                    // Une piste « forcée » ne porte que les passages en langue
                    // étrangère : c'est elle qui paraît « ne rien afficher ».
                    isForced = (format.selectionFlags and C.SELECTION_FLAG_FORCED) != 0,
                    // `allowExceedsCapabilities = true` : on n'écarte que ce que
                    // l'appareil ne sait **pas du tout** décoder. Une piste seulement
                    // au-delà des capacités reste jouable, quitte à saccader — la
                    // refuser priverait l'utilisateur d'un choix qui fonctionne.
                    isSupported = group.isTrackSupported(trackIndex, /* allowExceedsCapabilities = */ true),
                    isSelected  = group.isTrackSelected(trackIndex),
                )
                handles[id] = group to trackIndex
                if (group.type == C.TRACK_TYPE_AUDIO) {
                    audio += info
                    if (group.isTrackSelected(trackIndex)) selectedAudio = info
                } else {
                    text += info
                    if (group.isTrackSelected(trackIndex)) selectedText = info
                }
            }
        }

        trackHandles            = handles
        _audioTracks.value      = audio
        _textTracks.value       = text
        _availableVersions.value = VersionPolicy.availableModes(audio, text)
        _selectedVersion.value   = VersionPolicy.detect(selectedAudio, selectedText)
    }

    // ── Sélection manuelle des pistes ────────────────────────────────────────
    // Le dialogue « Pistes et sous-titres » écrivait cette séquence lui-même, dans
    // chacune des deux UI. Elle vit ici, une fois, avec le garde-fou qui manquait aux
    // trois copies : on ne pose pas d'override sur une piste que le décodeur refuse
    // (cf. [TrackPolicy]).

    /**
     * Bascule sur la piste audio [id].
     *
     * @return `false` si la piste est inconnue ou non prise en charge — l'appelant peut
     *   alors le dire à l'utilisateur au lieu de le laisser devant un écran d'erreur.
     */
    fun selectAudioTrack(id: String): Boolean {
        val track  = _audioTracks.value.firstOrNull { it.id == id } ?: return false
        if (!TrackPolicy.isSelectable(track)) return false
        val handle = trackHandles[id] ?: return false
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .setOverrideForType(
                TrackSelectionOverride(handle.first.mediaTrackGroup, listOf(handle.second)),
            )
            .build()
        return true
    }

    /**
     * Bascule sur la piste de sous-titres [id], ou les coupe quand [id] est `null`.
     *
     * Couper les sous-titres est **toujours** possible : c'est le seul moyen de sortir
     * d'une piste illisible, il ne doit dépendre d'aucune capacité de décodage.
     */
    fun selectTextTrack(id: String?): Boolean {
        if (id == null) {
            player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                .build()
            return true
        }
        val track  = _textTracks.value.firstOrNull { it.id == id } ?: return false
        if (!TrackPolicy.isSelectable(track)) return false
        val handle = trackHandles[id] ?: return false
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            .setOverrideForType(
                TrackSelectionOverride(handle.first.mediaTrackGroup, listOf(handle.second)),
            )
            .build()
        return true
    }

    /**
     * Rend au lecteur sa sélection automatique.
     *
     * Les `trackSelectionParameters` **survivent à `setMediaItem`** : sans cet appel, une
     * relance après échec rejouait le flux avec l'override fautif et échouait à
     * l'identique. Le bouton « Réessayer » de l'écran d'erreur ne pouvait donc pas
     * aboutir — l'utilisateur était enfermé.
     */
    fun clearTrackOverrides() {
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon()
            .clearOverrides()
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            .build()
    }

    /**
     * Bascule le média sur la version demandée. Sans effet si elle n'est pas
     * disponible — l'UI ne doit de toute façon proposer que [availableVersions].
     */
    fun selectVersion(mode: VersionMode) {
        val choice = VersionPolicy.resolve(mode, _audioTracks.value, _textTracks.value) ?: return
        // Même garde-fou que la sélection manuelle : une version dont la piste audio
        // n'est pas décodable ne doit pas être appliquée, elle ne produirait qu'une
        // erreur de lecture.
        if (!TrackPolicy.canSelect(choice.audio) || !TrackPolicy.canSelect(choice.subtitle)) return
        var params = player.trackSelectionParameters.buildUpon()

        choice.audio?.let { info ->
            trackHandles[info.id]?.let { (group, index) ->
                params = params.setOverrideForType(
                    TrackSelectionOverride(group.mediaTrackGroup, listOf(index)),
                )
            }
        }

        params = if (choice.subtitle == null) {
            params.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
        } else {
            val p = params.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
            trackHandles[choice.subtitle.id]
                ?.let { (group, index) ->
                    p.setOverrideForType(TrackSelectionOverride(group.mediaTrackGroup, listOf(index)))
                }
                ?: p
        }

        player.trackSelectionParameters = params.build()
        _selectedVersion.value = mode
    }

    fun play(url: String, title: String = "", mediaId: String? = null) {
        val metadata = MediaMetadata.Builder().setTitle(title).build()
        val mediaItem = MediaItem.Builder().setUri(url).setMediaId(mediaId ?: url).setMediaMetadata(metadata).build()
        player.setMediaItem(mediaItem)
        player.prepare()
        player.playWhenReady = true
        resetTracks()
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
