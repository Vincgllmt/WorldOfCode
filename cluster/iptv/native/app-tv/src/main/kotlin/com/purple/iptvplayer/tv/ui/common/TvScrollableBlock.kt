package com.purple.iptvplayer.tv.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import com.purple.iptvplayer.tv.ui.theme.PurplePalette
import com.purple.iptvplayer.tv.ui.theme.PurpleShapes
import kotlinx.coroutines.launch

/**
 * Décision pure : que faire d'une direction verticale reçue par un bloc défilable ?
 *
 * Le point délicat n'est pas le défilement, c'est **la sortie**. Consommer toutes les
 * directions enfermerait le focus dans le synopsis — le défaut pire que celui corrigé, que
 * §8.14 interdit ; n'en consommer aucune le laisserait illisible. La règle est donc : on
 * défile tant qu'il reste de la matière dans cette direction, et on **rend** la touche dès
 * qu'il n'y en a plus, si bien que le dernier `▼` sort du bloc vers le voisin.
 */
object TvScrollStep {

    /** Fraction de la hauteur visible parcourue par appui. */
    const val PAGE_FRACTION = 0.6f

    /**
     * @return le déplacement demandé en pixels, ou `null` pour **laisser passer** la touche.
     */
    fun deltaFor(
        key: Key,
        viewportPx: Float,
        canScrollForward: Boolean,
        canScrollBackward: Boolean,
    ): Float? {
        val step = viewportPx * PAGE_FRACTION
        return when {
            key == Key.DirectionDown && canScrollForward  ->  step
            key == Key.DirectionUp   && canScrollBackward -> -step
            else                                          -> null
        }
    }
}

/**
 * Un pavé de texte que la télécommande peut faire défiler.
 *
 * **Le défaut corrigé** (« les fiches descriptives ne sont pas défilables »). Les deux
 * fiches posaient déjà `Modifier.verticalScroll` sur leur synopsis — mais sur un `Text`,
 * qui n'est pas focalisable. Un conteneur défilant ne reçoit les touches directionnelles
 * que s'il a le focus : le synopsis était donc défilable à la souris et à rien d'autre. Sur
 * un téléviseur il restait coupé net, sans aucun moyen d'en lire la fin — et sur la fiche
 * film, réalisateur et distribution passaient sous le bord de l'écran avec lui.
 *
 * **Un focalisable de plus a un coût** (§8.10) : celui-ci n'existe donc que si le contenu
 * déborde réellement. `canFocus` reste faux tant que `maxValue` vaut 0, et le bloc est
 * alors strictement transparent pour le D-pad — une fiche courte ne coûte aucun appui.
 *
 * ⚠️ **L'ordre des modifiers décide de tout** (§44) : `focusProperties` et `onFocusChanged`
 * précèdent la cible de focus — un `FocusEventModifierNode` n'observe que ce qui le suit —
 * et `onKeyEvent` la suit, faute de quoi il ne verrait jamais remonter les touches.
 */
@Composable
fun TvScrollableBlock(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scroll = rememberScrollState()
    val scope  = rememberCoroutineScope()
    var focused    by remember { mutableStateOf(false) }
    var viewportPx by remember { mutableFloatStateOf(0f) }

    // ⚠️ `ScrollState.maxValue` vaut `Int.MAX_VALUE` **tant que la mise en page n'a pas
    // eu lieu** : le lire tel quel rendrait tout bloc focalisable le temps d'une frame, et
    // ferait clignoter une barre de défilement sur les fiches courtes.
    val overflows = scroll.maxValue > 0 && scroll.maxValue != Int.MAX_VALUE

    Box(
        modifier = modifier
            .onSizeChanged { viewportPx = it.height.toFloat() }
            .focusProperties { canFocus = overflows }
            .onFocusChanged { focused = it.isFocused }
            .focusable()
            .onKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onKeyEvent false
                val delta = TvScrollStep.deltaFor(
                    key               = event.key,
                    viewportPx        = viewportPx,
                    canScrollForward  = scroll.canScrollForward,
                    canScrollBackward = scroll.canScrollBackward,
                ) ?: return@onKeyEvent false
                scope.launch { scroll.animateScrollBy(delta) }
                true
            },
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(scroll)
                // La gouttière n'est réservée que si une barre s'y dessine : sur une fiche
                // courte, rien ne doit rogner la largeur du texte.
                .then(if (overflows) Modifier.padding(end = 12.dp) else Modifier),
            content = content,
        )

        // Repère de position — et surtout, signal qu'il **reste** du texte. Sans lui, un
        // synopsis coupé pile en fin de ligne se lit comme un synopsis complet.
        if (overflows) {
            TvScrollBar(
                fraction = if (scroll.maxValue == 0) 0f else scroll.value.toFloat() / scroll.maxValue,
                active   = focused,
                modifier = Modifier.align(Alignment.CenterEnd),
            )
        }
    }
}

/**
 * Barre de position, éteinte tant que le bloc n'a pas le focus.
 *
 * Elle s'allume à l'accent au moment où la touche `▼` agit dessus : c'est le seul instant
 * où elle est actionnable, donc le seul où elle mérite d'être lisible à trois mètres (§46).
 */
@Composable
private fun TvScrollBar(fraction: Float, active: Boolean, modifier: Modifier = Modifier) {
    val thumbFraction = 0.35f
    Box(
        modifier = modifier
            .width(4.dp)
            .fillMaxHeight()
            .clip(PurpleShapes.Pill)
            .background(PurplePalette.Line1.copy(alpha = if (active) 0.6f else 0.25f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(thumbFraction)
                .align(verticalBiasOf(fraction))
                .clip(PurpleShapes.Pill)
                .background(
                    if (active) PurplePalette.Purple400 else PurplePalette.Fg4.copy(alpha = 0.5f),
                ),
        )
    }
}

/** Position verticale du curseur, de 0 (en haut) à 1 (en bas). */
private fun verticalBiasOf(fraction: Float): BiasAlignment =
    BiasAlignment(
        horizontalBias = 0f,
        verticalBias   = (fraction.coerceIn(0f, 1f) * 2f) - 1f,
    )
