package com.purple.iptvplayer.core.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.purple.iptvplayer.core.data.FavoritesRepository
import com.purple.iptvplayer.core.data.IptvRepository
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.data.RecentItem
import com.purple.iptvplayer.core.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class ContentState<out T> {
    object Loading : ContentState<Nothing>()
    data class Success<T>(val data: T) : ContentState<T>()
    data class Error(val message: String) : ContentState<Nothing>()
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

    val channelFavorites: StateFlow<Set<String>> = favsRepo.channelFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    val liveGenreFavorites: StateFlow<Set<String>> = favsRepo.liveGenreFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    fun loadChannels() {
        viewModelScope.launch {
            _channels.value = ContentState.Loading
            try {
                val list = iptvRepo.fetchChannels()
                _channels.value = ContentState.Success(list)
            } catch (e: Exception) {
                _channels.value = ContentState.Error(e.message ?: "Error")
            }
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

    val movieFavorites: StateFlow<Set<String>> = favsRepo.movieFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    val movieGenreFavorites: StateFlow<Set<String>> = favsRepo.movieGenreFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    fun loadMovies() {
        viewModelScope.launch {
            _movies.value = ContentState.Loading
            try {
                val list = iptvRepo.fetchMovies()
                _movies.value = ContentState.Success(list)
            } catch (e: Exception) {
                _movies.value = ContentState.Error(e.message ?: "Error")
            }
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

    fun loadMovieDetail(id: Int) {
        viewModelScope.launch {
            _movieDetail.value = ContentState.Loading
            try {
                val detail = iptvRepo.fetchMovieDetail(id)
                _movieDetail.value = ContentState.Success(detail)
            } catch (e: Exception) {
                _movieDetail.value = ContentState.Error(e.message ?: "Error")
            }
        }
    }

    fun clearMovieDetail() { _movieDetail.value = null }

    // ─── Series ──────────────────────────────────────────────────────────────

    private val _series = MutableStateFlow<ContentState<List<SeriesItem>>>(ContentState.Loading)
    val series: StateFlow<ContentState<List<SeriesItem>>> = _series.asStateFlow()

    val seriesFavorites: StateFlow<Set<String>> = favsRepo.seriesFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    val seriesGenreFavorites: StateFlow<Set<String>> = favsRepo.seriesGenreFavorites
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptySet())

    fun loadSeries() {
        viewModelScope.launch {
            _series.value = ContentState.Loading
            try {
                val list = iptvRepo.fetchSeries()
                _series.value = ContentState.Success(list)
            } catch (e: Exception) {
                _series.value = ContentState.Error(e.message ?: "Error")
            }
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

    fun loadSeriesDetail(id: Int) {
        viewModelScope.launch {
            _seriesDetail.value = ContentState.Loading
            try {
                val detail = iptvRepo.fetchSeriesDetail(id)
                _seriesDetail.value = ContentState.Success(detail)
            } catch (e: Exception) {
                _seriesDetail.value = ContentState.Error(e.message ?: "Error")
            }
        }
    }

    fun clearSeriesDetail() { _seriesDetail.value = null }

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
