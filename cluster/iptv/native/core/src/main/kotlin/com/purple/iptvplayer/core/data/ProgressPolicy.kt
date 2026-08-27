package com.purple.iptvplayer.core.data

/**
 * Ce qu'on écrit — ou pas — dans la progression de lecture.
 *
 * **Le défaut corrigé (#43).** La chaîne de progression n'avait qu'un seuil bas
 * (« position > 5 s ») et **aucune notion de fin**. Un film regardé jusqu'au générique
 * voyait sa position enregistrée égale à sa durée : il restait indéfiniment dans
 * « Reprendre la lecture », barre pleine, et le rouvrir depuis la carte le replaçait à la
 * fin — écran noir. La rangée étant bornée à [RecentItemsCodec.MAX_ITEMS], les contenus
 * déjà vus en chassaient les contenus réellement en cours.
 *
 * La règle de fin existait pourtant déjà, écrite **trois fois** dans les deux UI
 * (`MovieDetailScreen`, `SeriesDetailScreen`, `TvSeriesScreen` : `pos >= dur * 0.9f`) pour
 * décider du badge « vu » d'un épisode. C'est le motif §8.2 : la même décision recopiée
 * finit par diverger. Elle vit ici désormais, et les trois écrans l'appellent.
 *
 * Logique pure, testable sans Android — même règle que [RecentPolicy] (§4).
 */
object ProgressPolicy {

    /** En deçà, rien n'est enregistré : on n'a pas « commencé » un média ouvert par erreur. */
    const val MIN_POSITION_MS = 5_000L

    /**
     * Part de la durée au-delà de laquelle un média est tenu pour vu jusqu'au bout.
     *
     * 0,9 et non 1,0 : le générique de fin ne se regarde pas, et la dernière position
     * enregistrée l'est au plus tard 10 s avant l'arrêt (boucle de [PlayerViewModel]).
     */
    const val COMPLETION_RATIO = 0.9f

    enum class Decision {
        /** Trop tôt : ne rien écrire. */
        IGNORE,

        /** Lecture en cours : position enregistrée, entrée de reprise mise à jour. */
        SAVE,

        /** Vu jusqu'au bout : marqué vu, et **sorti** de « Reprendre la lecture ». */
        COMPLETED,
    }

    /**
     * @param durationMs 0 quand elle est inconnue — un direct, ou un flux pas encore
     *   bufferisé. Sans durée, aucune fin ne peut être établie : la réponse est `false`,
     *   jamais une supposition.
     */
    fun isComplete(positionMs: Long, durationMs: Long): Boolean =
        durationMs > 0L && positionMs >= durationMs * COMPLETION_RATIO

    fun decide(positionMs: Long, durationMs: Long): Decision = when {
        isComplete(positionMs, durationMs) -> Decision.COMPLETED
        positionMs > MIN_POSITION_MS       -> Decision.SAVE
        else                               -> Decision.IGNORE
    }

    /**
     * Où reprendre un média qu'on rouvre.
     *
     * La position d'un média terminé est **conservée** — c'est elle qui porte le badge
     * « vu » des fiches de série — mais elle ne sert pas de point de reprise : on repart
     * du début, sinon rouvrir un épisode vu ouvre son générique.
     */
    fun resumePosition(savedMs: Long, durationMs: Long): Long =
        if (isComplete(savedMs, durationMs)) 0L else savedMs
}
