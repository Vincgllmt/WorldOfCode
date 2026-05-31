package com.purple.iptvplayer.core.data

import android.content.Context
import com.purple.iptvplayer.core.model.*
import com.purple.iptvplayer.core.network.M3uParserService
import com.purple.iptvplayer.core.network.XtreamApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.withContext

class IptvRepository(
    private val context: Context,
    private val credRepo: CredentialsRepository,
    private val cacheRepo: CacheRepository,
    private val apiClient: XtreamApiClient,
) {
    // In-memory cache mirrors the Flutter pattern
    private var channelsCache: List<Channel>? = null
    private var moviesCache: List<Movie>? = null
    private var seriesCache: List<SeriesItem>? = null
    private var m3uCache: List<M3uItem>? = null

    fun invalidateCache() {
        channelsCache = null; moviesCache = null; seriesCache = null; m3uCache = null
        cacheRepo.clearAll()
    }

    // ─── Validate ────────────────────────────────────────────────────────────

    suspend fun validate(creds: Credentials): Credentials? = withContext(Dispatchers.IO) {
        doValidate(creds) ?: run {
            if (creds.host.startsWith("https://")) {
                val fallback = creds.copyWithHost(creds.host.replace("https://", "http://"))
                if (doValidate(fallback) != null) fallback else null
            } else null
        }
    }

    private suspend fun doValidate(creds: Credentials): Credentials? = runCatching {
        if (!creds.isXtream) {
            if (creds.host.startsWith("http")) {
                val code = apiClient.head(creds.host)
                return if (code == 200) creds else null
            } else {
                return if (java.io.File(creds.host).exists()) creds else null
            }
        }
        val body = apiClient.get(apiClient.playerApiUrl(creds))
        val json = org.json.JSONObject(body)
        if (json.optJSONObject("user_info")?.optInt("auth") == 1) creds else null
    }.getOrNull()

    // ─── Channels ────────────────────────────────────────────────────────────

    suspend fun fetchChannels(forceRefresh: Boolean = false): List<Channel> {
        if (!forceRefresh) {
            channelsCache?.let { return it }
            cacheRepo.getChannels()?.let { channelsCache = it; return it }
        }
        val c = credRepo.load() ?: throw IllegalStateException("No credentials configured")
        val result = if (!c.isXtream) {
            fetchM3u(c).filter { it.type == ContentType.LIVE }.map { item ->
                Channel(
                    name  = apiClient.cleanName(item.name),
                    url   = item.url,
                    logo  = item.logo,
                    group = item.group?.let { apiClient.cleanCat(it) } ?: "Others",
                )
            }
        } else {
            withContext(Dispatchers.IO) {
                val (catsBody, streamsBody) = parallelFetch(
                    apiClient.playerApiUrl(c, "get_live_categories"),
                    apiClient.playerApiUrl(c, "get_live_streams"),
                )
                apiClient.parseChannels(catsBody, streamsBody, c)
            }
        }
        channelsCache = result
        cacheRepo.saveChannels(result)
        return result
    }

    // ─── Movies ──────────────────────────────────────────────────────────────

    suspend fun fetchMovies(forceRefresh: Boolean = false): List<Movie> {
        if (!forceRefresh) {
            moviesCache?.let { return it }
            cacheRepo.getMovies()?.let { moviesCache = it; return it }
        }
        val c = credRepo.load() ?: throw IllegalStateException("No credentials configured")
        val result = if (!c.isXtream) {
            var idCounter = 1
            fetchM3u(c).filter { it.type == ContentType.MOVIE }.map { item ->
                Movie(id = idCounter++, name = apiClient.cleanName(item.name), url = item.url,
                    cover = item.logo, group = item.group?.let { apiClient.cleanCat(it) } ?: "Others")
            }
        } else {
            withContext(Dispatchers.IO) {
                val (catsBody, streamsBody) = parallelFetch(
                    apiClient.playerApiUrl(c, "get_vod_categories"),
                    apiClient.playerApiUrl(c, "get_vod_streams"),
                )
                apiClient.parseMovies(catsBody, streamsBody, c)
            }
        }
        moviesCache = result
        cacheRepo.saveMovies(result)
        return result
    }

    suspend fun fetchMovieDetail(id: Int): MovieDetail {
        val c = credRepo.load() ?: throw IllegalStateException("No credentials configured")
        if (!c.isXtream) {
            val movie = (moviesCache ?: fetchMovies()).first { it.id == id }
            return MovieDetail(id = movie.id, name = movie.name, url = movie.url, cover = movie.cover)
        }
        cacheRepo.getMovieDetail(id)?.let { return it }
        val body   = apiClient.get(apiClient.playerApiUrl(c, "get_vod_info", "&vod_id=$id"))
        val detail = apiClient.parseMovieDetail(body, c)
        cacheRepo.saveMovieDetail(id, detail)
        return detail
    }

    // ─── Series ──────────────────────────────────────────────────────────────

    suspend fun fetchSeries(forceRefresh: Boolean = false): List<SeriesItem> {
        if (!forceRefresh) {
            seriesCache?.let { return it }
            cacheRepo.getSeries()?.let { seriesCache = it; return it }
        }
        val c = credRepo.load() ?: throw IllegalStateException("No credentials configured")
        val result = if (!c.isXtream) {
            var idCounter = 1
            fetchM3u(c).filter { it.type == ContentType.SERIES }.map { item ->
                SeriesItem(id = idCounter++, name = apiClient.cleanName(item.name),
                    cover = item.logo, group = item.group?.let { apiClient.cleanCat(it) } ?: "Others")
            }
        } else {
            withContext(Dispatchers.IO) {
                val (catsBody, streamsBody) = parallelFetch(
                    apiClient.playerApiUrl(c, "get_series_categories"),
                    apiClient.playerApiUrl(c, "get_series"),
                )
                apiClient.parseSeries(catsBody, streamsBody)
            }
        }
        seriesCache = result
        cacheRepo.saveSeries(result)
        return result
    }

    suspend fun fetchSeriesDetail(seriesId: Int): SeriesDetail {
        val c = credRepo.load() ?: throw IllegalStateException("No credentials configured")
        if (!c.isXtream) {
            val s = (seriesCache ?: fetchSeries()).first { it.id == seriesId }
            return SeriesDetail(id = seriesId, name = s.name, cover = s.cover, seasons = emptyMap())
        }
        cacheRepo.getSeriesDetail(seriesId)?.let { return it }
        val body   = apiClient.get(apiClient.playerApiUrl(c, "get_series_info", "&series_id=$seriesId"))
        val detail = apiClient.parseSeriesDetail(body, seriesId, c)
        cacheRepo.saveSeriesDetail(seriesId, detail)
        return detail
    }

    // ─── EPG ─────────────────────────────────────────────────────────────────

    suspend fun fetchShortEpg(streamId: Int): List<EpgProgram> {
        val c = credRepo.load() ?: return emptyList()
        if (!c.isXtream) return emptyList()
        return runCatching {
            val body = apiClient.get(apiClient.playerApiUrl(c, "get_short_epg", "&stream_id=$streamId"))
            apiClient.parseEpg(body)
        }.getOrDefault(emptyList())
    }

    // ─── M3U helper ──────────────────────────────────────────────────────────

    private suspend fun fetchM3u(c: Credentials): List<M3uItem> {
        m3uCache?.let { return it }
        val content = withContext(Dispatchers.IO) {
            if (c.host.startsWith("http")) {
                apiClient.getM3u(c.host)
            } else {
                // Read as ISO-8859-1 so decodeIfNeeded() can handle both UTF-8 and ISO-8859-1 sources
                java.io.File(c.host).readBytes().toString(Charsets.ISO_8859_1)
            }
        }
        return M3uParserService.parse(content).also { m3uCache = it }
    }

    private suspend fun parallelFetch(url1: String, url2: String): Pair<String, String> =
        withContext(Dispatchers.IO) {
            val a = async { apiClient.get(url1) }
            val b = async { apiClient.get(url2) }
            a.await() to b.await()
        }
}
