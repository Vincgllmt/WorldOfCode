package com.purple.iptvplayer.core.model

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class EpgProgram(
    val title: String,
    /** Horaire brut du fournisseur, de fuseau indéterminé. N'utiliser qu'en dernier recours. */
    val start: String,
    val end: String,
    val description: String? = null,
    /**
     * Début en millisecondes depuis l'epoch, issu de `start_timestamp`.
     *
     * À préférer systématiquement à [start] : c'est la seule donnée non ambiguë.
     * Les chaînes `start`/`end` sont exprimées dans le fuseau du serveur, inconnu du
     * client — mesuré en conditions réelles, un décalage d'une heure avec l'heure
     * locale sur un panneau en UTC+1.
     */
    val startMs: Long? = null,
    val endMs: Long? = null,
)
