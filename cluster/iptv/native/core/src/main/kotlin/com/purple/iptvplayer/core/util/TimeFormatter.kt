package com.purple.iptvplayer.core.util

/**
 * Formate une durée en millisecondes en chaîne lisible `HH:MM:SS` ou `MM:SS`.
 *
 * Déplacé ici depuis les deux écrans de lecture (§35) pour que la règle ne
 * diverge plus entre mobile et TV.
 */
fun Long.toTimeString(): String {
    val s = this / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%02d:%02d".format(m, sec)
}
