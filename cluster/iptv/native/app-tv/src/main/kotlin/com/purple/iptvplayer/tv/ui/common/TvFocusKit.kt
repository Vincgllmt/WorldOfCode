package com.purple.iptvplayer.tv.ui.common

import androidx.compose.foundation.focusGroup
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.launch

/**
 * Mécanique de focus partagée par les écrans TV.
 *
 * 21 des 28 défauts de `AUDIT_TV_UX.md` sont des défauts de focus, et onze partagent leur
 * racine. Les corriger écran par écran serait la neuvième occurrence du motif §8.2 — une
 * décision écrite plusieurs fois finit toujours par diverger. Ils sont donc traités ici,
 * une fois, et appliqués en une ligne par écran.
 *
 * **Deux mécanismes distincts** se cachent derrière « le rail happe le focus ». Les
 * confondre est exactement ce qui a produit le §40 :
 *
 * | Mécanisme | Déclencheur | Outil |
 * |---|---|---|
 * | **Réattribution** — le nœud focalisé quitte la composition, Compose repart de la racine | fermeture de page, mutation de liste | [TvFocusAnchor] |
 * | **Recherche directionnelle** — pas de candidat dans l'axe, Compose élargit au parent | bord de liste, bord d'écran | [tvGroupEntry], [tvModalTrap] |
 *
 * Un `LaunchedEffect` ne convient à **aucun** des deux : il s'exécute aussi à la première
 * composition (§40) et ne connaît pas la direction.
 *
 * Chaque décision est extraite en objet pur ([TvFocusEntry], [TvPageJump]) pour être
 * testable sans appareil — c'est la règle de §4 appliquée au focus.
 */

// ── 1. Ancre de focus ─────────────────────────────────────────────────────────

/**
 * Mémorise **quel** élément doit reprendre le focus quand une page se ferme.
 *
 * Le motif corrigé (G5, et par ricochet G2) : fermer une fiche détruit l'élément focalisé,
 * Compose retombe sur le focalisable le plus proche de l'arbre — le rail, toujours présent
 * à gauche — qui se déplie alors « tout seul ». Rendre le focus à son point de départ
 * supprime la **cause** ; découpler le dépliage ne masquerait que l'**effet**.
 *
 * L'identité est une **clé de donnée** (id de film, nom de genre), jamais un
 * `FocusRequester` : dans une liste paresseuse, le nœud qui portait le requester a pu être
 * recyclé entre-temps.
 */
@Stable
class TvFocusAnchor {

    /** Clé de l'élément qui a ouvert la page courante. */
    var origin: Any? by mutableStateOf(null)
        private set

    /** Clé à re-focaliser maintenant ; `null` quand il n'y a rien à restaurer. */
    var pending: Any? by mutableStateOf(null)
        private set

    /** À appeler juste avant d'ouvrir une page depuis [key]. */
    fun rememberOrigin(key: Any?) {
        origin = key
    }

    /**
     * À appeler sur **toutes** les voies de fermeture — `RETOUR` *et* bouton « Fermer ».
     *
     * C'est ce qui manquait : les deux chemins donnaient deux résultats différents, et
     * aucun ne ramenait sur l'élément d'origine.
     */
    fun restore() {
        pending = origin
        origin = null
    }

    /** Appelé par [focusAnchor] une fois le focus rendu — l'ancre ne se rejoue pas. */
    fun consume() {
        pending = null
    }
}

@Composable
fun rememberTvFocusAnchor(): TvFocusAnchor = remember { TvFocusAnchor() }

/**
 * À poser sur l'élément identifié par [key] : il réclame le focus quand l'ancre le désigne.
 *
 * ⚠️ **Limite structurelle.** Un `FocusRequester` n'est réclamable que si son nœud est
 * composé. Dans une `LazyColumn`/`LazyRow`, un élément défilé hors de la fenêtre ne l'est
 * pas — il faut donc **restaurer la position de liste avant l'ancre**, c'est-à-dire hisser
 * les `LazyListState` au-dessus de la branche qui retire la liste de la composition.
 */
@Composable
fun Modifier.focusAnchor(anchor: TvFocusAnchor, key: Any): Modifier {
    val requester = remember { FocusRequester() }
    LaunchedEffect(anchor.pending) {
        if (anchor.pending == key) {
            // Laisser la recomposition attacher le nœud avant de réclamer le focus : même
            // précaution que TvSearchBar pour `canFocus` (§26).
            withFrameNanos { }
            runCatching { requester.requestFocus() }
            anchor.consume()
        }
    }
    return this.focusRequester(requester)
}

// ── 2. Piège modal ────────────────────────────────────────────────────────────

/**
 * Une page qui se comporte comme une modale garde le focus **jusqu'à sa fermeture** (G4).
 *
 * Symétrique du garde-fou posé côté rail au §30 : celui-là interdit l'entrée verticale,
 * celui-ci interdit la **sortie** dans les quatre directions.
 *
 * ⚠️ **Contrat.** N'appeler que sur un contenu qui possède déjà un `BackHandler`
 * effectivement notifié, sinon le focus est enfermé sans issue — défaut pire que celui
 * corrigé (§8.14). Dans `app-tv` cela suppose le correctif B4 livré.
 */
@OptIn(ExperimentalComposeUiApi::class)
fun Modifier.tvModalTrap(): Modifier = this
    // ⚠️ L'ORDRE COMPTE. `focusProperties` s'applique à la cible de focus qui le **suit**
    // dans la chaîne de modifiers, et `focusGroup()` vaut
    // `focusProperties { canFocus = false }.focusTarget()`. Écrire
    // `.focusGroup().focusProperties {}` pose donc les propriétés APRÈS la cible : elles
    // ne s'appliquent plus au groupe mais retombent sur ses enfants, où `exit` ne veut
    // rien dire. Mesuré à l'émulateur : `◀` depuis « Lire » ouvrait toujours le rail.
    .focusProperties { exit = { FocusRequester.Cancel } }
    .focusGroup()

// ── 3. Point d'entrée d'un groupe ─────────────────────────────────────────────

/**
 * Décision pure : que rendre depuis `focusProperties { enter }` ?
 *
 * Extraite du modifier pour être testable sans appareil (§4). Trois défauts d'apparence
 * différente s'y ramènent : entrer dans le rail ne menait pas à l'onglet courant (G3),
 * entrer dans un onglet tombait sur la barre de recherche (G6), descendre de la barre de
 * recherche sautait le premier résultat (G9).
 */
@OptIn(ExperimentalComposeUiApi::class)
object TvFocusEntry {

    /**
     * @param direction direction de la recherche de focus qui entre dans le groupe.
     * @param blocked   directions par lesquelles on refuse l'entrée.
     * @param target    point d'entrée souhaité ; `null` quand il n'est pas (encore)
     *                  attaché — sur un catalogue en chargement, aucune carte n'est
     *                  composée et réclamer un requester détaché lèverait.
     */
    fun resolve(
        direction: FocusDirection,
        blocked: Set<FocusDirection>,
        target: FocusRequester?,
    ): FocusRequester = when {
        direction in blocked -> FocusRequester.Cancel
        target != null       -> target
        else                 -> FocusRequester.Default
    }
}

/**
 * Impose le point d'entrée d'un groupe au lieu de laisser Compose retenir le focalisable
 * géométriquement le plus proche.
 *
 * `enter` est évalué pendant la **recherche** de focus, jamais à la composition : c'est
 * précisément ce qui distingue cette approche du `LaunchedEffect` retiré au §40, qui
 * happait le focus au lancement.
 */
@OptIn(ExperimentalComposeUiApi::class)
fun Modifier.tvGroupEntry(
    blocked: Set<FocusDirection> = emptySet(),
    target: () -> FocusRequester? = { null },
): Modifier = this
    // Même piège d'ordre que `tvModalTrap` : les propriétés doivent précéder la cible.
    .focusProperties {
        enter = { direction -> TvFocusEntry.resolve(direction, blocked, target()) }
    }
    .focusGroup()

// ── 6. Panneau qui suit le focus ──────────────────────────────────────────────

/**
 * Décision pure : quel genre le panneau droit doit-il afficher ?
 *
 * Le défaut (G15) : dans une disposition à deux panneaux, l'attente est que le droit suive
 * le focus du gauche. Ici il ne suivait que la **validation** — on pouvait parcourir dix
 * genres avec, en permanence, la liste d'un onzième affichée à droite, et rien à l'écran ne
 * signalait le décalage.
 *
 * Trois sources, par ordre de priorité :
 * 1. le genre **validé** (`OK`) — intention explicite, et la seule qui survive à un
 *    aller-retour dans un autre onglet ;
 * 2. le genre **survolé**, une fois la temporisation écoulée ;
 * 3. le premier genre de la liste, au démarrage.
 */
object TvGenrePreview {

    /**
     * Temporisation avant de suivre le focus.
     *
     * L'auto-répétition d'une télécommande tourne autour de 100 ms par appui : 300 ms
     * absorbe un défilement rapide sans qu'on recharge 579 lignes à chaque genre traversé,
     * tout en restant assez court pour que l'accord des deux panneaux paraisse immédiat.
     */
    const val FOLLOW_DELAY_MS = 300L

    fun resolve(selected: String?, previewed: String?, first: String?): String? =
        selected ?: previewed ?: first
}

// ── 5. Dépliage du rail ───────────────────────────────────────────────────────

/**
 * Décision pure : le rail doit-il se déplier ?
 *
 * Le défaut (G2) : le dépliage suivait `hasFocus`, **sans distinguer pourquoi** le focus
 * était arrivé. Or les quatre reproductions de l'audit sont toutes des arrivées non
 * demandées — le focus tombe dans le rail par réattribution quand l'élément focalisé
 * disparaît — et l'animation décale alors tout le contenu de 336 px.
 *
 * `hasFocus` ne porte pas l'intention ; **la touche pressée, si**. On ne déplie donc que
 * si le focus est entré peu après un `◀`.
 *
 * ⚠️ Ce n'est que la **seconde** couche du correctif. La première est G5 : rendre le focus
 * à son point de départ supprime les arrivées non demandées. Si un cas subsiste, le rail
 * reste replié mais focalisé — moindre mal assumé, la pastille teintée restant lisible
 * alors qu'un décalage de 336 px ne l'est pas.
 */
object TvRailExpansion {

    /**
     * Fenêtre d'intention. Couvre l'animation d'entrée du focus sans rester ouverte assez
     * longtemps pour qu'une réattribution ultérieure en profite.
     */
    const val DELIBERATE_WINDOW_MS = 400L

    fun shouldExpand(railHasFocus: Boolean, nowMs: Long, lastLeftPressMs: Long): Boolean =
        railHasFocus && (nowMs - lastLeftPressMs) < DELIBERATE_WINDOW_MS
}

// ── 4. Saut de page ───────────────────────────────────────────────────────────

/**
 * Décision pure : quelle direction de focus pour une touche de saut de page ?
 *
 * Le défaut mesuré (G8) : `PAGE_UP`/`PAGE_DOWN` font défiler la liste sans toucher au
 * focus. L'élément focalisé sort de la fenêtre, son nœud est recyclé, et **plus aucun nœud
 * n'a le focus** — l'application paraît figée. `CHANNEL_UP`/`CHANNEL_DOWN` sont incluses
 * parce que beaucoup de box émettent l'une pour l'autre sous l'étiquette chaîne +/−.
 */
object TvPageJump {

    /** `null` quand la touche n'est pas une touche de saut : on ne la consomme pas. */
    fun directionFor(key: Key): FocusDirection? = when (key) {
        Key.PageDown, Key.ChannelDown -> FocusDirection.Down
        Key.PageUp, Key.ChannelUp     -> FocusDirection.Up
        else                          -> null
    }
}

/**
 * Rend `PAGE_UP`/`PAGE_DOWN` utiles au lieu de nuisibles (G8), et divise par [pageSize] le
 * coût de parcours des listes de plusieurs centaines d'entrées (G11).
 *
 * On ne laisse pas la liste défiler seule : on déplace le focus, et le défilement suit.
 *
 * @param pageSize à calibrer sur le nombre d'éléments **réellement visibles** — sauter plus
 *   qu'un écran désoriente autant que ne pas sauter du tout.
 */
@Composable
fun Modifier.dpadPageJump(pageSize: Int = 8): Modifier {
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    // Un seul saut à la fois : maintenir la touche empilerait les coroutines et le focus
    // partirait bien au-delà d'une page.
    val running = remember { mutableStateOf<Job?>(null) }

    return this.onPreviewKeyEvent { event ->
        if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
        val direction = TvPageJump.directionFor(event.key) ?: return@onPreviewKeyEvent false

        if (running.value?.isActive != true) {
            running.value = scope.launch {
                // ⚠️ **Une boucle synchrone ne fonctionne pas.** Mesuré à l'émulateur : dix
                // `moveFocus` d'affilée ne déplaçaient le focus que d'**une** ligne. Dans
                // une liste paresseuse, les éléments suivants ne sont composés qu'une fois
                // la mise en page rejouée ; les appels 2 à 10 ne trouvaient donc aucun
                // candidat et la boucle s'arrêtait au premier.
                //
                // On rend donc la main d'une frame entre chaque déplacement, le temps que
                // la liste défile et compose la suite.
                for (step in 0 until pageSize) {
                    if (!focusManager.moveFocus(direction)) break
                    withFrameNanos { }
                }
            }
        }
        // Consommée dans tous les cas, y compris en bout de liste : sinon la liste défile
        // *en plus* du déplacement de focus, et l'élément focalisé sort de l'écran.
        true
    }
}

// ── 7. Entrée dans une rangée horizontale ─────────────────────────────────────

/**
 * Point d'entrée d'une `LazyRow` de catalogue.
 *
 * **Le défaut corrigé.** Sur l'onglet Films, `▼` depuis un en-tête de genre tombait sur une
 * affiche **au milieu** de la rangée, jamais sur la première. Ce n'est pas un défaut de
 * `LazyRow` : à distance verticale égale, la recherche directionnelle de Compose départage
 * les candidats par l'écart entre les **centres** sur l'axe horizontal. Or l'en-tête de
 * genre porte un `Modifier.weight(1f)` — il occupe toute la largeur, son centre est celui
 * de l'écran, et l'affiche « la plus proche » est mécaniquement celle du milieu. Aucun
 * réglage de la rangée ne corrige cela : il faut imposer le point d'entrée, comme
 * [tvGroupEntry] le fait déjà pour un onglet (G6) et pour la grille de résultats (G9).
 *
 * **Pourquoi la dernière affiche visitée, et pas toujours la première.** La position de
 * défilement de la rangée est conservée (état hissé, G5). Après un défilement la première
 * affiche n'est plus composée, et réclamer un `FocusRequester` détaché lève
 * `IllegalStateException` — le piège déjà rencontré au G6. La dernière focalisée, elle,
 * était visible quand on a quitté la rangée : elle est toujours là. Et retrouver une
 * rangée là où on l'avait laissée est le comportement attendu sur télécommande.
 *
 * **Un requester par élément, jamais déplacé.** La tentation est de ne poser le requester
 * que sur l'élément d'entrée, donc de le déplacer à chaque changement de focus. Ce serait
 * lire un état en composition — toutes les affiches de la rangée se recomposeraient à
 * chaque appui — et modifier les modifiers de focus **pendant** un déplacement de focus,
 * exactement le genre de geste qui a produit le §40. Chaque élément garde donc le sien ;
 * seule la lecture, faite au moment de la recherche de focus, décide lequel servir.
 */
@Stable
class TvRowFocus {

    private val requesters = mutableMapOf<Any, FocusRequester>()
    /** Clés dont le nœud est actuellement composé — les seules réclamables. */
    private val attached   = mutableSetOf<Any>()
    private var lastFocused: Any? = null
    private var firstKey: Any? = null

    internal fun requesterFor(key: Any): FocusRequester = requesters.getOrPut(key) { FocusRequester() }

    internal fun onAttached(key: Any, isFirst: Boolean) {
        attached += key
        if (isFirst) firstKey = key
    }

    internal fun onDetached(key: Any) { attached -= key }

    internal fun onFocused(key: Any) { lastFocused = key }

    /**
     * Un élément vient d'être **retiré** de la rangée : le focus part avec lui.
     *
     * Mesuré (§71) : supprimer une carte de « Reprendre la lecture » détruit le nœud
     * focalisé, et plus rien n'est focalisé ensuite — aucune direction ne rattrape le
     * focus, la télécommande devient inerte jusqu'à ce qu'on quitte l'écran. Le cas vaut
     * que la rangée survive ou qu'elle disparaisse entièrement.
     *
     * On note donc la clé qui s'en va, et [TvRowRemovalFocus] rendra le focus **une fois
     * le retrait réellement composé** — pas avant, sinon on refocaliserait la carte qui
     * est sur le point de disparaître.
     */
    var restoreTick by mutableStateOf(0)
        private set

    private var removedKey: Any? = null

    fun scheduleRestore(key: Any) {
        removedKey = key
        restoreTick++
    }

    /** Le retrait est-il consommé par la composition ? */
    internal fun removalSettled(): Boolean = removedKey?.let { it !in attached } ?: true

    internal fun clearRemoval() { removedKey = null }

    /**
     * Cible d'entrée, ou `null` quand aucune n'est composée — `enter` retombe alors sur
     * `FocusRequester.Default` plutôt que sur un requester détaché.
     */
    internal fun entry(): FocusRequester? =
        listOfNotNull(lastFocused, firstKey)
            .firstOrNull { it in attached }
            ?.let { requesters[it] }
}

@Composable
fun rememberTvRowFocus(): TvRowFocus = remember { TvRowFocus() }

/**
 * Rend le focus après le retrait d'un élément de [row] — à poser **au niveau de l'écran**,
 * jamais dans un élément de liste paresseuse, qui serait détruit avec le focus.
 *
 * Le défaut (§71) : supprimer une carte de « Reprendre la lecture » détruit le nœud
 * focalisé et **plus rien n'est focalisé ensuite**. Aucune direction ne rattrape le focus —
 * mesuré : six appuis directionnels de suite sans effet, la télécommande reste inerte
 * jusqu'à ce qu'on quitte l'écran. Le cas vaut que la rangée survive ou qu'elle disparaisse
 * entièrement, la dernière entrée retirée emportant toute la section.
 *
 * Le focus est rendu au **point d'entrée de l'écran** plutôt qu'à la rangée. Ce n'est pas
 * un choix d'ergonomie mais un constat de mesure : réclamer le requester d'une carte encore
 * composée de la rangée aboutit, lui aussi, à la première affiche du catalogue — vérifié
 * avec deux cartes différentes, dont une dont la composition n'avait pas bougé. Les deux
 * voies donnent donc le même écran ; celle-ci est déterministe et se raconte.
 *
 * @param fallbackReady `false` tant que [fallback] n'est pas attaché : réclamer un
 *   requester détaché lève `IllegalStateException` (piège G6).
 */
@Composable
fun TvRowRemovalFocus(
    row: TvRowFocus,
    fallback: FocusRequester,
    fallbackReady: Boolean,
) {
    LaunchedEffect(row.restoreTick) {
        if (row.restoreTick == 0) return@LaunchedEffect
        // Le retrait passe par DataStore puis un Flow : il n'est pas composé au retour de
        // `onRemove()`. On attend qu'il le soit, sans bloquer indéfiniment si la carte
        // reste (suppression refusée, écran quitté entre-temps).
        withTimeoutOrNull(1_000) {
            while (!row.removalSettled()) withFrameNanos { }
        }
        withFrameNanos { }
        if (fallbackReady) runCatching { fallback.requestFocus() }
        row.clearRemoval()
    }
}

/** À poser sur la `LazyRow`. */
fun Modifier.tvRowEntry(row: TvRowFocus): Modifier = tvGroupEntry(target = { row.entry() })

/**
 * À poser sur **chaque** élément de la rangée.
 *
 * `onFocusChanged` est placé **avant** la cible de focus de la carte : un
 * `FocusEventModifierNode` n'observe que ce qui le suit dans l'arbre. L'ordre inverse —
 * celui de `TvTrackRow` dans le dialogue des pistes — ne notifie jamais rien.
 */
@Composable
fun Modifier.tvRowItem(row: TvRowFocus, key: Any, isFirst: Boolean = false): Modifier {
    DisposableEffect(key, isFirst) {
        row.onAttached(key, isFirst)
        onDispose { row.onDetached(key) }
    }
    return this
        .onFocusChanged { if (it.isFocused) row.onFocused(key) }
        .focusRequester(row.requesterFor(key))
}
