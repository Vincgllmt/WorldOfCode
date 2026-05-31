package com.purple.iptvplayer.core.network

import com.purple.iptvplayer.core.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class XtreamApiClient {

    val http: OkHttpClient = buildTrustAllClient()

    private fun buildTrustAllClient(): OkHttpClient {
        val trustAll = object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) = Unit
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
        }
        val ssl = SSLContext.getInstance("TLS").apply {
            init(null, arrayOf<TrustManager>(trustAll), java.security.SecureRandom())
        }
        return OkHttpClient.Builder()
            .sslSocketFactory(ssl.socketFactory, trustAll)
            .hostnameVerifier { _, _ -> true }
            .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build()
    }

    suspend fun get(url: String): String = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url).build()
        http.newCall(req).execute().use { it.body!!.string() }
    }

    // Read M3U as raw bytes decoded via ISO-8859-1 so that decodeIfNeeded()
    // in M3uParserService can correctly recover accented chars whether the
    // source file was UTF-8 or genuine ISO-8859-1.
    suspend fun getM3u(url: String): String = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url).build()
        http.newCall(req).execute().use { it.body!!.bytes().toString(Charsets.ISO_8859_1) }
    }

    suspend fun head(url: String): Int = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url).head().build()
        http.newCall(req).execute().use { it.code }
    }

    // ─── URL Builder ─────────────────────────────────────────────────────────

    fun playerApiUrl(c: Credentials, action: String? = null, extra: String = ""): String {
        var url = "${c.host}/player_api.php?username=${c.user}&password=${c.pass}"
        if (action != null) url += "&action=$action"
        if (extra.isNotEmpty()) url += extra
        return url
    }

    // ─── Name / Category Cleaning ─────────────────────────────────────────────

    private val displayTagsRe = Regex("""\s*[(\[][^)\]]*[)\]]|\s*[-|│‖]{1,3}\s*\w*\s*[-|│‖]{1,3}""")
    private val specialCharsRe = Regex("""[★☆✪✦◈❤♛♕❖◆▶►•·]+""")
    private val multiSpacesRe  = Regex("""\s{2,}""")
    private val nonLatin1Re    = Regex("""[^\x20-\x7E\xA0-\xFF]""")

    fun cleanName(name: String): String {
        // Do NOT call decodeIfNeeded: JSON delivers proper UTF-8; re-encoding corrupts emoji → '?' artifacts.
        var s = name.trim().replace(displayTagsRe, "").trim()
        s = s.replace(specialCharsRe, "").trim()
        s = s.replace(multiSpacesRe, " ")
        return s.ifEmpty { name.trim() }
    }

    fun cleanCat(name: String): String {
        // Do NOT call decodeIfNeeded: the JSON parser always delivers proper UTF-8 strings.
        // Calling decodeIfNeeded corrupts emoji/non-Latin chars → produces literal '?' artifacts.
        var s = name.trim().replace(nonLatin1Re, "").trim()
        s = s.replace(multiSpacesRe, " ")
        return s.ifEmpty { if (name.isNotEmpty()) name.trim() else "Others" }
    }

    private fun String.decodeIfNeeded(): String = runCatching {
        if (none { it.code > 127 }) return this
        String(toByteArray(Charsets.ISO_8859_1), Charsets.UTF_8)
    }.getOrDefault(this)

    // ─── Parsers (run on Dispatchers.Default via caller) ─────────────────────

    fun parseChannels(catsJson: String, streamsJson: String, c: Credentials): List<Channel> {
        val catMap = buildCatMap(JSONArray(catsJson))
        return JSONArray(streamsJson).let { arr ->
            (0 until arr.length()).map { i ->
                val s = arr.getJSONObject(i)
                val catId = s.optString("category_id")
                val streamId = s.optInt("stream_id")
                Channel(
                    name     = cleanName(s.optString("name")),
                    url      = "${c.host}/live/${c.user}/${c.pass}/${streamId}.ts",
                    logo     = s.optString("stream_icon").ifEmpty { null },
                    group    = catMap[catId] ?: "Others",
                    streamId = streamId,
                    epgId    = s.optString("epg_channel_id").ifEmpty { null },
                )
            }
        }
    }

    fun parseMovies(catsJson: String, streamsJson: String, c: Credentials): List<Movie> {
        val catMap = buildCatMap(JSONArray(catsJson))
        return JSONArray(streamsJson).let { arr ->
            (0 until arr.length()).map { i ->
                val s = arr.getJSONObject(i)
                val catId = s.optString("category_id")
                val id = s.optInt("stream_id")
                val ext = s.optString("container_extension").ifEmpty { "mp4" }
                Movie(
                    id     = id,
                    name   = cleanName(s.optString("name")),
                    url    = "${c.host}/movie/${c.user}/${c.pass}/${id}.${ext}",
                    cover  = s.optString("stream_icon").ifEmpty { null },
                    group  = catMap[catId] ?: "Others",
                    rating = s.optString("rating").ifEmpty { null },
                )
            }
        }
    }

    fun parseSeries(catsJson: String, streamsJson: String): List<SeriesItem> {
        val catMap = buildCatMap(JSONArray(catsJson))
        return JSONArray(streamsJson).let { arr ->
            (0 until arr.length()).map { i ->
                val s = arr.getJSONObject(i)
                val catId = s.optString("category_id")
                SeriesItem(
                    id     = s.optInt("series_id"),
                    name   = cleanName(s.optString("name")),
                    cover  = s.optString("cover").ifEmpty { null },
                    group  = catMap[catId] ?: "Others",
                    rating = s.optString("rating").ifEmpty { null },
                )
            }
        }
    }

    fun parseMovieDetail(json: String, c: Credentials): MovieDetail {
        val data = JSONObject(json)
        val info = data.optJSONObject("info") ?: JSONObject()
        val md   = data.optJSONObject("movie_data") ?: JSONObject()
        val ext  = md.optString("container_extension").ifEmpty { "mp4" }
        val id   = md.optInt("stream_id")
        return MovieDetail(
            id          = id,
            name        = cleanName(md.optString("name")),
            url         = "${c.host}/movie/${c.user}/${c.pass}/${id}.${ext}",
            cover       = info.optString("movie_image").ifEmpty { null },
            coverBig    = info.optString("movie_image").ifEmpty { null },
            description = info.optString("plot").ifEmpty { null },
            duration    = info.optString("duration").ifEmpty { null },
            genre       = info.optString("genre").ifEmpty { null },
            cast        = info.optString("cast").ifEmpty { null },
            director    = info.optString("director").ifEmpty { null },
            year        = info.optString("releasedate").ifEmpty { null },
            rating      = info.optString("rating").ifEmpty { null },
        )
    }

    fun parseSeriesDetail(json: String, seriesId: Int, c: Credentials): SeriesDetail {
        val data     = JSONObject(json)
        val info     = data.optJSONObject("info") ?: JSONObject()
        val epsData  = data.optJSONObject("episodes") ?: JSONObject()
        val seasons  = mutableMapOf<String, List<Episode>>()
        epsData.keys().forEach { seasonNum ->
            val epArr = epsData.getJSONArray(seasonNum)
            seasons[seasonNum] = (0 until epArr.length()).map { i ->
                val e   = epArr.getJSONObject(i)
                val ext = e.optString("container_extension").ifEmpty { "mp4" }
                val epId = e.optInt("id")
                Episode(
                    id         = epId,
                    title      = cleanName(e.optString("title").ifEmpty { "Episode ${e.optInt("episode_num")}" }),
                    season     = seasonNum.toIntOrNull() ?: 0,
                    episodeNum = e.optInt("episode_num"),
                    url        = "${c.host}/series/${c.user}/${c.pass}/${epId}.${ext}",
                    plot       = e.optJSONObject("info")?.optString("plot")?.ifEmpty { null },
                    cover      = e.optJSONObject("info")?.optString("movie_image")?.ifEmpty { null },
                    duration   = e.optJSONObject("info")?.optString("duration")?.ifEmpty { null },
                )
            }
        }
        return SeriesDetail(
            id     = seriesId,
            name   = cleanName(info.optString("name")),
            cover  = info.optString("cover").ifEmpty { null },
            plot   = info.optString("plot").ifEmpty { null },
            seasons = seasons,
        )
    }

    fun parseEpg(json: String): List<EpgProgram> {
        val data     = JSONObject(json)
        val listings = data.optJSONArray("epg_listings") ?: return emptyList()
        return (0 until listings.length()).map { i ->
            val e = listings.getJSONObject(i)
            EpgProgram(
                title       = e.optString("title").decodeBase64OrSelf(),
                start       = e.optString("start"),
                end         = e.optString("end"),
                description = e.optString("description").decodeBase64OrSelf().ifEmpty { null },
            )
        }
    }

    private fun String.decodeBase64OrSelf(): String = runCatching {
        android.util.Base64.decode(this, android.util.Base64.DEFAULT).toString(Charsets.UTF_8).trim()
    }.getOrDefault(this)

    private fun buildCatMap(arr: JSONArray): Map<String, String> {
        val map = mutableMapOf<String, String>()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            map[o.optString("category_id")] = cleanCat(o.optString("category_name"))
        }
        return map
    }
}
