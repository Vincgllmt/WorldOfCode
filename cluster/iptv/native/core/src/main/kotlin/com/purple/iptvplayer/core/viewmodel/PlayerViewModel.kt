package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.ProgressPolicy
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.model.Episode
import com.purple.iptvplayer.core.model.EpisodeTitle
import com.purple.iptvplayer.core.player.PlayerService
import com.purple.iptvplayer.core.player.PlayerState
import com.purple.iptvplayer.core.player.PlayerStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

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

    /** Logique de seek différée partagée entre [playMedia] et [playWithEpisodes]. */
    private suspend fun performDeferredSeek(positionMs: Long) {
        val dur = withTimeoutOrNull(3_000) {
            playerService.state.map { it.durationMs }.first { it > 0L }
        }
        if (dur == null) delay(800)
        if (!ProgressPolicy.isComplete(positionMs, dur ?: 0L)) {
            playerService.seekTo(positionMs)
        }
    }

    fun playMedia(url: String, title: String, mediaId: String? = null, startPositionMs: Long = 0L, cover: String? = null, type: String? = null) {
        // La durée du média précédent ne dit rien de celui-ci : la garder faisait marquer
        // « terminé » un épisode dont on ne connaissait pas encore la longueur.
        lastKnownDurationMs = 0L
        episodes            = emptyList()
        episodesSeriesId    = null
        seekJob?.cancel()
        transitionJob?.cancel()
        currentMediaId = mediaId
        currentUrl     = url
        currentTitle   = title
        currentCover   = cover
        currentType    = type
        playerService.play(url, title, mediaId)
        if (startPositionMs > 0L) {
            seekJob = viewModelScope.launch { performDeferredSeek(startPositionMs) }
        } else {
            seekJob = null
        }
        startProgressSaving()
        observeCompletion()
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
        startPositionMs: Long = 0L,
    ) {
        this.episodes         = episodes
        this.episodesSeriesId = seriesId
        this.episodeIndex     = startIndex
        currentType           = "series"
        lastKnownDurationMs   = 0L
        applyEpisode(startIndex, seriesCover)

        val items = episodes.map { Pair(it.url, it.title) }
        seekJob?.cancel()
        playerService.playPlaylist(items, startIndex)
        seekJob = viewModelScope.launch {
            val resumeAt = if (startPositionMs > 0L) startPositionMs else getResumePosition(currentMediaId ?: return@launch)
            if (resumeAt > 0L) {
                performDeferredSeek(resumeAt)
            }
        }
        observeEpisodeTransitions(seriesCover)
        startProgressSaving()
        observeCompletion()
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

    /**
     * Suit l'avance de la liste — et **rien d'autre**.
     *
     * ⚠️ `drop(1)` : ce flux est un `StateFlow`, il rejoue sa valeur courante à la
     * souscription. Cette première valeur est l'état que [PlayerService.playPlaylist]
     * vient de poser, pas une transition ; la traiter comme telle marquait un épisode
     * comme terminé au moment même où on le lançait. Le garde `index == episodeIndex` ne
     * suffisait pas : il dépendait de ce que `PlayerState` porte le bon index de départ,
     * ce qu'il ne faisait pas.
     */
    private fun observeEpisodeTransitions(seriesCover: String?) {
        transitionJob?.cancel()
        transitionJob = viewModelScope.launch {
            playerService.state
                .map { it.mediaItemIndex }
                .distinctUntilChanged()
                .drop(1)
                .collect { index ->
                    if (index == episodeIndex) return@collect
                    // Ne marquer « vu » que sur fin naturelle, pas sur saut manuel (#45).
                    val reason = playerService.state.value.transitionReason
                    if (reason == androidx.media3.common.Player.MEDIA_ITEM_TRANSITION_REASON_AUTO) {
                        markPreviousEpisodeWatched()
                    }
                    episodeIndex = index
                    applyEpisode(index, seriesCover)
                }
        }
    }

    private var completionJob: Job? = null

    /**
     * `PlayerStatus.ENDED` — le seul signal de fin qui ne repose sur aucun seuil.
     *
     * `PlayerService` le publie depuis toujours (`STATE_ENDED`), et **personne ne le lisait
     * dans aucun des trois modules** : c'est la cause de #43. La boucle des 10 s finit par
     * voir une position au-delà du seuil de [ProgressPolicy], mais elle ne la voit qu'avec
     * dix secondes de retard, et jamais si l'utilisateur quitte l'écran entre-temps.
     *
     * Souscrit **après** `play()` / `playPlaylist()`, qui viennent de poser `BUFFERING` :
     * la valeur rejouée par ce `StateFlow` à la souscription ne peut donc pas être un
     * `ENDED` laissé par la lecture précédente.
     */
    private fun observeCompletion() {
        completionJob?.cancel()
        completionJob = viewModelScope.launch {
            playerService.state
                .map { it.status }
                .distinctUntilChanged()
                .collect { status ->
                    if (status != PlayerStatus.ENDED) return@collect
                    val id  = currentMediaId ?: return@collect
                    val dur = playerService.state.value.durationMs
                        .takeIf { it > 0L } ?: lastKnownDurationMs
                    progressRepo.markCompleted(id, dur)
                }
        }
    }

    /**
     * Un épisode que la liste vient de quitter a été regardé jusqu'au bout : on le
     * marque explicitement, plutôt que d'espérer que le minuteur de 10 s ait capté une
     * position assez proche de la fin.
     *
     * « Marquer » ne veut pas dire « garder sous la main » : [ProgressRepository.markCompleted]
     * conserve la position — le badge « vu » de la fiche s'y lit — mais retire l'épisode de
     * « Reprendre la lecture ». L'ancienne écriture, un [ProgressRepository.saveProgress]
     * de `position = durée`, l'y **réinsérait** au contraire, en tête et barre pleine (#43).
     */
    private fun markPreviousEpisodeWatched() {
        val id  = currentMediaId ?: return
        val dur = lastKnownDurationMs
        if (dur <= 0L) return
        viewModelScope.launch { progressRepo.markCompleted(id, dur) }
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
        seekJob?.cancel()
        seekJob = null
        // Même raison que la boucle d'enregistrement : `playerService.stop()` remet l'état
        // à neuf, donc `mediaItemIndex` à 0. Un suivi encore actif y lirait une transition
        // vers l'épisode 1 et le réinsérerait dans « Reprendre la lecture » — exactement
        // le défaut que ce `stop()` a été écrit pour supprimer.
        transitionJob?.cancel()
        transitionJob = null
        // Idem : `playerService.stop()` repose un `PlayerState()` neuf. Un suivi de fin
        // encore actif y verrait passer IDLE — sans conséquence aujourd'hui — mais surtout
        // il survivrait à l'écran, comme la boucle d'enregistrement avant lui.
        completionJob?.cancel()
        completionJob = null
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
            val resumeAt = playerService.state.value.positionMs
            playWithEpisodes(episodes, episodeIndex, episodesSeriesId!!, currentCover, resumeAt)
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
    private var seekJob: Job? = null

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
        viewModelScope.launch { commitProgress(id, pos, dur) }
    }

    /**
     * Le seul point qui écrit la progression, et il ne décide de rien : [ProgressPolicy] le
     * fait.
     *
     * Avant #43, ce point n'avait qu'un seuil bas (« > 5 s ») : une position égale à la
     * durée était enregistrée comme n'importe quelle autre, et le média fini restait dans
     * « Reprendre la lecture », barre pleine, à rouvrir sur son générique.
     */
    private suspend fun commitProgress(id: String, positionMs: Long, durationMs: Long) {
        val dur = if (durationMs > 0L) durationMs else lastKnownDurationMs
        when (ProgressPolicy.decide(positionMs, dur)) {
            ProgressPolicy.Decision.IGNORE    -> Unit
            ProgressPolicy.Decision.COMPLETED -> progressRepo.markCompleted(id, dur)
            ProgressPolicy.Decision.SAVE      -> progressRepo.saveProgress(
                mediaId    = id,
                positionMs = positionMs,
                url        = currentUrl,
                title      = currentTitle,
                cover      = currentCover,
                type       = currentType,
                durationMs = dur,
            )
        }
    }

    /**
     * Où rouvrir ce média — 0 s'il a été vu jusqu'au bout (#43).
     *
     * Les deux UI appellent ce point avant [playMedia] : la règle de reprise vit donc dans
     * `core`, elle n'est pas à réécrire dans chacune (§8.2).
     */
    suspend fun getResumePosition(mediaId: String): Long = progressRepo.getResumePosition(mediaId)

    override fun onCleared() {
        super.onCleared()
        val id = currentMediaId ?: return
        val pos = playerService.currentPositionMs()
        val dur = playerService.state.value.durationMs
        // `viewModelScope` est déjà annulé ici : le dernier enregistrement a besoin d'une
        // portée qui lui survive. Il passe par la même règle que les autres, sans quoi
        // quitter l'app sur un générique réinsérerait le film dans la vitrine.
        CoroutineScope(Dispatchers.IO).launch { commitProgress(id, pos, dur) }
    }
}
