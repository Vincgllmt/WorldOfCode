package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.model.Episode
import com.purple.iptvplayer.core.model.EpisodeTitle
import com.purple.iptvplayer.core.player.PlayerService
import com.purple.iptvplayer.core.player.PlayerState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.isActive
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

    // Contexte de lecture d'une série, pour suivre l'avance de la liste.
    private var episodes:            List<Episode> = emptyList()
    private var episodesSeriesId:    Int? = null
    private var episodeIndex:        Int = 0
    /** Dernière durée connue, pour marquer un épisode terminé comme vu. */
    private var lastKnownDurationMs: Long = 0L

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

    /**
     * Lit une saison à partir de [startIndex].
     *
     * [seriesId] et non un `mediaId` déjà construit : la liste avance toute seule, et
     * l'identifiant de progression doit suivre. Auparavant `currentMediaId` était figé
     * au premier épisode — la position de l'épisode 2 était donc enregistrée sous
     * l'identifiant de l'épisode 1, qui se retrouvait marqué à tort pendant que le 2
     * n'enregistrait rien. Le code le signalait lui-même en commentaire, sans le
     * corriger.
     */
    fun playWithEpisodes(
        episodes: List<Episode>,
        startIndex: Int,
        seriesId: Int,
        seriesCover: String? = null,
    ) {
        this.episodes         = episodes
        this.episodesSeriesId = seriesId
        this.episodeIndex     = startIndex
        currentType           = "series"
        applyEpisode(startIndex, seriesCover)

        val items = episodes.map { Pair(it.url, it.title) }
        playerService.playPlaylist(items, startIndex)
        observeEpisodeTransitions(seriesCover)
        startProgressSaving()
    }

    private fun applyEpisode(index: Int, seriesCover: String?) {
        val ep = episodes.getOrNull(index) ?: return
        val seriesId = episodesSeriesId ?: return
        currentMediaId = EpisodeTitle.progressId(seriesId, ep.id)
        currentUrl     = ep.url
        currentTitle   = ep.title
        currentCover   = ep.cover?.takeIf { it.isNotEmpty() } ?: seriesCover
    }

    private var transitionJob: Job? = null

    private fun observeEpisodeTransitions(seriesCover: String?) {
        transitionJob?.cancel()
        transitionJob = viewModelScope.launch {
            playerService.state
                .map { it.mediaItemIndex }
                .distinctUntilChanged()
                .collect { index ->
                    if (index == episodeIndex) return@collect
                    markPreviousEpisodeWatched()
                    episodeIndex = index
                    applyEpisode(index, seriesCover)
                }
        }
    }

    /**
     * Un épisode que la liste vient de quitter a été regardé jusqu'au bout : on le
     * marque explicitement, plutôt que d'espérer que le minuteur de 10 s ait capté une
     * position assez proche de la fin.
     */
    private fun markPreviousEpisodeWatched() {
        val id  = currentMediaId ?: return
        val dur = lastKnownDurationMs
        if (dur <= 0L) return
        viewModelScope.launch {
            progressRepo.saveProgress(
                mediaId    = id,
                positionMs = dur,
                url        = currentUrl,
                title      = currentTitle,
                cover      = currentCover,
                type       = currentType,
                durationMs = dur,
            )
        }
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

    /**
     * Quitte la lecture : dernier enregistrement, puis **plus rien**.
     *
     * ⚠️ Les deux dernières lignes sont le correctif du défaut « impossible de retirer un
     * film de *Reprendre la lecture* ». [startProgressSaving] lance une boucle infinie
     * dans `viewModelScope` ; ce `ViewModel` étant porté par l'Activity, la boucle
     * survivait à la sortie du lecteur et **continuait d'écrire toutes les 10 s**.
     * `player.stop()` ne remet pas la position à zéro : `currentPosition` restait
     * au-dessus du seuil de 5 s, `saveProgress` repassait donc par `updateRecentList` et
     * **réinsérait l'entrée en tête de liste**. L'utilisateur la retirait, elle
     * réapparaissait dans les dix secondes.
     *
     * Couper la boucle ne suffit pas : `onCleared` réenregistre lui aussi. On efface donc
     * l'identifiant — la sauvegarde vient d'avoir lieu, il n'y a plus rien à écrire.
     */
    fun stop() {
        saveProgressNow()
        progressSavingJob?.cancel()
        progressSavingJob = null
        currentMediaId = null
        playerService.stop()
    }

    // ── Pistes audio et sous-titres ──────────────────────────────────────────
    // La décision vit dans PlayerService / TrackPolicy : les deux UI ne font que
    // l'appeler. Elles écrivaient chacune leur propre séquence d'override, sans jamais
    // vérifier que l'appareil savait décoder la piste (§8.2).

    val audioTracks = playerService.audioTracks
    val textTracks  = playerService.textTracks

    /** @return `false` si l'appareil ne sait pas lire cette piste. */
    fun selectAudioTrack(id: String): Boolean = playerService.selectAudioTrack(id)

    /** [id] à `null` coupe les sous-titres. */
    fun selectTextTrack(id: String?): Boolean = playerService.selectTextTrack(id)

    /**
     * Relance après un échec de lecture, **sans l'override qui a pu le provoquer**.
     *
     * Sans `clearTrackOverrides`, « Réessayer » rejouait le flux avec la piste que le
     * décodeur venait de refuser : même cause, même erreur, et aucune sortie.
     */
    fun retry() {
        playerService.clearTrackOverrides()
        if (episodes.isNotEmpty() && episodesSeriesId != null) {
            // Sur une série, l'écran de lecture a été ouvert avec une URL vide — la liste
            // d'épisodes est passée séparément. L'ancien « Réessayer » relançait donc
            // `playMedia("")` et ne pouvait rien produire.
            playWithEpisodes(episodes, episodeIndex, episodesSeriesId!!, currentCover)
            return
        }
        val url      = currentUrl ?: return
        val resumeAt = playerService.state.value.positionMs
        playMedia(url, currentTitle ?: "", currentMediaId, resumeAt, currentCover, currentType)
    }

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

    private var progressSavingJob: Job? = null

    /**
     * Une seule boucle à la fois, et arrêtée par [stop].
     *
     * Sans le `cancel`, chaque lecture en empilait une de plus : après cinq films, cinq
     * boucles réécrivaient le même média en parallèle. Cf. [stop] pour le défaut que cela
     * provoquait dans « Reprendre la lecture ».
     */
    private fun startProgressSaving() {
        progressSavingJob?.cancel()
        progressSavingJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000)
                saveProgressNow()
            }
        }
    }

    private fun saveProgressNow() {
        val id = currentMediaId ?: return
        val pos = playerService.currentPositionMs()
        val dur = playerService.state.value.durationMs
        if (dur > 0L) lastKnownDurationMs = dur
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
