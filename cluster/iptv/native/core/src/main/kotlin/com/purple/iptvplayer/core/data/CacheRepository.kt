package com.purple.iptvplayer.core.data

import android.content.Context
import com.purple.iptvplayer.core.model.*
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class CacheRepository(private val context: Context) {

    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val cacheDir: File get() = File(context.cacheDir, "iptv_cache").also { it.mkdirs() }

    // ─── Channels ────────────────────────────────────────────────────────────

    suspend fun getChannels(): List<Channel>? = read("channels", Channel::class.java)
    suspend fun saveChannels(list: List<Channel>) = write("channels", list, Channel::class.java)

    // ─── Movies ──────────────────────────────────────────────────────────────

    suspend fun getMovies(): List<Movie>? = read("movies", Movie::class.java)
    suspend fun saveMovies(list: List<Movie>) = write("movies", list, Movie::class.java)

    suspend fun getMovieDetail(id: Int): MovieDetail? = readSingle("movie_detail_$id", MovieDetail::class.java)
    suspend fun saveMovieDetail(id: Int, d: MovieDetail) = writeSingle("movie_detail_$id", d, MovieDetail::class.java)

    // ─── Series ──────────────────────────────────────────────────────────────

    suspend fun getSeries(): List<SeriesItem>? = read("series", SeriesItem::class.java)
    suspend fun saveSeries(list: List<SeriesItem>) = write("series", list, SeriesItem::class.java)

    suspend fun getSeriesDetail(id: Int): SeriesDetail? = readSingle("series_detail_$id", SeriesDetail::class.java)
    suspend fun saveSeriesDetail(id: Int, d: SeriesDetail) = writeSingle("series_detail_$id", d, SeriesDetail::class.java)

    fun clearAll() { cacheDir.listFiles()?.forEach { it.delete() } }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private suspend fun <T> read(name: String, clazz: Class<T>): List<T>? = withContext(Dispatchers.IO) {
        runCatching {
            val f = File(cacheDir, "$name.json")
            if (!f.exists()) return@withContext null
            val type = Types.newParameterizedType(List::class.java, clazz)
            moshi.adapter<List<T>>(type).fromJson(f.readText())
        }.getOrNull()
    }

    private suspend fun <T> write(name: String, list: List<T>, clazz: Class<T>) = withContext(Dispatchers.IO) {
        runCatching {
            val type = Types.newParameterizedType(List::class.java, clazz)
            File(cacheDir, "$name.json").writeText(moshi.adapter<List<T>>(type).toJson(list))
        }
    }

    private suspend fun <T> readSingle(name: String, clazz: Class<T>): T? = withContext(Dispatchers.IO) {
        runCatching {
            val f = File(cacheDir, "$name.json")
            if (!f.exists()) return@withContext null
            moshi.adapter(clazz).fromJson(f.readText())
        }.getOrNull()
    }

    private suspend fun <T> writeSingle(name: String, obj: T, clazz: Class<T>) = withContext(Dispatchers.IO) {
        runCatching {
            File(cacheDir, "$name.json").writeText(moshi.adapter(clazz).toJson(obj))
        }
    }
}
