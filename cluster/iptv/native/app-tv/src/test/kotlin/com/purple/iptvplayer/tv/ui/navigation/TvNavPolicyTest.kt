package com.purple.iptvplayer.tv.ui.navigation

import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.input.key.Key
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Couverture des quatre bloquants de `AUDIT_TV_UX.md` (lot 1 du plan).
 *
 * Chaque test nomme le comportement **mesuré à l'émulateur** avant correction, pour qu'un
 * futur remaniement ne puisse pas le réintroduire silencieusement.
 */
class TvNavPolicyTest {

    private val player = TvScreen.Player(url = "http://x/1.ts", title = "AR | SHAHID")

    @Test
    fun `les constantes de touches sont distinctes sur le classpath de test`() {
        // §8.3 : sans ce garde-fou, un classpath dégradé rendrait toutes les assertions
        // vraies sans rien prouver.
        val keys = listOf(Key.Back, Key.DirectionUp, Key.DirectionDown, Key.DirectionLeft)
        assertEquals("des constantes Key se confondent", 4, keys.distinct().size)
        assertNotEquals(FocusDirection.Up, FocusDirection.Down)
    }

    // ── B4 — RETOUR ne navigue jamais ─────────────────────────────────────────

    /**
     * Mesuré avant correction : `RETOUR ×3` depuis le lecteur ⇒
     * `topResumedActivity = com.google.android.tvlauncher`, **en pleine lecture**.
     */
    @Test
    fun `retour depuis le lecteur revient a l accueil`() {
        assertEquals(TvScreen.Main, TvBackPolicy.destinationFor(player))
        assertTrue(TvBackPolicy.handlesBack(player))
    }

    /** Ouverture volontaire depuis le badge d'essai : le retour doit ramener au catalogue. */
    @Test
    fun `retour depuis un achat volontaire revient a l accueil`() {
        val voluntary = TvScreen.Purchase(blocking = false)
        assertEquals(TvScreen.Main, TvBackPolicy.destinationFor(voluntary))
    }

    /**
     * Le point critique de B2 rejoint ici B4 : si le `BackHandler` ramenait à `Main`
     * depuis la barrière, il rouvrirait exactement la fuite que B2 ferme — avec une
     * touche au lieu de deux appuis.
     */
    @Test
    fun `retour depuis la barriere d achat ne rejoint jamais le catalogue`() {
        val barrier = TvScreen.Purchase(blocking = true)
        assertNull(TvBackPolicy.destinationFor(barrier))
        assertFalse("aucun BackHandler sur la barrière", TvBackPolicy.handlesBack(barrier))
    }

    /** Depuis une racine, `RETOUR` quitte l'application : comportement Leanback attendu. */
    @Test
    fun `retour depuis une racine laisse la touche s echapper`() {
        assertNull(TvBackPolicy.destinationFor(TvScreen.Main))
        assertNull(TvBackPolicy.destinationFor(TvScreen.Setup))
        assertNull("écran de chargement initial", TvBackPolicy.destinationFor(null))
    }

    // ── B4 bis — le lecteur ne doit pas avaler RETOUR ─────────────────────────

    /**
     * **La moitié invisible de B4.** Consommer `Key.Back` fait renvoyer `true` à
     * `ComposeView.dispatchKeyEvent` : l'`Activity` ne voit jamais la touche et
     * l'`OnBackPressedDispatcher` n'est pas notifié. Un `BackHandler` seul serait resté
     * inerte dans le lecteur.
     */
    @Test
    fun `le lecteur ne consomme jamais RETOUR`() {
        assertFalse(TvPlayerKeys.consumesToRevealOverlay(Key.Back, overlayVisible = false))
        assertFalse(TvPlayerKeys.consumesToRevealOverlay(Key.Back, overlayVisible = true))
    }

    /** Le comportement utile est conservé : le premier appui réveille l'overlay. */
    @Test
    fun `overlay masque le premier appui est avale pour le reveler`() {
        assertTrue(TvPlayerKeys.consumesToRevealOverlay(Key.DirectionDown, overlayVisible = false))
        assertTrue(TvPlayerKeys.consumesToRevealOverlay(Key.DirectionCenter, overlayVisible = false))
    }

    /** Overlay visible, les touches doivent continuer à déplacer le focus (§29). */
    @Test
    fun `overlay visible les touches continuent leur route`() {
        assertFalse(TvPlayerKeys.consumesToRevealOverlay(Key.DirectionDown, overlayVisible = true))
        assertFalse(TvPlayerKeys.consumesToRevealOverlay(Key.DirectionRight, overlayVisible = true))
    }

    /** `RETOUR` quitte l'écran : il n'a pas à prolonger le minuteur de masquage. */
    @Test
    fun `retour ne rearme pas le minuteur de l overlay`() {
        assertFalse(TvPlayerKeys.countsAsInteraction(Key.Back))
        assertTrue(TvPlayerKeys.countsAsInteraction(Key.DirectionDown))
        assertTrue(TvPlayerKeys.countsAsInteraction(Key.MediaPlayPause))
    }

    // ── B2 — la barrière se contournait en deux appuis ────────────────────────

    @Test
    fun `la barriere n offre pas de sortie mais l ouverture volontaire si`() {
        assertFalse(TvPurchaseAccess.allowsDismiss(blocking = true))
        assertTrue(TvPurchaseAccess.allowsDismiss(blocking = false))
    }

    /**
     * Mesuré avant correction : `focusables : 1 → 'Plus tard'`, puis `▼ OK` ⇒
     * « Direct TV | 11899 CHAÎNES ». La barrière ne doit plus exposer ce chemin.
     */
    @Test
    fun `la barriere sans offre n expose aucune sortie vers le catalogue`() {
        assertFalse(TvPurchaseAccess.allowsDismiss(blocking = true))
    }

    /**
     * L'avertissement de l'audit, transformé en test : sans « Plus tard », l'écran
     * n'aurait plus **aucun** focalisable tant que la facturation ne rend rien. On
     * remplacerait une fuite par un écran mort.
     */
    @Test
    fun `une barriere sans offre reste manipulable`() {
        val count = TvPurchaseAccess.focusableCount(blocking = true, offerCount = 0, loading = false)
        assertTrue("un écran de barrière ne doit jamais compter zéro cible, trouvé $count", count >= 1)
        assertEquals("« Réessayer » + « Restaurer mes achats »", 2, count)
    }

    @Test
    fun `avec des offres la barriere expose une carte par offre`() {
        // 3 cartes + « Restaurer mes achats », désormais rendu dans les deux branches (#71).
        assertEquals(4, TvPurchaseAccess.focusableCount(blocking = true, offerCount = 3, loading = false))
        // Hors barrière, « Plus tard » s'ajoute.
        assertEquals(5, TvPurchaseAccess.focusableCount(blocking = false, offerCount = 3, loading = false))
    }

    /**
     * #71 — la restauration doit être atteignable **quel que soit** l'état des offres.
     *
     * Le test qui manquait : l'ancien décompte était juste pour la branche « pas d'offre »
     * et passait donc, tout en encodant la règle fausse. Comparer les deux branches à
     * offre près est le signal discriminant.
     */
    @Test
    fun `restaurer ses achats reste atteignable avec ou sans offre`() {
        for (blocking in listOf(true, false)) {
            val sansOffre = TvPurchaseAccess.focusableCount(blocking, offerCount = 0, loading = false)
            val avecOffres = TvPurchaseAccess.focusableCount(blocking, offerCount = 3, loading = false)
            // Sans offre : « Réessayer » + « Restaurer ». Avec offres : 3 cartes + « Restaurer ».
            assertEquals("blocking=$blocking", sansOffre - 1 + 3, avecOffres)
        }
    }

    /** Aucun état durable ne doit tomber à zéro focalisable, barrière ou non. */
    @Test
    fun `aucun etat durable de l ecran d achat n est sans cible`() {
        for (blocking in listOf(true, false)) {
            for (offers in 0..3) {
                val count = TvPurchaseAccess.focusableCount(blocking, offers, loading = false)
                assertTrue("blocking=$blocking offers=$offers ⇒ $count", count >= 1)
            }
        }
    }

    // ── B1 — les champs de saisie piègent le focus ────────────────────────────

    /**
     * Mesuré avant correction : `▼ ×5` depuis « Server (Host) » ⇒ focus inchangé cinq
     * fois. Le champ consomme les directions même clavier fermé.
     */
    @Test
    fun `haut et bas sortent du champ de saisie`() {
        assertEquals(FocusDirection.Down, TvFieldKeys.escapeDirectionFor(Key.DirectionDown))
        assertEquals(FocusDirection.Up, TvFieldKeys.escapeDirectionFor(Key.DirectionUp))
    }

    /**
     * Gauche et droite doivent rester au champ : ce sont les seules touches qui déplacent
     * le curseur dans le texte. Les intercepter rendrait la correction d'une faute de
     * frappe impossible — le défaut symétrique de celui corrigé.
     */
    @Test
    fun `gauche et droite restent au champ pour deplacer le curseur`() {
        assertNull(TvFieldKeys.escapeDirectionFor(Key.DirectionLeft))
        assertNull(TvFieldKeys.escapeDirectionFor(Key.DirectionRight))
    }

    /** `OK` valide, il ne sort pas du champ. */
    @Test
    fun `la validation ne sort pas du champ`() {
        assertNull(TvFieldKeys.escapeDirectionFor(Key.DirectionCenter))
        assertNull(TvFieldKeys.escapeDirectionFor(Key.Enter))
    }

    /**
     * Mesuré avant correction : `RETOUR` depuis l'écran de connexion ⇒
     * `topResumedActivity = com.google.android.tvlauncher`. En saisie, il doit d'abord
     * refermer le clavier.
     */
    @Test
    fun `retour ferme le clavier avant de quitter`() {
        assertTrue(TvFieldKeys.closesEditing(Key.Back, editing = true))
        assertFalse("hors saisie, RETOUR appartient à l'écran", TvFieldKeys.closesEditing(Key.Back, editing = false))
        assertFalse(TvFieldKeys.closesEditing(Key.DirectionDown, editing = true))
    }
}

/**
 * Retour **à l'intérieur** de `TvMainScreen`.
 *
 * Défaut constaté à l'émulateur après le premier jet de B4 : `RETOUR` depuis les
 * Paramètres quittait l'application (`topResumedActivity = com.google.android.tvlauncher`),
 * parce que `Main` est une seule destination du `TvNavGraph` mais six onglets pour
 * l'utilisateur. L'audit excluait ce cas — la touche ne doit s'échapper que depuis
 * l'écran d'accueil.
 */
class TvTabBackPolicyTest {

    @Test
    fun `depuis l accueil sans surcouche la touche s echappe`() {
        assertEquals(
            TvTabBackPolicy.Action.Escape,
            TvTabBackPolicy.actionFor(selectedIndex = 0, hasOpenOverlay = false),
        )
        assertFalse(TvTabBackPolicy.handlesBack(selectedIndex = 0, hasOpenOverlay = false))
    }

    /** Le cas mesuré : Paramètres est l'onglet 5, RETOUR y quittait l'application. */
    @Test
    fun `depuis un onglet interne le retour ramene a l accueil`() {
        for (tab in 1..5) {
            assertEquals(
                "onglet $tab",
                TvTabBackPolicy.Action.GoHome,
                TvTabBackPolicy.actionFor(selectedIndex = tab, hasOpenOverlay = false),
            )
            assertTrue("onglet $tab", TvTabBackPolicy.handlesBack(tab, hasOpenOverlay = false))
        }
    }

    /**
     * L'ordre compte : une confirmation de déconnexion ouverte doit se refermer **avant**
     * qu'on ne quitte l'onglet, sinon un seul appui ferait les deux.
     */
    @Test
    fun `une surcouche ouverte se ferme avant tout le reste`() {
        assertEquals(
            TvTabBackPolicy.Action.DismissOverlay,
            TvTabBackPolicy.actionFor(selectedIndex = 5, hasOpenOverlay = true),
        )
        // Y compris sur l'accueil, où sans elle la touche s'échapperait.
        assertEquals(
            TvTabBackPolicy.Action.DismissOverlay,
            TvTabBackPolicy.actionFor(selectedIndex = 0, hasOpenOverlay = true),
        )
        assertTrue(TvTabBackPolicy.handlesBack(selectedIndex = 0, hasOpenOverlay = true))
    }
}

/**
 * G13 — l'overlay du lecteur ramenait le focus sur « Lecture » à chaque réapparition.
 *
 * Mesuré avant correction : après masquage, tout appui ⇒ focus `[876,456]`, le bouton
 * central, quel que soit le contrôle que l'utilisateur avait quitté.
 */
class TvOverlayFocusTest {

    /** À la toute première apparition, il n'y a rien à restaurer : on pose un défaut. */
    @Test
    fun `la premiere apparition pose le bouton central`() {
        assertEquals(
            PlayerControl.PlayPause,
            TvOverlayFocus.targetFor(everShown = false, lastControl = PlayerControl.Tracks),
        )
    }

    /**
     * Le cœur de G13 : à la réapparition, on rend le contrôle quitté. Le paramètre
     * `lastControl` est délibérément différent du défaut, sinon le test ne pourrait pas
     * échouer (§8.3).
     */
    @Test
    fun `une reapparition restaure le dernier controle`() {
        assertEquals(
            PlayerControl.Tracks,
            TvOverlayFocus.targetFor(everShown = true, lastControl = PlayerControl.Tracks),
        )
        assertEquals(
            PlayerControl.Speed,
            TvOverlayFocus.targetFor(everShown = true, lastControl = PlayerControl.Speed),
        )
    }

    /** Tout contrôle de l'overlay doit être restaurable — pas seulement quelques-uns. */
    @Test
    fun `tous les controles sont restaurables`() {
        for (c in PlayerControl.entries) {
            assertEquals("contrôle $c", c, TvOverlayFocus.targetFor(everShown = true, lastControl = c))
        }
        assertEquals("les huit contrôles de l'overlay", 8, PlayerControl.entries.size)
    }
}
