package com.purple.iptvplayer.core

import com.purple.iptvplayer.core.model.Channel

/**
 * Initiales d'une chaîne, utilisées en repli quand aucun logo n'est
 * disponible.
 *
 * Deux lettres tirées du nom, après découpe sur espace, barre verticale ou
 * trait d'union. Déplacé ici depuis les deux rangées de chaînes (§120).
 */
fun Channel.initials(): String =
    name.split(' ', '|', '-')
        .filter { it.isNotBlank() }
        .take(2)
        .map { it.first().uppercaseChar() }
        .joinToString("")
        .ifEmpty { "?" }
