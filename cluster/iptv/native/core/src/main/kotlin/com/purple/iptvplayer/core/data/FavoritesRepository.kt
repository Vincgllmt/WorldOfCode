package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.favDataStore by preferencesDataStore(name = "favorites")

/**
 * Favoris, **dans l'ordre choisi par l'utilisateur**.
 *
 * L'ordre était auparavant inexistant : tout était persisté en `Set`, et les écrans
 * affichaient donc les favoris dans l'ordre du catalogue du fournisseur. Chaque
 * catégorie est désormais une **liste ordonnée** encodée en JSON ([FavoritesCodec]).
 *
 * ⚠️ Les anciennes clés `Set` sont **conservées et migrées à la lecture** : un
 * utilisateur qui met à jour ne doit pas perdre ses favoris. La migration est
 * paresseuse — la liste est écrite à la première modification, jamais au simple
 * affichage, pour qu'une lecture ne provoque pas d'écriture.
 */
class FavoritesRepository(private val context: Context) {

    private companion object {
        // Nouvelles clés : liste ordonnée, encodée en JSON.
        val CHANNELS      = stringPreferencesKey("fav_channels_ordered")
        val MOVIES        = stringPreferencesKey("fav_movies_ordered")
        val SERIES        = stringPreferencesKey("fav_series_ordered")
        val LIVE_GENRES   = stringPreferencesKey("fav_genres_live_ordered")
        val MOVIE_GENRES  = stringPreferencesKey("fav_genres_movies_ordered")
        val SERIES_GENRES = stringPreferencesKey("fav_genres_series_ordered")

        // Anciennes clés, lues uniquement pour la migration.
        val LEGACY_CHANNELS      = stringSetPreferencesKey("fav_channels")
        val LEGACY_MOVIES        = stringSetPreferencesKey("fav_movies")
        val LEGACY_SERIES        = stringSetPreferencesKey("fav_series")
        val LEGACY_LIVE_GENRES   = stringSetPreferencesKey("fav_genres_live")
        val LEGACY_MOVIE_GENRES  = stringSetPreferencesKey("fav_genres_movies")
        val LEGACY_SERIES_GENRES = stringSetPreferencesKey("fav_genres_series")
    }

    /**
     * Liste ordonnée d'une catégorie, en reprenant l'ancien `Set` tant que la
     * nouvelle clé n'a pas été écrite.
     */
    private fun Preferences.ordered(
        key: Preferences.Key<String>,
        legacy: Preferences.Key<Set<String>>,
    ): List<String> =
        this[key]?.let { FavoritesCodec.decode(it) }
            ?: FavoritesCodec.fromLegacySet(this[legacy] ?: emptySet())

    private fun flowOf(
        key: Preferences.Key<String>,
        legacy: Preferences.Key<Set<String>>,
    ): Flow<List<String>> = context.favDataStore.data.map { it.ordered(key, legacy) }

    val channelFavorites: Flow<List<String>> = flowOf(CHANNELS, LEGACY_CHANNELS)
    val movieFavorites:   Flow<List<String>> = flowOf(MOVIES, LEGACY_MOVIES)
    val seriesFavorites:  Flow<List<String>> = flowOf(SERIES, LEGACY_SERIES)

    val liveGenreFavorites:   Flow<List<String>> = flowOf(LIVE_GENRES, LEGACY_LIVE_GENRES)
    val movieGenreFavorites:  Flow<List<String>> = flowOf(MOVIE_GENRES, LEGACY_MOVIE_GENRES)
    val seriesGenreFavorites: Flow<List<String>> = flowOf(SERIES_GENRES, LEGACY_SERIES_GENRES)

    suspend fun toggleChannel(name: String) = toggle(CHANNELS, LEGACY_CHANNELS, name)
    suspend fun toggleMovie(id: String)     = toggle(MOVIES, LEGACY_MOVIES, id)
    suspend fun toggleSeries(id: String)    = toggle(SERIES, LEGACY_SERIES, id)

    suspend fun toggleLiveGenre(genre: String)   = toggle(LIVE_GENRES, LEGACY_LIVE_GENRES, genre)
    suspend fun toggleMovieGenre(genre: String)  = toggle(MOVIE_GENRES, LEGACY_MOVIE_GENRES, genre)
    suspend fun toggleSeriesGenre(genre: String) = toggle(SERIES_GENRES, LEGACY_SERIES_GENRES, genre)

    /**
     * Déplace un favori **par identité**, jamais par index d'affichage.
     *
     * @param resolved les favoris que l'écran a su résoudre dans le catalogue. La liste
     *   persistée en contient d'autres — les orphelins — et c'est tout le sujet de #90 :
     *   un index d'affichage n'y désigne pas la même entrée. Cf. [FavoritesOrder].
     */
    suspend fun moveChannel(name: String, direction: MoveDirection, resolved: Set<String>) =
        move(CHANNELS, LEGACY_CHANNELS, name, direction, resolved)

    suspend fun moveMovie(id: String, direction: MoveDirection, resolved: Set<String>) =
        move(MOVIES, LEGACY_MOVIES, id, direction, resolved)

    suspend fun moveSeries(id: String, direction: MoveDirection, resolved: Set<String>) =
        move(SERIES, LEGACY_SERIES, id, direction, resolved)

    /** Un ajout se fait **en fin de liste** : la place d'un nouveau favori est la dernière. */
    private suspend fun toggle(
        key: Preferences.Key<String>,
        legacy: Preferences.Key<Set<String>>,
        value: String,
    ) {
        context.favDataStore.edit { prefs ->
            val current = prefs.ordered(key, legacy)
            val next = if (current.contains(value)) current - value else current + value
            prefs[key] = FavoritesCodec.encode(next)
            prefs.remove(legacy) // la migration est actée, l'ancienne clé n'a plus cours
        }
    }

    private suspend fun move(
        key: Preferences.Key<String>,
        legacy: Preferences.Key<Set<String>>,
        id: String,
        direction: MoveDirection,
        resolved: Set<String>,
    ) {
        context.favDataStore.edit { prefs ->
            val ordre = FavoritesOrder.move(prefs.ordered(key, legacy), id, direction, resolved)
            prefs[key] = FavoritesCodec.encode(ordre)
            prefs.remove(legacy)
        }
    }
}
