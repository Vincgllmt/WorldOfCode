package com.purple.iptvplayer.core

import android.graphics.Color
import androidx.media3.ui.CaptionStyleCompat

/**
 * Résolution du style des sous-titres pour ExoPlayer.
 *
 * La construction de [CaptionStyleCompat] était tripliée entre les deux
 * écrans de lecture et l'aperçu mobile (§87). Une seule source empêche
 * qu'une variante future (taille, ombre, bordure) ne soit portée que sur
 * l'un des trois sites.
 */
object CaptionStyleResolver {

    /**
     * Construit un [CaptionStyleCompat] à partir des préférences utilisateur.
     *
     * @param subColor `"yellow"` ou tout autre valeur (blanc par défaut)
     * @param subBg    `true` pour un fond semi-transparent
     */
    fun resolve(subColor: String, subBg: Boolean): CaptionStyleCompat = CaptionStyleCompat(
        /* foregroundColor = */ if (subColor == "yellow") Color.YELLOW else Color.WHITE,
        /* backgroundColor = */ if (subBg) Color.parseColor("#80000000") else Color.TRANSPARENT,
        /* windowColor     = */ Color.TRANSPARENT,
        /* edgeType        = */ CaptionStyleCompat.EDGE_TYPE_NONE,
        /* edgeColor       = */ Color.WHITE,
        /* typeface        = */ null,
    )
}
