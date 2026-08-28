package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.FavoritesRepository
import com.purple.iptvplayer.core.data.MoveDirection
import com.purple.iptvplayer.core.data.IptvRepository
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.data.RecentItem
import com.purple.iptvplayer.core.model.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.IOException

/** Causes d'échec de chargement de contenu que l'UI doit savoir traduire. */
enum class ContentFailure {
    NETWORK,
    NOT_FOUND,
    PARSE_ERROR,
    UNKNOWN,
}

sealed class ContentState<out T> {
    object Loading : ContentState<Nothing>()
    data class Success<T>(val data: T) : ContentState<T>()
    /** @param reason cause typée, que chaque UI traduit avec ses propres ressources. */
    data class Error(val reason: ContentFailure) : ContentState<Nothing>()
}

class ContentViewModel(
    private val iptvRepo: IptvRepository,
    private val favsRepo: FavoritesRepository,
    private val progressRepo: ProgressRepository,
) : ViewModel() {

    val recentItems: StateFlow<List<RecentItem>> = progressRepo.recentItems
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun clearRecentItem(id: String) {
        viewModelScope.launch { progressRepo.clearProgress(id) }
    }

    // ─── Channels ────────────────────────────────────────────────────────────

    private val _channels = MutableStateFlow<ContentState<List<Channel>>>(ContentState.Loading)
    val channels: StateFlow<ContentState<List<Channel>>> = _channels.asStateFlow()

    val channelFavorites: StateFlow<List<String>> = favsRepo.channelFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val liveGenreFavorites: StateFlow<List<String>> = favsRepo.liveGenreFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun loadChannels() {
        viewModelScope.launch {
            _channels.value = ContentState.Loading
            val outcome = runCatching { iptvRepo.fetchChannels() }
            _channels.value = outcome.fold(
                onSuccess = { ContentState.Success(it) },
                onFailure = { ContentState.Error(it.toContentFailure()) },
            )
        }
    }

    /** Déplace un favori de chaîne dans l'ordre choisi par l'utilisateur. */
    /**
     * Déplace un favori de chaîne d'un cran, **par son nom**.
     *
     * L'ensemble des favoris résolus est calculé ici et non passé par l'UI : le
     * `ViewModel` détient déjà le catalogue *et* les favoris, c'est donc le bon endroit,
     * et cela évite qu'un index d'affichage retraverse la frontière (#90). La décision
     * elle-même vit dans [FavoritesOrder], testée sans Android.
     */
    fun moveChannelFavorite(name: String, direction: MoveDirection) {
        viewModelScope.launch {
            val resolus = (_channels.value as? ContentState.Success)
                ?.data?.mapTo(mutableSetOf()) { it.name } ?: return@launch
            favsRepo.moveChannel(name, direction, resolus)
        }
    }

    fun toggleChannelFavorite(name: String) {
        viewModelScope.launch { favsRepo.toggleChannel(name) }
    }

    fun toggleLiveGenreFavorite(genre: String) {
        viewModelScope.launch { favsRepo.toggleLiveGenre(genre) }
    }

    // ─── Movies ──────────────────────────────────────────────────────────────

    private val _movies = MutableStateFlow<ContentState<List<Movie>>>(ContentState.Loading)
    val movies: StateFlow<ContentState<List<Movie>>> = _movies.asStateFlow()

    val movieFavorites: StateFlow<List<String>> = favsRepo.movieFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val movieGenreFavorites: StateFlow<List<String>> = favsRepo.movieGenreFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun loadMovies() {
        viewModelScope.launch {
            _movies.value = ContentState.Loading
            val outcome = runCatching { iptvRepo.fetchMovies() }
            _movies.value = outcome.fold(
                onSuccess = { ContentState.Success(it) },
                onFailure = { ContentState.Error(it.toContentFailure()) },
            )
        }
    }

    fun toggleMovieFavorite(id: String) {
        viewModelScope.launch { favsRepo.toggleMovie(id) }
    }

    fun toggleMovieGenreFavorite(genre: String) {
        viewModelScope.launch { favsRepo.toggleMovieGenre(genre) }
    }

    private val _movieDetail = MutableStateFlow<ContentState<MovieDetail>?>(null)
    val movieDetail: StateFlow<ContentState<MovieDetail>?> = _movieDetail.asStateFlow()

    /** Identifiant de la fiche déjà en mémoire, pour ne pas la recharger pour rien. */
    private var loadedMovieDetailId: Int? = null
    private var movieDetailJob: Job? = null

    /**
     * ⚠️ **Ne pas repasser par `Loading` quand la fiche est déjà là.**
     *
     * Le défaut signalé à l'usage : « depuis le lecteur, la touche retour … on devrait
     * revenir sur la fiche du contenu ». On y revenait — sur une fiche **vidée**. Ce
     * `ViewModel` est porté par l'Activity, donc `_movieDetail` survit à l'aller-retour ;
     * mais l'écran, lui, quitte la composition, son `LaunchedEffect(selectedMovieId)` se
     * rejoue au retour, et cette méthode écrasait aussitôt la fiche chargée par
     * `Loading`. L'utilisateur retombait sur une roue d'attente sur fond sombre —
     * indiscernable du lecteur qu'il venait de quitter — puis sur la fiche, une requête
     * réseau plus tard.
     *
     * C'est la contrepartie non vue du correctif qui a cessé de refermer la fiche en
     * lançant la lecture : garder la fiche ouverte n'a de valeur que si on la retrouve
     * **remplie**.
     */
    fun loadMovieDetail(id: Int) {
        if (loadedMovieDetailId == id && _movieDetail.value is ContentState.Success) return
        movieDetailJob?.cancel()
        movieDetailJob = viewModelScope.launch {
            _movieDetail.value = ContentState.Loading
            val outcome = runCatching { iptvRepo.fetchMovieDetail(id) }
            // Garde de course : si une autre fiche a été demandée entre-temps, ignorer.
            if (loadedMovieDetailId != null && loadedMovieDetailId != id) return@launch
            _movieDetail.value = outcome.fold(
                onSuccess = {
                    loadedMovieDetailId = id
                    ContentState.Success(it)
                },
                onFailure = {
                    loadedMovieDetailId = null
                    ContentState.Error(it.toContentFailure())
                },
            )
        }
    }

    fun clearMovieDetail() {
        movieDetailJob?.cancel()
        movieDetailJob = null
        _movieDetail.value = null
        loadedMovieDetailId = null
    }

    // ─── Series ──────────────────────────────────────────────────────────────

    private val _series = MutableStateFlow<ContentState<List<SeriesItem>>>(ContentState.Loading)
    val series: StateFlow<ContentState<List<SeriesItem>>> = _series.asStateFlow()

    val seriesFavorites: StateFlow<List<String>> = favsRepo.seriesFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val seriesGenreFavorites: StateFlow<List<String>> = favsRepo.seriesGenreFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    fun loadSeries() {
        viewModelScope.launch {
            _series.value = ContentState.Loading
            val outcome = runCatching { iptvRepo.fetchSeries() }
            _series.value = outcome.fold(
                onSuccess = { ContentState.Success(it) },
                onFailure = { ContentState.Error(it.toContentFailure()) },
            )
        }
    }

    fun toggleSeriesFavorite(id: String) {
        viewModelScope.launch { favsRepo.toggleSeries(id) }
    }

    fun toggleSeriesGenreFavorite(genre: String) {
        viewModelScope.launch { favsRepo.toggleSeriesGenre(genre) }
    }

    private val _seriesDetail = MutableStateFlow<ContentState<SeriesDetail>?>(null)
    val seriesDetail: StateFlow<ContentState<SeriesDetail>?> = _seriesDetail.asStateFlow()

    private var loadedSeriesDetailId: Int? = null
    private var seriesDetailJob: Job? = null

    /** Même garde que [loadMovieDetail] — la fiche série revient remplie, pas vide. */
    fun loadSeriesDetail(id: Int) {
        if (loadedSeriesDetailId == id && _seriesDetail.value is ContentState.Success) return
        seriesDetailJob?.cancel()
        seriesDetailJob = viewModelScope.launch {
            _seriesDetail.value = ContentState.Loading
            val outcome = runCatching { iptvRepo.fetchSeriesDetail(id) }
            // Garde de course : si une autre fiche a été demandée entre-temps, ignorer.
            if (loadedSeriesDetailId != null && loadedSeriesDetailId != id) return@launch
            _seriesDetail.value = outcome.fold(
                onSuccess = {
                    loadedSeriesDetailId = id
                    ContentState.Success(it)
                },
                onFailure = {
                    loadedSeriesDetailId = null
                    ContentState.Error(it.toContentFailure())
                },
            )
        }
    }

    fun clearSeriesDetail() {
        seriesDetailJob?.cancel()
        seriesDetailJob = null
        _seriesDetail.value = null
        loadedSeriesDetailId = null
    }

    // ─── EPG ─────────────────────────────────────────────────────────────────

    private val _epgPrograms = MutableStateFlow<List<EpgProgram>>(emptyList())
    val epgPrograms: StateFlow<List<EpgProgram>> = _epgPrograms.asStateFlow()

    fun loadEpg(streamId: Int) {
        viewModelScope.launch {
            _epgPrograms.value = iptvRepo.fetchShortEpg(streamId)
        }
    }

    fun clearEpg() { _epgPrograms.value = emptyList() }
}

/** Mappe une exception vers une cause typée, sans libellé écrit en dur. */
private fun Throwable.toContentFailure(): ContentFailure = when (this) {
    is IOException -> ContentFailure.NETWORK
    is java.net.UnknownHostException -> ContentFailure.NETWORK
    is java.net.SocketTimeoutException -> ContentFailure.NETWORK
    is java.io.FileNotFoundException -> ContentFailure.NOT_FOUND
    else -> ContentFailure.UNKNOWN
}
