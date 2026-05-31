package com.purple.iptvplayer.core.data

import android.content.Context
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.network.XtreamApiClient
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import okhttp3.Request
import java.io.File

class DownloadRepository(
    private val context: Context,
    private val apiClient: XtreamApiClient,
) {
    private val scope      = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val drainMutex = Mutex()
    private val moshi      = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val prefs      = context.getSharedPreferences("purple_downloads", Context.MODE_PRIVATE)

    private val _items = MutableStateFlow<List<DownloadItem>>(loadFromPrefs())
    val items: StateFlow<List<DownloadItem>> = _items.asStateFlow()

    private val dlDir: File
        get() = (context.getExternalFilesDir("Purple_IPTV") ?: File(context.filesDir, "downloads"))
            .also { it.mkdirs() }

    init {
        // Reset items stuck as DOWNLOADING from a previous app session
        val stuck = _items.value.filter { it.status == DownloadStatus.DOWNLOADING }
        if (stuck.isNotEmpty()) {
            _items.value = _items.value.map {
                if (it.status == DownloadStatus.DOWNLOADING)
                    it.copy(status = DownloadStatus.QUEUED, downloadedBytes = 0L)
                else it
            }
            persist()
        }
        scope.launch { drain() }
    }

    fun getAll(): List<DownloadItem> = _items.value

    fun statusOf(id: String): DownloadStatus? = _items.value.find { it.id == id }?.status

    fun itemOf(id: String): DownloadItem? = _items.value.find { it.id == id }

    fun enqueue(item: DownloadItem) {
        val existing = _items.value.find { it.id == item.id }
        if (existing != null && existing.status != DownloadStatus.FAILED) return
        _items.value = _items.value.filter { it.id != item.id } +
                item.copy(status = DownloadStatus.QUEUED, downloadedBytes = 0L)
        persist()
        scope.launch { drain() }
    }

    fun enqueueAll(items: List<DownloadItem>) {
        val toAdd = items.filter { new ->
            val existing = _items.value.find { it.id == new.id }
            existing == null || existing.status == DownloadStatus.FAILED
        }
        if (toAdd.isEmpty()) return
        _items.value = _items.value.filter { old -> toAdd.none { it.id == old.id } } +
                toAdd.map { it.copy(status = DownloadStatus.QUEUED, downloadedBytes = 0L) }
        persist()
        scope.launch { drain() }
    }

    fun remove(id: String) {
        val item = _items.value.find { it.id == id } ?: return
        item.localPath?.let { runCatching { File(it).delete() } }
        _items.value = _items.value.filter { it.id != id }
        persist()
    }

    fun removeAll(ids: List<String>) {
        val toRemove = ids.toSet()
        _items.value.filter { it.id in toRemove }
            .forEach { item -> item.localPath?.let { runCatching { File(it).delete() } } }
        _items.value = _items.value.filter { it.id !in toRemove }
        persist()
    }

    fun retry(id: String) {
        val item = _items.value.find { it.id == id && it.status == DownloadStatus.FAILED } ?: return
        _items.value = _items.value.map {
            if (it.id == id) item.copy(status = DownloadStatus.QUEUED, downloadedBytes = 0L) else it
        }
        persist()
        scope.launch { drain() }
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    private suspend fun drain() {
        if (!drainMutex.tryLock()) return
        try {
            while (true) {
                val next = _items.value.find { it.status == DownloadStatus.QUEUED } ?: break
                // Mark as downloading
                mutate(next.id) { it.copy(status = DownloadStatus.DOWNLOADING, downloadedBytes = 0L) }
                persist()

                val path = downloadFile(next) { downloaded, total ->
                    // Update progress in StateFlow without persisting on every chunk
                    _items.value = _items.value.map { item ->
                        if (item.id == next.id)
                            item.copy(downloadedBytes = downloaded, fileSizeBytes = total.coerceAtLeast(1L))
                        else item
                    }
                }

                val finalSize = _items.value.find { it.id == next.id }?.fileSizeBytes ?: 0L
                mutate(next.id) {
                    it.copy(
                        status          = if (path != null) DownloadStatus.COMPLETED else DownloadStatus.FAILED,
                        localPath       = path,
                        downloadedBytes = if (path != null) finalSize else 0L,
                    )
                }
                persist()
            }
        } finally {
            drainMutex.unlock()
        }
    }

    private fun mutate(id: String, transform: (DownloadItem) -> DownloadItem) {
        _items.value = _items.value.map { if (it.id == id) transform(it) else it }
    }

    private suspend fun downloadFile(
        item:       DownloadItem,
        onProgress: (downloaded: Long, total: Long) -> Unit,
    ): String? = withContext(Dispatchers.IO) {
        try {
            val ext = when {
                item.url.contains(".mkv", ignoreCase = true) -> "mkv"
                item.url.contains(".avi", ignoreCase = true) -> "avi"
                item.url.contains(".ts",  ignoreCase = true) -> "ts"
                else -> "mp4"
            }
            val safeId = item.id.replace(Regex("[^a-zA-Z0-9_\\-]"), "_")
            val file = File(dlDir, "$safeId.$ext")

            val req = Request.Builder()
                .url(item.url)
                .header("User-Agent", "VLC/3.0.0 LibVLC/3.0.0")
                .build()

            apiClient.http.newCall(req).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val body = response.body ?: return@withContext null
                val total = body.contentLength().takeIf { it > 0 } ?: 0L
                var downloaded = 0L

                file.outputStream().buffered(65_536).use { out ->
                    body.byteStream().use { input ->
                        val buf = ByteArray(65_536)
                        var n: Int
                        while (input.read(buf).also { n = it } != -1) {
                            // Honour cancellation: if item was removed, abort
                            if (_items.value.none { it.id == item.id }) {
                                file.delete()
                                return@withContext null
                            }
                            out.write(buf, 0, n)
                            downloaded += n
                            onProgress(downloaded, total)
                        }
                    }
                }
                file.absolutePath
            }
        } catch (_: Exception) {
            null
        }
    }

    // ─── Persistence ─────────────────────────────────────────────────────────

    private fun persist() {
        runCatching {
            val toSave = _items.value.map {
                if (it.status == DownloadStatus.DOWNLOADING)
                    it.copy(status = DownloadStatus.QUEUED, downloadedBytes = 0L)
                else it
            }
            val type = Types.newParameterizedType(List::class.java, DownloadItem::class.java)
            prefs.edit().putString("items", moshi.adapter<List<DownloadItem>>(type).toJson(toSave)).apply()
        }
    }

    private fun loadFromPrefs(): List<DownloadItem> = runCatching {
        val json = prefs.getString("items", null) ?: return emptyList()
        val type = Types.newParameterizedType(List::class.java, DownloadItem::class.java)
        moshi.adapter<List<DownloadItem>>(type).fromJson(json) ?: emptyList()
    }.getOrDefault(emptyList())
}
