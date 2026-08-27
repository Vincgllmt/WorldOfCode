package com.purple.iptvplayer.core

/**
 * Conversion d'une durée au format `H:MM:SS`, `MM:SS` ou `SS` en millisecondes.
 *
 * Déplacée ici depuis les deux fiches série (§55) pour éviter une troisième
 * divergence.
 */
fun String?.toMillis(): Long {
    if (this == null) return 0L
    val parts = split(":").mapNotNull { it.trim().toLongOrNull() }
    return when (parts.size) {
        3    -> (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
        2    -> (parts[0] * 60 + parts[1]) * 1000
        1    -> parts[0] * 1000
        else -> 0L
    }
}
