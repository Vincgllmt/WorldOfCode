package com.purple.iptvplayer.core.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * Sérialisation de la liste « Reprendre la lecture ».
 *
 * Logique pure extraite de [ProgressRepository] pour être testable sans Android.
 *
 * Cette liste est lue depuis un `Flow` exposé à l'UI : une exception levée ici
 * remonterait à tous les collecteurs et crasherait l'écran de façon définitive,
 * la valeur fautive restant en base. Le décodage doit donc toujours dégrader
 * — jamais échouer.
 */
object RecentItemsCodec {

    /** Nombre maximum d'entrées conservées. */
    const val MAX_ITEMS = 20

    fun parse(json: String): List<RecentItem> {
        // Niveau 1 — le document entier est illisible (vide, tronqué par une
        // écriture interrompue) : on repart d'une liste vide plutôt que de lever.
        val arr = runCatching { JSONArray(json) }.getOrNull() ?: return emptyList()

        // Niveau 2 — une entrée isolée est corrompue (champ absent après une montée
        // de version, type inattendu) : on l'écarte sans perdre les entrées saines.
        return (0 until arr.length()).mapNotNull { i ->
            runCatching {
                val o = arr.getJSONObject(i)
                RecentItem(
                    id        = o.getString("id"),
                    url       = o.optString("url").ifEmpty { "" },
                    title     = o.getString("title"),
                    cover     = o.optString("cover").ifEmpty { null },
                    type      = o.getString("type"),
                    progress  = o.getLong("progress"),
                    duration  = o.getLong("duration"),
                    timestamp = o.getLong("timestamp"),
                )
            }.getOrNull()
        }
    }

    fun encode(items: List<RecentItem>): String {
        val arr = JSONArray()
        items.forEach { itm ->
            arr.put(
                JSONObject().apply {
                    put("id", itm.id)
                    put("url", itm.url)
                    put("title", itm.title)
                    put("cover", itm.cover ?: "")
                    put("type", itm.type)
                    put("progress", itm.progress)
                    put("duration", itm.duration)
                    put("timestamp", itm.timestamp)
                },
            )
        }
        return arr.toString()
    }
}
