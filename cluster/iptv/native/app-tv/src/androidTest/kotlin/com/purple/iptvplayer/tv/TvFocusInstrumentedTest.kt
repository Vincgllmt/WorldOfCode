package com.purple.iptvplayer.tv

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

/**
 * Tests **instrumentés** du focus D-pad.
 *
 * Ils tournent sur l'AVD `purple_tv` ou sur un appareil, jamais en JVM :
 * ce sont les seuls qui rendent réellement l'arbre Compose, envoient de vraies
 * touches directionnelles et observent le focus qui en résulte. Les tests JVM
 * de `core` ne disent rien de tout cela (CLAUDE.md §8.14).
 *
 * Lancement :
 * ```
 * emulator -avd purple_tv -gpu host &
 * ./gradlew :app-tv:connectedDebugAndroidTest
 * ```
 *
 * Le premier test verrouille le piège du §52.5, qui a coûté un écran entier
 * inutilisable : **un plein écran focalisable est un cul-de-sac de focus**. La
 * recherche directionnelle de Compose exige qu'un candidat dépasse le rectangle
 * focalisé du côté visé ; quand ce rectangle est l'écran entier, aucune
 * direction n'aboutit — dans aucun sens.
 */
@OptIn(ExperimentalTestApi::class)   // `performKeyInput` : injection de touches
class TvFocusInstrumentedTest {

    @get:Rule
    val compose = createComposeRule()

    @Test
    fun leDpadDescendEntreDeuxElementsEmpiles() {
        var focalise = ""
        compose.setContent {
            Column(Modifier.fillMaxSize()) {
                listOf("haut", "bas").forEach { nom ->
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .testTag(nom)
                            .onFocusChanged { if (it.isFocused) focalise = nom }
                            .focusable()
                    )
                }
            }
        }

        compose.onNodeWithTag("haut").requestFocus()
        compose.waitForIdle()
        assertEquals("le focus doit partir du haut", "haut", focalise)

        compose.onNodeWithTag("haut").performKeyInput { pressKey(Key.DirectionDown) }
        compose.waitForIdle()
        assertEquals("▼ doit descendre sur l'élément du bas", "bas", focalise)
    }

    /**
     * Le piège du §52.5, retourné en garde-fou permanent.
     *
     * Le défaut : un `Box` racine **plein écran ET focalisable** capte le focus,
     * et plus aucune direction n'aboutit. La recherche directionnelle de Compose
     * exige qu'un candidat **dépasse** le rectangle focalisé du côté visé ;
     * quand ce rectangle est l'écran entier, aucune direction ne trouve rien —
     * dans aucun sens. C'est ce qui avait rendu l'écran de lecture inutilisable.
     *
     * Vérifié : ce test échoue bel et bien si l'on rend la racine focalisable
     * (constaté à l'exécution, « Focus obtenu : "" »). Il est donc gardé sous sa
     * forme CORRECTE — racine non focalisable — pour rester vert tant que la
     * règle est respectée, et virer au rouge le jour où quelqu'un la casse.
     *
     * Un garde-fou en permanence au rouge finit par être ignoré ; celui-ci ne
     * parle que quand il a quelque chose à dire.
     */
    @Test
    fun uneRacinePleinEcranNeDoitPasEtreFocalisable() {
        var focalise = ""
        compose.setContent {
            // La racine porte la mise en page, PAS le focus. C'est toute la
            // différence entre un écran utilisable et un cul-de-sac.
            Box(Modifier.fillMaxSize().testTag("racine")) {
                Column(Modifier.fillMaxSize()) {
                    listOf("a", "b").forEach { nom ->
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(120.dp)
                                .testTag(nom)
                                .onFocusChanged { if (it.isFocused) focalise = nom }
                                .focusable()
                        )
                    }
                }
            }
        }

        compose.onNodeWithTag("a").requestFocus()
        compose.waitForIdle()
        assertEquals("le focus doit se poser sur le premier enfant", "a", focalise)

        compose.onNodeWithTag("a").performKeyInput { pressKey(Key.DirectionDown) }
        compose.waitForIdle()
        assertEquals(
            "▼ doit atteindre le second enfant. S'il n'atteint rien, c'est que la " +
                "racine est redevenue focalisable et piège le focus (CLAUDE.md §52.5).",
            "b", focalise,
        )
    }
}
