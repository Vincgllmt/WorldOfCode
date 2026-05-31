package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.favDataStore by preferencesDataStore(name = "favorites")

class FavoritesRepository(private val context: Context) {

    private val KEY_CHANNELS = stringSetPreferencesKey("fav_channels")
    private val KEY_MOVIES   = stringSetPreferencesKey("fav_movies")
    private val KEY_SERIES   = stringSetPreferencesKey("fav_series")
    private val KEY_LIVE_GENRES   = stringSetPreferencesKey("fav_genres_live")
    private val KEY_MOVIE_GENRES  = stringSetPreferencesKey("fav_genres_movies")
    private val KEY_SERIES_GENRES = stringSetPreferencesKey("fav_genres_series")

    val channelFavorites: Flow<Set<String>> = context.favDataStore.data.map { it[KEY_CHANNELS] ?: emptySet() }
    val movieFavorites:   Flow<Set<String>> = context.favDataStore.data.map { it[KEY_MOVIES]   ?: emptySet() }
    val seriesFavorites:  Flow<Set<String>> = context.favDataStore.data.map { it[KEY_SERIES]   ?: emptySet() }

    val liveGenreFavorites:   Flow<Set<String>> = context.favDataStore.data.map { it[KEY_LIVE_GENRES]   ?: emptySet() }
    val movieGenreFavorites:  Flow<Set<String>> = context.favDataStore.data.map { it[KEY_MOVIE_GENRES]  ?: emptySet() }
    val seriesGenreFavorites: Flow<Set<String>> = context.favDataStore.data.map { it[KEY_SERIES_GENRES] ?: emptySet() }

    suspend fun toggleChannel(name: String) = toggle(KEY_CHANNELS, name)
    suspend fun toggleMovie(id: String)     = toggle(KEY_MOVIES, id)
    suspend fun toggleSeries(id: String)    = toggle(KEY_SERIES, id)

    suspend fun toggleLiveGenre(genre: String)   = toggle(KEY_LIVE_GENRES, genre)
    suspend fun toggleMovieGenre(genre: String)  = toggle(KEY_MOVIE_GENRES, genre)
    suspend fun toggleSeriesGenre(genre: String) = toggle(KEY_SERIES_GENRES, genre)

    private suspend fun toggle(key: androidx.datastore.preferences.core.Preferences.Key<Set<String>>, value: String) {
        context.favDataStore.edit { prefs ->
            val current = prefs[key]?.toMutableSet() ?: mutableSetOf()
            if (current.contains(value)) current.remove(value) else current.add(value)
            prefs[key] = current
        }
    }
}
