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

    // ── Retirer de « Reprendre la lecture » : la répétition n'est pas un appui ──────

    /**
     * Rejoue la séquence réelle d'un appui long sur la télécommande.
     *
     * Le défaut signalé à l'usage : « retirer un contenu de *Reprendre la lecture* ne
     * fonctionne pas bien ». La touche `OK` est encore enfoncée quand le dialogue s'ouvre
     * (`onLongClick` part au `repeatCount` 1) ; ses **répétitions automatiques** sont donc
     * délivrées au dialogue. Le garde armait sur n'importe quel appui, donc sur
     * celles-là — et le relâchement n'était plus avalé : « Annuler » se validait seul.
     *
     * Ce test est le signal discriminant que les précédents n'avaient pas : ils ne
     * vérifiaient que `swallows`, jamais **quand** on arme.
     */
    @Test
    fun `une repetition de la pression tenue n arme pas le dialogue`() {
        var armed = false

        // Répétitions de l'appui qui a ouvert le dialogue : elles arrivent ici, mais
        // appartiennent à la pression précédente.
        for (repeat in 2..6) {
            if (TvLongPressGuard.arms(Key.DirectionCenter, KeyEventType.KeyDown, repeat)) armed = true
        }
        assertFalse("une répétition ne doit pas armer", armed)

        // Le relâchement de cette même pression doit donc être avalé.
        assertTrue(
            "le relâchement de l'appui long doit être avalé",
            TvLongPressGuard.swallows(Key.DirectionCenter, KeyEventType.KeyUp, armed),
        )
    }

    /** Un appui délibéré dans le dialogue, lui, arme — sinon plus rien ne se valide. */
    @Test
    fun `un appui neuf arme le dialogue et laisse passer son relachement`() {
        var armed = false
        if (TvLongPressGuard.arms(Key.DirectionCenter, KeyEventType.KeyDown, 0)) armed = true

        assertTrue("un appui neuf doit armer", armed)
        assertFalse(
            "le relâchement d'un appui neuf doit atteindre le bouton",
            TvLongPressGuard.swallows(Key.DirectionCenter, KeyEventType.KeyUp, armed),
        )
    }

    @Test
    fun `seules les touches de validation arment`() {
        assertFalse(TvLongPressGuard.arms(Key.DirectionDown, KeyEventType.KeyDown, 0))
        assertFalse(TvLongPressGuard.arms(Key.Back, KeyEventType.KeyDown, 0))
        // Un relâchement n'arme jamais : c'est l'appui qui arme.
        assertFalse(TvLongPressGuard.arms(Key.DirectionCenter, KeyEventType.KeyUp, 0))
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
