package com.purple.iptvplayer.tv.ui.navigation

import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import com.purple.iptvplayer.tv.ui.common.TvScrollStep
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Les trois décisions ajoutées pour les défauts remontés à l'usage sur la 1.3.0 :
 * navigation impossible dans le lecteur, confirmation qui se referme au relâchement de
 * l'appui long, fiches descriptives non défilables.
 */
class TvPlayerNavigationTest {

    // ── Le lecteur redonne la main aux contrôles ─────────────────────────────

    @Test
    fun `une direction recue par la racine ramene le focus dans l overlay`() {
        assertTrue(
            TvPlayerKeys.reentersOverlay(Key.DirectionDown, overlayVisible = true, rootFocused = true),
        )
    }

    /**
     * Overlay masqué : la touche sert à le réafficher, pas à déplacer un focus qui n'a
     * encore aucune cible visible.
     */
    @Test
    fun `overlay masque le garde-fou ne s applique pas`() {
        assertFalse(
            TvPlayerKeys.reentersOverlay(Key.DirectionDown, overlayVisible = false, rootFocused = true),
        )
    }

    /**
     * Le cas nominal : un contrôle porte le focus, la recherche directionnelle marche
     * toute seule. Intervenir la casserait.
     */
    @Test
    fun `un controle focalise garde la main`() {
        assertFalse(
            TvPlayerKeys.reentersOverlay(Key.DirectionRight, overlayVisible = true, rootFocused = false),
        )
    }

    @Test
    fun `retour n est jamais detourne vers l overlay`() {
        assertFalse(
            TvPlayerKeys.reentersOverlay(Key.Back, overlayVisible = true, rootFocused = true),
        )
    }

    @Test
    fun `seules les directions sont concernees`() {
        assertFalse(
            TvPlayerKeys.reentersOverlay(Key.DirectionCenter, overlayVisible = true, rootFocused = true),
        )
    }

    /** B4 — la garantie de sortie du lecteur ne doit pas régresser. */
    @Test
    fun `retour reste non consomme par le lecteur`() {
        assertFalse(TvPlayerKeys.consumesToRevealOverlay(Key.Back, overlayVisible = false))
        assertFalse(TvPlayerKeys.consumesToRevealOverlay(Key.Back, overlayVisible = true))
        assertEquals(TvScreen.Main, TvBackPolicy.destinationFor(TvScreen.Player("u", "t")))
    }

    // ── L'appui long ne se valide pas tout seul ──────────────────────────────

    /**
     * Le relâchement de l'appui long arrive dans la fenêtre qui vient de s'ouvrir, sans
     * appui correspondant : ce n'est pas un clic.
     */
    @Test
    fun `un relachement sans appui prealable est avale`() {
        assertTrue(
            TvLongPressGuard.swallows(Key.DirectionCenter, KeyEventType.KeyUp, armed = false),
        )
    }

    @Test
    fun `un relachement apres un appui dans la fenetre est un vrai clic`() {
        assertFalse(
            TvLongPressGuard.swallows(Key.DirectionCenter, KeyEventType.KeyUp, armed = true),
        )
    }

    @Test
    fun `l appui lui-meme passe toujours`() {
        assertFalse(
            TvLongPressGuard.swallows(Key.DirectionCenter, KeyEventType.KeyDown, armed = false),
        )
    }

    @Test
    fun `les directions ne sont jamais avalees par le garde-fou`() {
        assertFalse(TvLongPressGuard.swallows(Key.DirectionUp, KeyEventType.KeyUp, armed = false))
        assertFalse(TvLongPressGuard.swallows(Key.Back, KeyEventType.KeyUp, armed = false))
    }

    @Test
    fun `les trois touches de validation sont couvertes`() {
        assertTrue(TvLongPressGuard.isConfirmKey(Key.DirectionCenter))
        assertTrue(TvLongPressGuard.isConfirmKey(Key.Enter))
        assertTrue(TvLongPressGuard.isConfirmKey(Key.NumPadEnter))
        assertFalse(TvLongPressGuard.isConfirmKey(Key.DirectionDown))
    }

    // ── Un synopsis défile, puis rend la touche ──────────────────────────────

    @Test
    fun `on defile tant qu il reste du texte`() {
        val delta = TvScrollStep.deltaFor(
            key = Key.DirectionDown, viewportPx = 200f,
            canScrollForward = true, canScrollBackward = false,
        )
        assertEquals(120f, delta!!, 0.01f)
    }

    /**
     * §8.14 — en bas du texte, la touche doit **repartir**, sinon le focus est enfermé
     * dans le synopsis et la fiche n'a plus de sortie.
     */
    @Test
    fun `en bas de course la touche est rendue`() {
        assertNull(
            TvScrollStep.deltaFor(
                key = Key.DirectionDown, viewportPx = 200f,
                canScrollForward = false, canScrollBackward = true,
            ),
        )
    }

    @Test
    fun `en haut de course la touche est rendue`() {
        assertNull(
            TvScrollStep.deltaFor(
                key = Key.DirectionUp, viewportPx = 200f,
                canScrollForward = true, canScrollBackward = false,
            ),
        )
    }

    @Test
    fun `remonter parcourt la meme distance vers le haut`() {
        val delta = TvScrollStep.deltaFor(
            key = Key.DirectionLeft, viewportPx = 200f,
            canScrollForward = true, canScrollBackward = true,
        )
        assertNull("l'axe horizontal ne défile pas", delta)

        val up = TvScrollStep.deltaFor(
            key = Key.DirectionUp, viewportPx = 200f,
            canScrollForward = true, canScrollBackward = true,
        )
        assertEquals(-120f, up!!, 0.01f)
    }
}
