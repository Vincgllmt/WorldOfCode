package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.progressDataStore by preferencesDataStore(name = "watch_progress")

class ProgressRepository(private val context: Context) {

    private val KEY_RECENT_JSON = stringPreferencesKey("recent_items_json")

    private fun positionKey(mediaId: String) = longPreferencesKey("progress_$mediaId")

    /**
     * Durée du média, retenue à côté de sa position.
     *
     * Sans elle, « où reprendre ? » ne peut pas être répondu : la position seule ne dit pas
     * si elle est proche de la fin. C'est ce qui manquait au défaut #43 — le point de
     * reprise était relu tel quel, générique compris.
     */
    private fun durationKey(mediaId: String) = longPreferencesKey("duration_$mediaId")

    suspend fun saveProgress(
        mediaId: String,
        positionMs: Long,
        url: String? = null,
        title: String? = null,
        cover: String? = null,
        type: String? = null,
        durationMs: Long = 0L
    ) {
        context.progressDataStore.edit { prefs ->
            prefs[positionKey(mediaId)] = positionMs
            if (durationMs > 0L) prefs[durationKey(mediaId)] = durationMs

            // Update recent list if metadata is provided
            if (title != null && type != null && url != null) {
                val item = RecentItem(
                    mediaId, url, title, cover, type, positionMs, durationMs,
                    System.currentTimeMillis(),
                )
                prefs[KEY_RECENT_JSON] =
                    encodeRecentJson(RecentPolicy.upsert(readRecent(prefs), item))
            }
        }
    }

    /**
     * Le média a été vu jusqu'au bout : il **sort** de « Reprendre la lecture » (#43).
     *
     * La position est conservée, calée sur la durée : c'est elle qui porte le badge « vu »
     * des fiches de série ([ProgressPolicy.isComplete]). L'effacer ferait réapparaître
     * l'épisode comme non commencé. Quand la durée est inconnue — le lecteur a signalé la
     * fin sans jamais l'avoir publiée — il n'y a rien à conserver qui puisse être relu
     * comme « vu » : on efface, faute de quoi la position resterait un point de reprise.
     *
     * Tout se fait dans une seule transaction : une entrée retirée de la vitrine et une
     * position à demi écrite sont deux moitiés du même geste.
     */
    suspend fun markCompleted(mediaId: String, durationMs: Long) {
        context.progressDataStore.edit { prefs ->
            if (durationMs > 0L) {
                prefs[positionKey(mediaId)] = durationMs
                prefs[durationKey(mediaId)] = durationMs
            } else {
                prefs.remove(positionKey(mediaId))
                prefs.remove(durationKey(mediaId))
            }
            prefs[KEY_RECENT_JSON] =
                encodeRecentJson(RecentPolicy.remove(readRecent(prefs), mediaId))
        }
    }

    /** Position brute, telle qu'enregistrée — c'est la trace de ce qui a été vu. */
    suspend fun getProgress(mediaId: String): Long {
        return context.progressDataStore.data.first()[positionKey(mediaId)] ?: 0L
    }

    /**
     * Où rouvrir ce média : 0 s'il a été vu jusqu'au bout (#43).
     *
     * **Seule [durationKey] fait foi ici**, et un repli sur la durée portée par l'entrée de
     * « Reprendre la lecture » a été essayé puis retiré : mesuré sur l'appareil, cette
     * durée-là est le nombre le moins fiable du système. Un épisode y était écrit
     * `progress == duration == 5 317 862`, alors que le lecteur mesure **9 568 408** — la
     * durée enregistrée était celle qu'ExoPlayer connaissait à cet instant, pas celle du
     * média. S'y fier faisait repartir de zéro un épisode vu à 55 %.
     *
     * Sans durée enregistrée — toutes les positions écrites avant cette version — la
     * position est rendue telle quelle, et c'est [PlayerViewModel.playMedia] qui tranche,
     * une fois le flux bufferisé et la **vraie** durée connue.
     */
    suspend fun getResumePosition(mediaId: String): Long {
        val prefs = context.progressDataStore.data.first()
        val pos   = prefs[positionKey(mediaId)] ?: 0L
        val dur   = prefs[durationKey(mediaId)] ?: 0L
        return ProgressPolicy.resumePosition(pos, dur)
    }

    suspend fun clearProgress(mediaId: String) {
        context.progressDataStore.edit { prefs ->
            prefs.remove(positionKey(mediaId))
            prefs.remove(durationKey(mediaId))
            prefs[KEY_RECENT_JSON] =
                encodeRecentJson(RecentPolicy.remove(readRecent(prefs), mediaId))
        }
    }

    val recentItems: Flow<List<RecentItem>> = context.progressDataStore.data.map { prefs ->
        RecentPolicy.visible(readRecent(prefs))
    }

    private fun readRecent(prefs: Preferences): List<RecentItem> =
        parseRecentJson(prefs[KEY_RECENT_JSON] ?: "[]")

    private fun parseRecentJson(json: String): List<RecentItem> = RecentItemsCodec.parse(json)

    private fun encodeRecentJson(items: List<RecentItem>): String = RecentItemsCodec.encode(items)
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
