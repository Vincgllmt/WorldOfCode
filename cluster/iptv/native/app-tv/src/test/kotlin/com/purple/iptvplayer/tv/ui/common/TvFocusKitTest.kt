package com.purple.iptvplayer.tv.ui.common

import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.input.key.Key
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

/**
 * Couverture des décisions pures de [TvFocusKit].
 *
 * La mécanique de focus elle-même ne se prouve qu'à l'écran (§8.14, protocole de §1.5 du
 * plan) ; ce qui se teste ici est la **décision** que les modifiers délèguent — donc
 * exactement le code livré, pas une copie.
 */
@OptIn(ExperimentalComposeUiApi::class)
class TvFocusKitTest {

    // ── Garde-fou d'environnement ─────────────────────────────────────────────
    //
    // `Key` et `FocusDirection` sont des value class dont les constantes viennent, côté
    // Android, de `android.view.KeyEvent`. Si le classpath de test les rendait toutes à 0,
    // chaque assertion ci-dessous passerait sans rien prouver — le motif « un test qui ne
    // peut pas échouer ne prouve rien » (§8.3). Ce test échoue le premier si c'est le cas.

    @Test
    fun `les constantes de touches sont distinctes sur le classpath de test`() {
        val keys = listOf(Key.PageUp, Key.PageDown, Key.ChannelUp, Key.ChannelDown, Key.DirectionDown)
        assertEquals("des constantes Key se confondent : le classpath de test est vide", 5, keys.distinct().size)
        assertNotEquals(FocusDirection.Up, FocusDirection.Down)
    }

    // ── TvPageJump (G8, G11) ──────────────────────────────────────────────────

    @Test
    fun `page suivante descend le focus`() {
        assertEquals(FocusDirection.Down, TvPageJump.directionFor(Key.PageDown))
    }

    @Test
    fun `page precedente remonte le focus`() {
        assertEquals(FocusDirection.Up, TvPageJump.directionFor(Key.PageUp))
    }

    /**
     * Beaucoup de box émettent `CHANNEL_UP`/`CHANNEL_DOWN` là où d'autres émettent
     * `PAGE_UP`/`PAGE_DOWN`. Le relevé de l'audit les donne sans effet aujourd'hui : elles
     * doivent devenir le même raccourci, pas rester inertes.
     */
    @Test
    fun `chaine plus et moins sont traitees comme un saut de page`() {
        assertEquals(FocusDirection.Down, TvPageJump.directionFor(Key.ChannelDown))
        assertEquals(FocusDirection.Up, TvPageJump.directionFor(Key.ChannelUp))
    }

    /**
     * Le point sensible : rendre `null` est ce qui fait que `dpadPageJump` **ne consomme
     * pas** la touche. Si les directions y étaient traitées, le D-pad sauterait de huit
     * lignes à chaque appui sur Bas.
     */
    @Test
    fun `les directions du D-pad ne sont pas des sauts de page`() {
        assertNull(TvPageJump.directionFor(Key.DirectionDown))
        assertNull(TvPageJump.directionFor(Key.DirectionUp))
        assertNull(TvPageJump.directionFor(Key.DirectionLeft))
        assertNull(TvPageJump.directionFor(Key.DirectionRight))
        assertNull(TvPageJump.directionFor(Key.DirectionCenter))
    }

    /** Relevées sans effet par l'audit — elles doivent le rester. */
    @Test
    fun `les touches media et retour ne sont pas des sauts de page`() {
        assertNull(TvPageJump.directionFor(Key.MediaFastForward))
        assertNull(TvPageJump.directionFor(Key.MediaNext))
        assertNull(TvPageJump.directionFor(Key.MoveHome))
        assertNull(TvPageJump.directionFor(Key.Back))
    }

    // ── TvFocusEntry (G3, G6, G9) ─────────────────────────────────────────────

    /** Garde-fou du §30, conservé : le bout d'une liste ne doit pas jeter le focus au rail. */
    @Test
    fun `une direction bloquee annule l entree`() {
        val target = FocusRequester()
        assertEquals(
            FocusRequester.Cancel,
            TvFocusEntry.resolve(
                direction = FocusDirection.Down,
                blocked = setOf(FocusDirection.Up, FocusDirection.Down),
                target = target,
            ),
        )
    }

    /**
     * G3 : entrer dans le rail par la gauche doit mener à l'onglet **affiché**, pas au
     * voisin géométrique. Le blocage vertical ne doit pas déborder sur l'axe horizontal.
     */
    @Test
    fun `une direction non bloquee retient la cible`() {
        val target = FocusRequester()
        assertSame(
            target,
            TvFocusEntry.resolve(
                direction = FocusDirection.Left,
                blocked = setOf(FocusDirection.Up, FocusDirection.Down),
                target = target,
            ),
        )
    }

    /**
     * Le cas qui lèverait `IllegalStateException` si on ne le traitait pas : sur un
     * catalogue en chargement, aucune carte n'est composée, donc aucun requester n'est
     * attaché. On rend `Default` — Compose choisit alors comme avant, ce qui n'est pas
     * idéal mais n'est pas un plantage.
     */
    @Test
    fun `sans cible attachee on retombe sur le comportement par defaut`() {
        assertEquals(
            FocusRequester.Default,
            TvFocusEntry.resolve(FocusDirection.Left, blocked = emptySet(), target = null),
        )
    }

    /** Le blocage prime sur la cible : un garde-fou ne doit pas se contourner. */
    @Test
    fun `le blocage prime sur la cible`() {
        assertEquals(
            FocusRequester.Cancel,
            TvFocusEntry.resolve(
                direction = FocusDirection.Right,
                blocked = setOf(FocusDirection.Right),
                target = FocusRequester(),
            ),
        )
    }

    /** G9 : la barre de recherche refuse les deux directions latérales, pas le haut. */
    @Test
    fun `le garde-fou lateral de la barre de recherche laisse passer le haut`() {
        val blocked = setOf(FocusDirection.Left, FocusDirection.Right)
        assertEquals(FocusRequester.Cancel, TvFocusEntry.resolve(FocusDirection.Right, blocked, null))
        assertEquals(FocusRequester.Cancel, TvFocusEntry.resolve(FocusDirection.Left, blocked, null))
        assertEquals(FocusRequester.Default, TvFocusEntry.resolve(FocusDirection.Up, blocked, null))
    }

    // ── TvFocusAnchor (G5, G2) ────────────────────────────────────────────────

    @Test
    fun `une ancre neuve n a rien a restaurer`() {
        val anchor = TvFocusAnchor()
        assertNull(anchor.origin)
        assertNull(anchor.pending)
    }

    @Test
    fun `restaurer designe l element qui avait ouvert la page`() {
        val anchor = TvFocusAnchor()
        anchor.rememberOrigin(4242)
        assertNull("l'ancre ne doit pas agir tant que la page est ouverte", anchor.pending)

        anchor.restore()
        assertEquals(4242, anchor.pending)
    }

    /**
     * Sans cela l'ancre se rejouerait à chaque recomposition et volerait le focus à
     * l'utilisateur qui a déjà navigué ailleurs — le défaut symétrique de celui corrigé
     * (§8.14).
     */
    @Test
    fun `une ancre consommee ne se rejoue pas`() {
        val anchor = TvFocusAnchor()
        anchor.rememberOrigin("ARABES")
        anchor.restore()
        anchor.consume()

        assertNull(anchor.pending)
        assertNull("l'origine est libérée par restore()", anchor.origin)
    }

    /**
     * Le cas mesuré par l'audit : deux voies de fermeture (RETOUR et « Fermer ») doivent
     * donner **le même** résultat. Elles passent toutes deux par `restore()`, donc le
     * test porte sur l'idempotence de la seconde.
     */
    @Test
    fun `restaurer deux fois ne redesigne pas une origine consommee`() {
        val anchor = TvFocusAnchor()
        anchor.rememberOrigin(7)
        anchor.restore()
        anchor.consume()

        anchor.restore()   // seconde voie de fermeture, origine déjà libérée
        assertNull(anchor.pending)
    }

    /** Rouvrir une autre fiche remplace l'origine : on ne revient pas sur l'avant-dernière. */
    @Test
    fun `une nouvelle ouverture remplace l origine`() {
        val anchor = TvFocusAnchor()
        anchor.rememberOrigin(1)
        anchor.rememberOrigin(2)
        anchor.restore()
        assertEquals(2, anchor.pending)
    }
}

/**
 * G2 — le rail se dépliait dès que le focus y entrait.
 *
 * Reproductions mesurées, toutes des arrivées **non demandées** :
 * ```
 * Films → ouvrir une fiche → RETOUR    ⇒ rail DÉPLIÉ, focus 'Direct TV'
 * Séries → recherche → RETOUR          ⇒ rail DÉPLIÉ, focus 'Direct TV'
 * Paramètres → OK sur « Déconnexion »  ⇒ rail DÉPLIÉ, focus 'Live TV'
 * Fiche film → ◀                       ⇒ rail DÉPLIÉ, focus 'Downloads'
 * ```
 */
class TvRailExpansionTest {

    private val now = 1_000_000L

    /** Le seul cas où le dépliage est voulu : `◀` juste avant. */
    @Test
    fun `une entree laterale deliberee deplie le rail`() {
        assertTrue(
            TvRailExpansion.shouldExpand(
                railHasFocus = true, nowMs = now, lastLeftPressMs = now - 50,
            )
        )
    }

    /**
     * Le cas des quatre reproductions : le focus arrive par réattribution, sans qu'aucun
     * `◀` n'ait été pressé. `lastLeftPressMs = 0` est l'état initial.
     */
    @Test
    fun `une reprise de focus par defaut ne deplie pas`() {
        assertFalse(
            TvRailExpansion.shouldExpand(
                railHasFocus = true, nowMs = now, lastLeftPressMs = 0L,
            )
        )
    }

    /**
     * Un `◀` ancien ne doit pas rouvrir la fenêtre : sinon une fermeture de fiche
     * survenant longtemps après passerait pour délibérée.
     */
    @Test
    fun `un appui gauche ancien ne compte plus`() {
        val stale = now - TvRailExpansion.DELIBERATE_WINDOW_MS - 1
        assertFalse(TvRailExpansion.shouldExpand(true, now, stale))
    }

    /** Sans focus dans le rail, jamais de dépliage — quelle qu'ait été la dernière touche. */
    @Test
    fun `sans focus dans le rail il ne se deplie jamais`() {
        assertFalse(TvRailExpansion.shouldExpand(false, now, now))
        assertFalse(TvRailExpansion.shouldExpand(false, now, now - 10))
    }

    /** La borne exacte appartient au refus : `<` et non `<=`. */
    @Test
    fun `la borne de la fenetre est exclusive`() {
        val onBoundary = now - TvRailExpansion.DELIBERATE_WINDOW_MS
        assertFalse(TvRailExpansion.shouldExpand(true, now, onBoundary))
        assertTrue(TvRailExpansion.shouldExpand(true, now, onBoundary + 1))
    }
}

/**
 * G15 — le genre focalisé n'était pas celui dont on voyait les chaînes.
 *
 * Mesuré :
 * ```
 * focus 'ALBANIA' (317)  ·  panneau droit : AFRICANS CHANNELS, AFRICA, CANAL+ …
 * OK sur 'ALBANIA'       ·  panneau droit : RTSH 1, RTSH 2, RTSH 3 …
 * ```
 * Le panneau ne suivait que la **validation**, jamais le focus, et rien à l'écran ne
 * signalait le décalage.
 */
class TvGenrePreviewTest {

    /** Au démarrage, rien n'est validé ni survolé : on montre le premier genre. */
    @Test
    fun `sans selection ni survol on montre le premier genre`() {
        assertEquals("AFRIQUE", TvGenrePreview.resolve(null, null, "AFRIQUE"))
    }

    /** Le cœur du défaut : le survol doit piloter le panneau. */
    @Test
    fun `le survol pilote le panneau`() {
        assertEquals("ALBANIA", TvGenrePreview.resolve(null, "ALBANIA", "AFRIQUE"))
    }

    /**
     * La validation prime : c'est une intention explicite, et la seule qui survive à un
     * aller-retour dans un autre onglet. Le test utilise trois valeurs distinctes, sinon
     * il ne pourrait pas départager les priorités (§8.3).
     */
    @Test
    fun `la validation prime sur le survol`() {
        assertEquals("ARABES", TvGenrePreview.resolve("ARABES", "ALBANIA", "AFRIQUE"))
    }

    /** Catalogue vide : aucun genre à montrer, et surtout pas de plantage. */
    @Test
    fun `un catalogue vide ne designe rien`() {
        assertNull(TvGenrePreview.resolve(null, null, null))
    }

    /**
     * La temporisation doit absorber l'auto-répétition d'une télécommande (~100 ms par
     * appui) sans que l'accord des deux panneaux paraisse différé.
     */
    @Test
    fun `la temporisation absorbe l auto-repetition sans etre percue`() {
        assertTrue("doit couvrir au moins deux appuis répétés", TvGenrePreview.FOLLOW_DELAY_MS >= 200)
        assertTrue("au-delà de 400 ms le décalage se voit", TvGenrePreview.FOLLOW_DELAY_MS <= 400)
    }

    // ── Retrait d'un élément : rendre le focus (§71) ─────────────────────────
    //
    // Le retrait d'une carte de « Reprendre la lecture » détruit le nœud focalisé et le
    // focus n'est plus nulle part — la télécommande devient inerte. `TvRowRemovalFocus`
    // rend le focus, mais seulement **une fois le retrait composé** : la partie testable
    // ici est ce « une fois », car refocaliser trop tôt viserait la carte mourante.

    @Test
    fun `sans retrait en cours, il n'y a rien a attendre`() {
        val row = TvRowFocus()
        assertTrue(row.removalSettled())
    }

    @Test
    fun `un retrait n'est pas consomme tant que la carte est composee`() {
        val row = TvRowFocus()
        row.onAttached("a", isFirst = true)
        row.onAttached("b", isFirst = false)

        row.scheduleRestore("a")
        assertFalse("la carte retirée est encore composée", row.removalSettled())

        row.onDetached("a")
        assertTrue("la carte a quitté la composition", row.removalSettled())
    }

    @Test
    fun `le depart d'une AUTRE carte ne consomme pas le retrait`() {
        val row = TvRowFocus()
        row.onAttached("a", isFirst = true)
        row.onAttached("b", isFirst = false)

        row.scheduleRestore("a")
        row.onDetached("b")

        assertFalse("seul le départ de « a » compte", row.removalSettled())
    }

    @Test
    fun `chaque retrait arme une nouvelle restauration`() {
        val row = TvRowFocus()
        assertEquals(0, row.restoreTick)
        row.scheduleRestore("a")
        assertEquals(1, row.restoreTick)
        row.scheduleRestore("b")
        assertEquals(2, row.restoreTick)
    }

    @Test
    fun `clearRemoval libere l'attente`() {
        val row = TvRowFocus()
        row.onAttached("a", isFirst = true)
        row.scheduleRestore("a")
        assertFalse(row.removalSettled())

        row.clearRemoval()
        assertTrue("plus aucun retrait en attente", row.removalSettled())
    }
}
