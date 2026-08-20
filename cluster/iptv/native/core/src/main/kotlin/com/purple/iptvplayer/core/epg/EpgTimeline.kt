package com.purple.iptvplayer.core.epg

import com.purple.iptvplayer.core.model.EpgProgram
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Programme courant, suivant, et avancement du courant entre 0 et 1. */
data class EpgSnapshot(
    val current: EpgProgram,
    val next: EpgProgram?,
    val progress: Float,
)

/**
 * Lecture d'une grille EPG : quel programme est à l'antenne, et où il en est.
 *
 * Logique pure, source de temps en paramètre — la règle du §4 du CLAUDE.md :
 * « on extrait la décision en objet pur et on teste celui-ci ».
 *
 * Cette classe existe parce que la même décision était **écrite deux fois**, dans
 * `PlayerScreen` et dans `TvPlayerScreen`, et que les deux copies avaient divergé :
 * les correctifs P10/P11 n'avaient été appliqués qu'au mobile. La TV affichait donc
 * encore des horaires décalés d'une heure et une barre d'avancement figée. Une
 * logique dupliquée dans les deux UI viole la règle §2.1 et se re-désynchronisera :
 * elle vit désormais dans `core`, seule détentrice de la décision.
 */
object EpgTimeline {

    /**
     * Début en millisecondes epoch.
     *
     * Préfère l'horodatage Unix (`start_timestamp`), **seule valeur non ambiguë**.
     * Les chaînes `start`/`end` sont exprimées dans le fuseau du serveur, inconnu du
     * client : les interpréter comme de l'UTC décalait la sélection du programme
     * courant de deux heures sur un panneau en UTC+1. Repli sur la chaîne uniquement
     * si le panneau n'envoie pas les horodatages.
     */
    fun startMs(p: EpgProgram): Long = p.startMs ?: parseEpgTime(p.start)

    fun endMs(p: EpgProgram): Long = p.endMs ?: parseEpgTime(p.end)

    fun snapshot(programs: List<EpgProgram>, now: Long): EpgSnapshot? {
        val current = programs.firstOrNull { startMs(it) <= now && endMs(it) > now }
            ?: programs.firstOrNull() ?: return null
        val next = programs.firstOrNull { startMs(it) >= endMs(current) }
        val s = startMs(current)
        val e = endMs(current)
        val progress = if (e > s) ((now - s).toFloat() / (e - s)).coerceIn(0f, 1f) else 0f
        return EpgSnapshot(current, next, progress)
    }

    /**
     * Horaire formaté **dans le fuseau de l'appareil**.
     *
     * Afficher la chaîne brute du fournisseur donnait un horaire faux : mesuré à
     * 20:28 heure locale, le JT de 20h s'affichait « 19:00 – 19:45 ».
     */
    fun formatTime(
        p: EpgProgram,
        end: Boolean,
        tz: TimeZone = TimeZone.getDefault(),
    ): String {
        val ms = (if (end) p.endMs else p.startMs)
            ?: return (if (end) p.end else p.start).take(16).takeLast(5)
        val fmt = SimpleDateFormat("HH:mm", Locale.getDefault())
        fmt.timeZone = tz
        return fmt.format(Date(ms))
    }

    /** Repli de dernier recours : chaîne du fournisseur, de fuseau supposé UTC. */
    private fun parseEpgTime(s: String): Long = runCatching {
        val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        sdf.parse(s)?.time ?: 0L
    }.getOrDefault(0L)
}
