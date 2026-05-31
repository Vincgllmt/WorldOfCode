package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

private val Context.progressDataStore by preferencesDataStore(name = "watch_progress")

class ProgressRepository(private val context: Context) {

    private val KEY_RECENT_JSON = stringPreferencesKey("recent_items_json")

    suspend fun saveProgress(
        mediaId: String,
        positionMs: Long,
        url: String? = null,
        title: String? = null,
        cover: String? = null,
        type: String? = null,
        durationMs: Long = 0L
    ) {
        // Save raw progress
        val key = longPreferencesKey("progress_$mediaId")
        context.progressDataStore.edit { it[key] = positionMs }

        // Update recent list if metadata is provided
        if (title != null && type != null && url != null) {
            updateRecentList(mediaId, url, title, cover, type, positionMs, durationMs)
        }
    }

    suspend fun getProgress(mediaId: String): Long {
        val key = longPreferencesKey("progress_$mediaId")
        return context.progressDataStore.data.first()[key] ?: 0L
    }

    suspend fun clearProgress(mediaId: String) {
        val key = longPreferencesKey("progress_$mediaId")
        context.progressDataStore.edit { it.remove(key) }
        removeFromRecent(mediaId)
    }

    val recentItems: Flow<List<RecentItem>> = context.progressDataStore.data.map { prefs ->
        val json = prefs[KEY_RECENT_JSON] ?: "[]"
        parseRecentJson(json)
    }

    private suspend fun updateRecentList(
        id: String, url: String, title: String, cover: String?, type: String, pos: Long, dur: Long
    ) {
        context.progressDataStore.edit { prefs ->
            val json = prefs[KEY_RECENT_JSON] ?: "[]"
            val list = parseRecentJson(json).toMutableList()
            
            // Remove existing entry for this id
            list.removeAll { it.id == id }
            
            // Add at start
            list.add(0, RecentItem(id, url, title, cover, type, pos, dur, System.currentTimeMillis()))
            
            // Limit to 20 items
            val limited = list.take(20)
            
            prefs[KEY_RECENT_JSON] = encodeRecentJson(limited)
        }
    }

    private suspend fun removeFromRecent(id: String) {
        context.progressDataStore.edit { prefs ->
            val json = prefs[KEY_RECENT_JSON] ?: "[]"
            val list = parseRecentJson(json).filter { it.id != id }
            prefs[KEY_RECENT_JSON] = encodeRecentJson(list)
        }
    }

    private fun parseRecentJson(json: String): List<RecentItem> {
        val arr = JSONArray(json)
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            RecentItem(
                id        = o.getString("id"),
                url       = o.optString("url").ifEmpty { "" },
                title     = o.getString("title"),
                cover     = o.optString("cover").ifEmpty { null },
                type      = o.getString("type"),
                progress  = o.getLong("progress"),
                duration  = o.getLong("duration"),
                timestamp = o.getLong("timestamp")
            )
        }
    }

    private fun encodeRecentJson(items: List<RecentItem>): String {
        val arr = JSONArray()
        items.forEach { itm ->
            arr.put(JSONObject().apply {
                put("id", itm.id)
                put("url", itm.url)
                put("title", itm.title)
                put("cover", itm.cover ?: "")
                put("type", itm.type)
                put("progress", itm.progress)
                put("duration", itm.duration)
                put("timestamp", itm.timestamp)
            })
        }
        return arr.toString()
    }
}

data class RecentItem(
    val id: String,
    val url: String,
    val title: String,
    val cover: String?,
    val type: String,
    val progress: Long,
    val duration: Long,
    val timestamp: Long
)
