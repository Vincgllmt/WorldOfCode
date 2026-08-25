package com.purple.iptvplayer.tv.ui.navigation

import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType

/**
 * Décisions de navigation de `app-tv`, extraites des composables pour être testables sans
 * appareil (§4).
 *
 * Elles répondent aux quatre bloquants de `AUDIT_TV_UX.md` ; le détail de chaque cause est
 * dans `docs/PLAN_CORRECTION_TV.md`, lot 1.
 */

// ── B4 : où mène RETOUR ───────────────────────────────────────────────────────

/**
 * `RETOUR` est la commande la plus utilisée après les flèches sur Android TV. Elle
 * n'était interceptée nulle part : `TvNavGraph` est une machine à états `when` sans pile
 * de navigation, la touche traversait jusqu'à l'`Activity`, qui se terminait — en pleine
 * lecture au troisième appui.
 */
object TvBackPolicy {

    /**
     * Destination du retour depuis [screen], ou `null` pour **laisser la touche
     * s'échapper** — c'est-à-dire quitter l'application.
     *
     * Rendre `null` est un choix, pas un oubli :
     * - `Main` et `Setup` sont des **racines** ; `RETOUR` depuis une racine quitte
     *   l'application, comportement Leanback attendu.
     * - `Purchase(blocking = true)` est une **barrière** : en sortir vers `Main` serait
     *   exactement la fuite de revenu de B2. Quitter vaut mieux que contourner.
     */
    fun destinationFor(screen: TvScreen?): TvScreen? = when (screen) {
        is TvScreen.Player   -> TvScreen.Main
        is TvScreen.Purchase -> if (screen.blocking) null else TvScreen.Main
        is TvScreen.Setup    -> null
        is TvScreen.Main     -> null
        null                 -> null
    }

    /** Le `BackHandler` ne s'active que là où le retour a une destination. */
    fun handlesBack(screen: TvScreen?): Boolean = destinationFor(screen) != null
}

/**
 * Retour **à l'intérieur** de `TvMainScreen` — la moitié que [TvBackPolicy] ne voit pas.
 *
 * `Main` est une seule destination du `TvNavGraph`, mais six onglets pour l'utilisateur.
 * Traiter l'ensemble comme une racine faisait quitter l'application depuis les Paramètres,
 * ce que l'audit excluait explicitement : la touche ne doit s'échapper que **depuis
 * l'écran d'accueil**. Constaté à l'émulateur après le premier jet de B4.
 *
 * L'ordre compte : on ferme d'abord ce qui est ouvert par-dessus, puis on remonte d'onglet,
 * et seulement alors on laisse partir.
 */
object TvTabBackPolicy {

    /** Onglet d'accueil — Direct TV. Le seul depuis lequel `RETOUR` quitte. */
    const val HOME_INDEX = 0

    sealed interface Action {
        /** Refermer une confirmation ouverte par-dessus l'onglet. */
        object DismissOverlay : Action
        /** Revenir à l'onglet d'accueil. */
        object GoHome : Action
        /** Laisser la touche remonter à l'Activity : quitter l'application. */
        object Escape : Action
    }

    fun actionFor(selectedIndex: Int, hasOpenOverlay: Boolean): Action = when {
        hasOpenOverlay                -> Action.DismissOverlay
        selectedIndex != HOME_INDEX   -> Action.GoHome
        else                          -> Action.Escape
    }

    /** Le `BackHandler` de `TvMainScreen` reste inactif sur l'accueil sans surcouche. */
    fun handlesBack(selectedIndex: Int, hasOpenOverlay: Boolean): Boolean =
        actionFor(selectedIndex, hasOpenOverlay) != Action.Escape
}

/**
 * Filtre des touches du lecteur — le second mécanisme de B4, sans lequel le
 * [TvBackPolicy] resterait inerte.
 *
 * Le `Box` racine de `TvPlayerScreen` consommait **tout** `KeyDown` quand l'overlay est
 * masqué, `Key.Back` compris. Une valeur consommée fait renvoyer `true` à
 * `ComposeView.dispatchKeyEvent` : l'`Activity` ne voit jamais la touche, donc
 * l'`OnBackPressedDispatcher` n'est **jamais** notifié. C'est ce qui explique la trace
 * mesurée — deux appuis avalés par l'overlay, le troisième échappant à tout le monde.
 */
object TvPlayerKeys {

    /**
     * `true` quand la touche doit être **avalée** pour ne servir qu'à réveiller l'overlay.
     *
     * @param overlayVisible l'overlay est déjà affiché : la touche doit alors continuer sa
     *   route pour déplacer le focus entre les contrôles.
     */
    fun consumesToRevealOverlay(key: Key, overlayVisible: Boolean): Boolean = when {
        // RETOUR n'est pas une interaction de lecture. Le consommer coupait la seule voie
        // de sortie de l'écran.
        key == Key.Back -> false
        overlayVisible  -> false
        else            -> true
    }

    /**
     * `true` quand la touche doit réarmer le minuteur de masquage (§29).
     *
     * `RETOUR` en est exclu pour la même raison : il quitte l'écran, il n'y prolonge rien.
     */
    fun countsAsInteraction(key: Key): Boolean = key != Key.Back

    /** Les quatre directions, seules touches concernées par une recherche de focus. */
    private val DIRECTIONS = setOf(
        Key.DirectionUp, Key.DirectionDown, Key.DirectionLeft, Key.DirectionRight,
    )

    /**
     * `true` quand la touche doit **ramener le focus dans l'overlay** au lieu de suivre
     * son cours.
     *
     * Le cas corrigé (« impossible de naviguer sur le lecteur ») : l'overlay est affiché,
     * mais c'est le `Box` racine — plein écran — qui porte le focus. La recherche
     * directionnelle de Compose ne retient un candidat que s'il **dépasse** le rectangle
     * focalisé du côté visé ; rien ne dépasse le plein écran, donc aucune direction
     * n'aboutit, dans aucun sens. Sans ce garde-fou l'écran paraît figé, et le seul
     * mécanisme qui rendait le focus à un contrôle — le masquage automatique — ne se
     * déclenche pas non plus, chaque appui réarmant son minuteur.
     *
     * @param rootFocused la racine porte elle-même le focus, aucun contrôle ne l'a.
     */
    fun reentersOverlay(key: Key, overlayVisible: Boolean, rootFocused: Boolean): Boolean =
        overlayVisible && rootFocused && key in DIRECTIONS
}

/**
 * Le relâchement d'un appui long n'appartient pas à la fenêtre qui vient de s'ouvrir.
 *
 * Le défaut mesuré : maintenir `OK` sur une carte de « Reprendre la lecture » ouvrait bien
 * la confirmation, et la relâcher la refermait aussitôt. `onLongClick` part au
 * `repeatCount` 1 de `DPAD_CENTER`, touche encore enfoncée ; le dialogue s'ouvre et prend
 * le focus de fenêtre avant l'`ACTION_UP`. `androidx.tv.material3.Surface` déclenche son
 * `onClick` sur cet `ACTION_UP` isolé, et le bouton d'arrivée — « Annuler » — se valide
 * seul.
 *
 * La règle est indépendante du dialogue : **un relâchement sans appui préalable dans la
 * fenêtre n'est pas un clic**. Elle est ici, et non dans le composable, pour être testable
 * sans appareil (§4).
 */
object TvLongPressGuard {

    /** Les touches que `androidx.tv.material3.Surface` traite comme une validation. */
    fun isConfirmKey(key: Key): Boolean =
        key == Key.DirectionCenter || key == Key.Enter || key == Key.NumPadEnter

    /**
     * @param armed un appui a déjà été vu dans cette fenêtre.
     * @return `true` si l'événement doit être **avalé** au lieu d'être remis au bouton.
     */
    fun swallows(key: Key, type: KeyEventType, armed: Boolean): Boolean =
        isConfirmKey(key) && type == KeyEventType.KeyUp && !armed
}

/**
 * Contrôles de l'overlay du lecteur — G13.
 *
 * Ils portent une identité pour que le focus puisse être **restauré** : l'effet de reprise
 * réclamait inconditionnellement le bouton central à chaque réapparition de l'overlay, et
 * l'utilisateur qui était sur « Pistes » ou sur la vitesse devait refaire le trajet.
 */
enum class PlayerControl { Back, Tracks, Speed, Rewind, PlayPause, Forward, Restart, Next }

/**
 * Décision pure : quel contrôle reçoit le focus quand l'overlay apparaît ?
 *
 * Variante « au réaffichage » du piège §8.8 — l'état qui sert de clé à l'effet
 * (`overlayVisible`) est aussi celui que l'effet écrase. On distingue donc la **première**
 * apparition, où poser un défaut sensé a du sens, des suivantes, où il faut rendre à
 * l'utilisateur ce qu'il avait quitté.
 */
object TvOverlayFocus {

    /** Contrôle proposé à la toute première apparition de l'overlay. */
    val DEFAULT = PlayerControl.PlayPause

    fun targetFor(everShown: Boolean, lastControl: PlayerControl): PlayerControl =
        if (everShown) lastControl else DEFAULT
}

// ── B2 : ce que la barrière d'achat autorise ─────────────────────────────────

/**
 * L'écran d'achat rendait inconditionnellement son lien « Plus tard », et `TvNavGraph`
 * câblait le même `onBack` pour les deux chemins d'arrivée. Avec un essai expiré, cet
 * unique focalisable ouvrait le catalogue complet en deux appuis.
 */
object TvPurchaseAccess {

    /** Le lien « Plus tard » n'existe que hors barrière — cf. `PurchaseScreen` mobile (P9). */
    fun allowsDismiss(blocking: Boolean): Boolean = !blocking

    /**
     * Un écran de barrière ne doit **jamais** compter zéro focalisable : sans « Plus tard »,
     * l'absence d'offre laisserait l'utilisateur devant un écran mort, sans même pouvoir
     * restaurer un achat déjà payé (§32). On remplacerait une fuite par une impasse — le
     * défaut symétrique que §8.14 interdit.
     *
     * @return le nombre d'éléments focalisables que l'écran doit exposer. Jamais 0.
     */
    fun focusableCount(blocking: Boolean, offerCount: Int, loading: Boolean): Int {
        val dismiss = if (allowsDismiss(blocking)) 1 else 0
        return when {
            // Le chargement est transitoire : un compteur à zéro y est acceptable.
            loading        -> dismiss
            offerCount > 0 -> dismiss + offerCount
            // Repli obligatoire : « Réessayer » + « Restaurer mes achats ». C'est lui qui
            // garantit l'invariant testé par `une barriere sans offre reste manipulable`.
            else           -> dismiss + 2
        }
    }
}

// ── B1 : sortir d'un champ de saisie ─────────────────────────────────────────

/**
 * Un `TextField` consomme les touches directionnelles — y compris sur une ligne unique,
 * où elles ne déplacent aucun curseur. Le focus entré dans un champ n'en ressortait
 * jamais, et la connexion par identifiants était impossible à la télécommande.
 *
 * Même décision que `TvSearchBar` (§22, §26), extraite ici pour être partagée par les deux
 * écrans au lieu d'être réécrite — §8.2.
 */
object TvFieldKeys {

    /**
     * Direction de sortie à imposer avant que le champ ne voie la touche, ou `null` pour
     * la lui laisser.
     *
     * Gauche et droite sont volontairement absentes : elles servent à déplacer le curseur
     * **dans** le texte, ce qui est le comportement attendu d'un champ.
     */
    fun escapeDirectionFor(key: Key): FocusDirection? = when (key) {
        Key.DirectionDown -> FocusDirection.Down
        Key.DirectionUp   -> FocusDirection.Up
        else              -> null
    }

    /**
     * `RETOUR` ferme le clavier quand on est en saisie, au lieu de quitter l'application.
     *
     * @return `true` si la touche a été traitée par le champ.
     */
    fun closesEditing(key: Key, editing: Boolean): Boolean = key == Key.Back && editing
}
