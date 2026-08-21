package com.purple.iptvplayer.tv.ui.main

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.activity.ComponentActivity
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.sp
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.util.LocaleHelper
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.focusGroup
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.focus.onFocusEvent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.activity.compose.BackHandler
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Glow
import androidx.tv.material3.Icon
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import com.purple.iptvplayer.core.viewmodel.PlayerViewModel
import com.purple.iptvplayer.core.data.AccessState
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import com.purple.iptvplayer.tv.ui.common.TvPremiumBadge
import com.purple.iptvplayer.tv.ui.common.TvRailExpansion
import com.purple.iptvplayer.tv.ui.common.tvGroupEntry
import com.purple.iptvplayer.tv.ui.common.focusAnchor
import com.purple.iptvplayer.tv.ui.common.rememberTvFocusAnchor
import com.purple.iptvplayer.tv.ui.downloads.TvDownloadsScreen
import com.purple.iptvplayer.tv.ui.navigation.TvTabBackPolicy
import com.purple.iptvplayer.tv.ui.home.TvHomeScreen
import com.purple.iptvplayer.tv.ui.movies.TvMoviesScreen
import com.purple.iptvplayer.tv.ui.mylist.TvMyListScreen
import com.purple.iptvplayer.tv.ui.series.TvSeriesScreen
import com.purple.iptvplayer.tv.ui.theme.*
import kotlinx.coroutines.delay
import org.koin.androidx.compose.koinViewModel
import androidx.compose.ui.res.pluralStringResource

private data class NavItem(val label: String, val icon: ImageVector)

/** Clé d'ancre du bouton de déconnexion — cf. `TvFocusAnchor`. */
private const val LOGOUT_ANCHOR = "settings.logout"

@OptIn(ExperimentalTvMaterial3Api::class, androidx.compose.ui.ExperimentalComposeUiApi::class)
@Composable
fun TvMainScreen(
    onPlay:    (url: String, title: String, mediaId: String, type: String, cover: String, streamId: Int) -> Unit,
    onPurchase: () -> Unit,
    onSignOut:  () -> Unit,
) {
    val trialVm: TrialViewModel = koinViewModel()
    val playerVm: PlayerViewModel = koinViewModel()
    val remainingDays by trialVm.remainingDays.collectAsState()
    val isPro         by trialVm.isPro.collectAsState()
    val access        by trialVm.accessState.collectAsState()

    // G14 — `rememberSaveable` et non `remember` : `activity.recreate()` (changement de
    // langue) détruisait l'Activity et ramenait systématiquement sur Direct TV. Sept
    // appuis pour revenir aux Paramètres — dans une interface dont on ne lit plus les
    // libellés si l'on s'est trompé de langue.
    var selectedIndex by rememberSaveable { mutableIntStateOf(0) }
    var expanded      by remember { mutableStateOf(false) }
    var railHasFocus  by remember { mutableStateOf(false) }
    /** Conserve l'état de chaque onglet quand on en change (cf. plus bas). */
    val tabStateHolder = rememberSaveableStateHolder()

    // G2 — le rail se dépliait dès que le focus y entrait, **sans distinguer pourquoi**.
    // Or les quatre reproductions de l'audit sont toutes des arrivées non demandées : le
    // focus y tombe par réattribution quand l'élément focalisé disparaît, et l'animation
    // décale alors tout le contenu de 336 px.
    //
    // La première couche du correctif est ailleurs — G5 supprime ces arrivées. Reste à
    // exiger une intention pour le dépliage résiduel. `hasFocus` ne dit pas pourquoi le
    // focus est arrivé ; **la touche pressée, si**.
    var lastLeftPressMs by remember { mutableLongStateOf(0L) }

    LaunchedEffect(railHasFocus) {
        if (!railHasFocus) {
            expanded = false
            return@LaunchedEffect
        }
        if (TvRailExpansion.shouldExpand(railHasFocus, System.currentTimeMillis(), lastLeftPressMs)) {
            delay(100)
            expanded = true
        }
    }

    val sidebarWidth by animateDpAsState(
        targetValue   = if (expanded) 240.dp else 72.dp,
        animationSpec = tween(220, easing = PurpleMotion.EaseOutQuint),
        label         = "rail-width",
    )

    // G3 — un requester par entrée du rail : `enter` doit mener à l'onglet AFFICHÉ, pas au
    // voisin géométriquement le plus proche de la ligne qu'on vient de quitter.
    val railFocus = remember { List(6) { FocusRequester() } }

    // Un FocusRequester par onglet, pour garantir que **l'onglet focalisé est celui
    // qui est affiché**. Valider « Séries » renvoyait le focus sur « Direct TV » : le
    // panneau de contenu est remplacé, le focus se perd et Compose TV retombe sur le
    // premier focalisable de l'arbre — le premier élément du rail. On le réclame donc
    // explicitement sur l'onglet choisi.
    /**
     * Le **contenu** prend le focus, pas le rail.
     *
     * Une version précédente (§23) focalisait l'onglet du rail après un changement
     * d'onglet, pour que l'élément focalisé soit celui qui est affiché. Deux effets non
     * voulus : un `LaunchedEffect` s'exécute aussi à la **première** composition, donc le
     * rail happait le focus **au lancement** ; et il le reprenait à **chaque** changement
     * d'onglet. Comme toute arrivée de focus déplie le rail, il s'ouvrait sans cesse.
     *
     * L'invariant visé par §23 — voir quel onglet est affiché — est déjà tenu par le
     * liseré d'onglet actif, qui ne dépend que de `selectedIndex` et pas du focus.
     *
     * Le contenu est ce que l'utilisateur veut manipuler après avoir choisi un onglet ;
     * le rail reste à un appui vers la gauche.
     */
    val contentFocus = remember { FocusRequester() }
    var contentHasFocus by remember { mutableStateOf(false) }
    LaunchedEffect(selectedIndex) {
        // La demande est réessayée : au lancement, le contenu n'a **aucun** élément
        // focalisable tant que le catalogue charge — une vingtaine de secondes sur le
        // vrai catalogue. Une fenêtre trop courte laissait le focus nulle part, et le
        // premier appui retombait alors dans le rail, qui s'ouvrait.
        //
        // On s'arrête dès que le contenu a le focus — et pas avant.
        //
        // ⚠️ Une première version s'arrêtait aussi si le rail avait le focus, pour ne pas
        // le voler à l'utilisateur. C'était contre-productif : quand on choisit un
        // onglet, on est **forcément** dans le rail, donc la boucle rendait la main
        // aussitôt et le focus retombait sur le premier élément du rail.
        contentHasFocus = false
        repeat(90) {
            if (contentHasFocus) return@LaunchedEffect
            delay(400)
            runCatching { contentFocus.requestFocus() }
        }
    }

    val navItems = listOf(
        NavItem(stringResource(R.string.nav_live),       Icons.Rounded.LiveTv),
        NavItem(stringResource(R.string.nav_movies),           Icons.Rounded.Movie),
        // M7 — `Tv` (un moniteur) et `LiveTv` (un téléviseur) sont deux rectangles sur
        // pied : indiscernables à 22 dp et à trois mètres, alors que ce sont les deux
        // catégories les plus utilisées. `VideoLibrary` évoque une pile d'épisodes.
        NavItem(stringResource(R.string.nav_series),          Icons.Rounded.VideoLibrary),
        NavItem(stringResource(R.string.nav_mylist),        Icons.Rounded.Bookmarks),
        NavItem(stringResource(R.string.nav_downloads), Icons.Rounded.Download),
        NavItem(stringResource(R.string.nav_settings),      Icons.Rounded.Settings),
    )
    val settingsIndex = navItems.size - 1

    // Remonté depuis TvSettingsPage : le `BackHandler` de Main doit pouvoir refermer une
    // confirmation ouverte AVANT de quitter l'onglet — sinon un seul appui ferait les deux.
    var settingsOverlayOpen by remember { mutableStateOf(false) }

    // B4 (second volet, constaté à l'émulateur) — `Main` est UNE destination du NavGraph
    // mais SIX onglets pour l'utilisateur. Le premier jet de B4 le traitait comme une
    // racine : `RETOUR` depuis les Paramètres quittait l'application. L'audit excluait ce
    // cas — la touche ne doit s'échapper que depuis l'écran d'accueil.
    //
    // Ce handler reste inactif sur l'accueil sans surcouche : la touche remonte alors au
    // `TvNavGraph`, qui la laisse quitter. Les `BackHandler` internes des onglets
    // (TvHomeScreen, TvMoviesScreen…) sont enregistrés plus tard, donc prioritaires : un
    // genre ouvert ou une recherche en cours se referme d'abord.
    BackHandler(enabled = TvTabBackPolicy.handlesBack(selectedIndex, settingsOverlayOpen)) {
        when (TvTabBackPolicy.actionFor(selectedIndex, settingsOverlayOpen)) {
            TvTabBackPolicy.Action.DismissOverlay -> settingsOverlayOpen = false
            TvTabBackPolicy.Action.GoHome         -> selectedIndex = TvTabBackPolicy.HOME_INDEX
            TvTabBackPolicy.Action.Escape         -> Unit
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            // Observation pure : on ne consomme rien, on note l'intention (G2).
            .onPreviewKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionLeft) {
                    lastLeftPressMs = System.currentTimeMillis()
                }
                false
            },
    ) {

        // ── SideRail ─────────────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .width(sidebarWidth)
                .background(PurplePalette.Bg0)
                // On n'entre dans le rail **que par la gauche**.
                //
                // Sans ce garde-fou, arriver au bout d'une liste et appuyer encore vers
                // le bas y envoyait le focus : faute de candidat dans la direction
                // demandée, Compose TV retient le focalisable le plus proche, et le rail
                // — toujours présent à gauche — est ce candidat. Il se dépliait alors
                // « tout seul », ce que l'utilisateur a signalé (§16, §23).
                //
                // Le garde-fou est posé ici et non sur le contenu : bloquer la sortie
                // verticale du contenu cassait la remontée d'une liste vers la barre de
                // recherche, qui est un déplacement **interne** au contenu. Interdire
                // l'entrée dans le rail ne touche à rien d'autre.
                //
                // Gauche reste ouvert, donc le rail n'est jamais inatteignable — piéger
                // le focus serait un défaut pire que celui corrigé ici.
                // Garde-fou du §30 conservé (Haut/Bas refusés), plus le point d'entrée
                // latéral de G3 : `◀` mène à l'onglet affiché. `enter` n'est évalué que
                // pendant une recherche de focus, donc jamais à la première composition —
                // c'est ce qui le distingue du LaunchedEffect retiré au §40.
                .tvGroupEntry(
                    blocked = setOf(FocusDirection.Up, FocusDirection.Down),
                    target  = { railFocus.getOrNull(selectedIndex) },
                )
                .onFocusEvent { state -> railHasFocus = state.hasFocus }
                .padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Brand lockup
            RailBrandLockup(expanded)

            Spacer(Modifier.height(8.dp))

            // Main nav items
            Column(Modifier.weight(1f)) {
                navItems.dropLast(1).forEachIndexed { index, item ->
                    RailItem(
                        icon           = item.icon,
                        label          = item.label,
                        isActive       = selectedIndex == index,
                        expanded       = expanded,
                        onClick        = { selectedIndex = index },
                        modifier       = Modifier.focusRequester(railFocus[index]),
                    )
                }
            }

            // Settings at bottom
            RailItem(
                icon     = navItems.last().icon,
                label    = navItems.last().label,
                isActive       = selectedIndex == settingsIndex,
                expanded       = expanded,
                onClick        = { selectedIndex = settingsIndex },
                modifier       = Modifier.focusRequester(railFocus[settingsIndex]),
            )

            // Badge d'état (UX-1) — même règle que sur mobile : un achat définitif
            // n'a rien à décompter, un abonné n'est pas un utilisateur d'essai.
            if (expanded) {
                when (val a = access) {
                    is AccessState.Pro -> Unit
                    is AccessState.Subscribed -> {
                        Spacer(Modifier.height(12.dp))
                        RailPremiumBadge(
                            days     = a.daysLeft,
                            onClick  = onPurchase,
                            modifier = Modifier.padding(horizontal = 14.dp),
                        )
                    }
                    else -> {
                        Spacer(Modifier.height(12.dp))
                        RailTrialBadge(
                            days     = (a as? AccessState.Trial)?.daysLeft ?: 0,
                            expanded = true,
                            onClick  = onPurchase,
                            modifier = Modifier.padding(horizontal = 14.dp),
                        )
                    }
                }
            }
        }

        // ── Content area ────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .focusRequester(contentFocus)
                .focusGroup()
                .onFocusEvent { contentHasFocus = it.hasFocus },
        ) {
            // Chaque onglet garde son état quand on le quitte — même raison que sur
            // mobile : `when` retire l'onglet précédent de la composition, et
            // `rememberSaveable` seul verrait son entrée jetée avec lui.
            tabStateHolder.SaveableStateProvider(selectedIndex) {
            when (selectedIndex) {
                0 -> TvHomeScreen(onPlay = { url, title, streamId ->
                    onPlay(url, title, "", "live", "", streamId)
                })
                1 -> TvMoviesScreen(onPlay = { url, title, id, cover ->
                    onPlay(url, title, id.toString(), "movie", cover, 0)
                })
                2 -> TvSeriesScreen(onPlay = { url, title, mediaId, cover ->
                    onPlay(url, title, mediaId, "series", cover, 0)
                })
                3 -> TvMyListScreen(
                    // M5 / G7 — l'état vide doit offrir une cible.
                    onBrowse = { selectedIndex = 1 },
                    onPlayMovie  = { url, title, id, cover -> onPlay(url, title, id.toString(), "movie", cover, 0) },
                    onPlaySeries = { url, title, mediaId, cover -> onPlay(url, title, mediaId, "series", cover, 0) },
                    onPlayChannel = { url, title, streamId -> onPlay(url, title, "", "live", "", streamId) },
                )
                4 -> TvDownloadsScreen(
                    onPlay   = { url, title -> onPlay(url, title, "", "", "", 0) },
                    // G7 — l'état vide devient une action : bascule sur l'onglet Films.
                    onBrowse = { selectedIndex = 1 },
                )
                5 -> TvSettingsPage(
                    playerVm            = playerVm,
                    onSignOut           = onSignOut,
                    logoutConfirmOpen   = settingsOverlayOpen,
                    onLogoutConfirmOpen = { settingsOverlayOpen = it },
                )
            }
            }
        }
    }
}

// ── Brand lockup ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailBrandLockup(expanded: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = if (expanded) Arrangement.spacedBy(14.dp) else Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                horizontal = if (expanded) 22.dp else 0.dp,
                vertical   = 0.dp,
            )
            .padding(bottom = 24.dp),
    ) {
        // Le vrai logo, et non le caractère « ✦ » qui en tenait lieu. `ic_logo` est
        // déjà celui des deux écrans de connexion et de la barre du mobile : le rail
        // était le seul endroit à afficher un substitut.
        Image(
            painter            = painterResource(R.drawable.ic_logo),
            contentDescription = null,
            contentScale       = ContentScale.Fit,
            modifier           = Modifier.size(36.dp),
        )
        if (expanded) {
            Row {
                Text(
                    "PURPLE",
                    style = LocalPurpleType.current.brandWordmark.copy(color = PurplePalette.Purple400),
                )
                Text(
                    " IPTV",
                    style = LocalPurpleType.current.brandWordmark.copy(
                        color      = PurplePalette.Fg1,
                        fontWeight = FontWeight.Normal,
                    ),
                )
            }
        }
    }
}

// ── Rail item ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailItem(
    icon:           ImageVector,
    label:          String,
    isActive:       Boolean,
    expanded:       Boolean,
    onClick:        () -> Unit,
    /** Ajouté pour G3 : le point d'entrée du rail doit pouvoir désigner cette entrée. */
    modifier:       Modifier = Modifier,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val containerColor = when {
        isFocused -> PurplePalette.Purple400
        isActive  -> PurplePalette.Purple400.copy(alpha = 0.18f)
        else      -> Color.Transparent
    }
    // G10 — blanc sur `Purple400` ne donne que 3,27 : 1. Le rail est le repère permanent
    // de l'écran : c'est l'élément qu'on lit le plus souvent de loin.
    val iconTint = when {
        isFocused -> PurplePalette.FgOnPrimary
        isActive  -> PurplePalette.Purple300
        else      -> PurplePalette.Fg3
    }

    Surface(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = if (expanded) 14.dp else 8.dp, vertical = 3.dp),
        shape = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors = ClickableSurfaceDefaults.colors(
            containerColor        = containerColor,
            focusedContainerColor = PurplePalette.Purple400,
            pressedContainerColor = PurplePalette.Purple600,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
        glow  = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevationColor = PurplePalette.Purple400,
                elevation      = 12.dp,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = if (expanded) 12.dp else 0.dp,
                    vertical   = 10.dp,
                ),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = if (expanded) Arrangement.spacedBy(12.dp) else Arrangement.Center,
        ) {
            // Repère de l'onglet **actif**, indépendant du focus.
            //
            // `isFocused` était testé avant `isActive` et remplissait la pastille : un
            // onglet simplement survolé paraissait donc plus sélectionné que celui
            // réellement affiché. Après un changement d'onglet, le focus revenant au
            // premier élément du rail (défaut 9), on lisait « Live TV » alors que le
            // contenu montrait les séries. Ce liseré ne dépend que de `isActive`, il
            // survit donc au focus.
            // Uniquement en mode déplié : replié, le rail n'a la place que de son
            // icône, et un liseré de 3 dp la décentrait — l'arrangement `Center` ne
            // centre que l'ensemble de la ligne, pas l'icône seule. L'onglet actif y
            // reste identifiable par la teinte de sa pastille.
            if (expanded) {
                Box(
                    Modifier
                        .width(3.dp)
                        .height(if (isActive) 20.dp else 0.dp)
                        .clip(PurpleShapes.Xs)
                        // Le liseré d'onglet actif doit rester visible quand la pastille
                        // est remplie d'accent : `Purple200` y disparaîtrait.
                        .background(when {
                            !isActive -> Color.Transparent
                            isFocused -> PurplePalette.FgOnPrimary
                            else      -> PurplePalette.Purple200
                        }),
                )
            }
            Icon(
                imageVector        = icon,
                contentDescription = label,
                tint               = iconTint,
                modifier           = Modifier.size(22.dp),
            )
            if (expanded) {
                Text(
                    label,
                    style    = LocalPurpleType.current.button.copy(color = iconTint),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

// ── Trial badge ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailTrialBadge(days: Int, expanded: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    // UX-2 : ce badge était un simple affichage. `onPurchase` n'était consommé
    // nulle part dans TvMainScreen, si bien qu'un utilisateur Android TV ne pouvait
    // **jamais** acheter de son plein gré — il devait attendre que la barrière
    // d'expiration l'y contraigne. Le rendre focalisable ouvre le seul chemin de
    // conversion de la plateforme.
    Surface(
        onClick  = onClick,
        modifier = modifier.fillMaxWidth(),
        shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = PurplePalette.Purple400.copy(alpha = 0.12f),
            focusedContainerColor = PurplePalette.Purple400,
            pressedContainerColor = PurplePalette.Purple600,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
    ) {
    Row(
        modifier = Modifier
            .padding(horizontal = if (expanded) 16.dp else 0.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Rounded.Timer,
            contentDescription = null,
            tint               = PurplePalette.Purple300,
            modifier           = Modifier.size(18.dp),
        )
        if (expanded) {
            val label = if (days > 0)
                pluralStringResource(R.plurals.trial_banner, days, days)
            else
                stringResource(R.string.trial_expired)
            Text(
                label,
                style    = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
                modifier = Modifier.weight(1f),
            )
            // M8 — le badge ouvre l'écran d'achat depuis le §10, mais rien ne le disait :
            // il ressemblait à un état, pas à une action.
            Icon(
                Icons.Rounded.ChevronRight,
                contentDescription = null,
                tint               = PurplePalette.Purple300,
                modifier           = Modifier.size(16.dp),
            )
        }
    }
    }
}

/** Abonné : statut doré et échéance, sans appel à l'action — il a déjà payé. */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RailPremiumBadge(days: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    // Focalisable comme le badge d'essai : un abonné doit pouvoir monter en gamme.
    Surface(
        onClick  = onClick,
        modifier = modifier.fillMaxWidth(),
        shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = Color.Transparent,
            focusedContainerColor = PurplePalette.Purple400,
            pressedContainerColor = PurplePalette.Purple600,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
    ) {
        // Le décompte va SOUS le « PREMIUM » doré, sans le répéter en préfixe.
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            TvPremiumBadge(label = stringResource(R.string.premium_badge))
            Text(
                pluralStringResource(R.plurals.premium_days, days, days),
                style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg2),
            )
        }
    }
}

// ── Settings page ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSettingsPage(
    playerVm:  PlayerViewModel,
    onSignOut: () -> Unit,
    /** Hissé dans `TvMainScreen` : son `BackHandler` doit pouvoir refermer la confirmation. */
    logoutConfirmOpen: Boolean,
    onLogoutConfirmOpen: (Boolean) -> Unit,
) {
    val context     = LocalContext.current
    val activity    = context as? ComponentActivity
    val subSize     by playerVm.subtitleSize.collectAsState(initial = 1.0f)
    val subColor    by playerVm.subtitleColor.collectAsState(initial = "white")
    val subBg       by playerVm.subtitleBackground.collectAsState(initial = false)
    var currentLang by remember { mutableStateOf(LocaleHelper.getLanguage(context)) }
    val logoutAnchor = rememberTvFocusAnchor()
    val confirmFocus = remember { FocusRequester() }

    val firstFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        try { firstFocus.requestFocus() } catch (_: Exception) {}
    }

    // B3 — la carte dépassait 1080 px et n'avait AUCUN défilement ; le commentaire
    // « everything visible at a glance, no scroll needed » était faux sur 1080p.
    //
    // Le mécanisme n'est pas seulement du confort : une `Column` mesure ses enfants avec
    // la hauteur **restante**, donc une fois la contrainte épuisée les derniers enfants
    // sont mesurés à hauteur ~0. C'est ce qui réconcilie les trois symptômes mesurés —
    // `▼` ne trouvait pas le bouton « Déconnexion » (la recherche directionnelle ne retient
    // pas un nœud plat), `▲` l'atteignait par rebouclage, et il était « invisible, seul un
    // liseré rouge dépasse » : c'était la bordure d'un nœud aplati.
    //
    // Un conteneur défilable mesure en hauteur NON BORNÉE : chaque enfant reprend sa taille
    // naturelle et redevient un candidat de focus. Compose y déclenche en outre
    // `bringIntoView` au changement de focus, donc le bouton se présente de lui-même.
    Box(
        modifier         = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier            = Modifier
                .widthIn(max = 500.dp)
                .fillMaxHeight()
                .verticalScroll(rememberScrollState())
                .focusGroup()
                .clip(PurpleShapes.Lg)
                .background(PurplePalette.Bg0)
                // Marge de sécurité TV (5 % — overscan), au lieu de 28.dp.
                .padding(horizontal = 32.dp, vertical = PurpleSpacing.TvSafeY),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // ── Header ────────────────────────────────────────────────────────
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.settings_title),
                    style = LocalPurpleType.current.h2.copy(color = PurplePalette.Fg1),
                    modifier = Modifier.weight(1f),
                )
                // M2 — « Retour » était un `Text` nu : il ressemblait à un bouton mais
                // n'était ni cliquable ni focalisable, et n'apparaissait dans aucun
                // parcours de focus. Supprimé plutôt que rendu focalisable : depuis B4,
                // `RETOUR` sort des Paramètres et `◀` mène au rail — la fonction est
                // couverte deux fois, et un focalisable de plus a un coût (§8.10).
            }

            // ── Language ──────────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.settings_language)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("fr" to "FR", "en" to "EN").forEachIndexed { idx, (code, label) ->
                        TvSettingsButton(
                            label    = label,
                            selected = currentLang == code,
                            onClick  = {
                                currentLang = code
                                playerVm.updateLanguage(code)
                                LocaleHelper.setLocale(context, code)
                                activity?.recreate()
                            },
                            modifier = if (idx == 0) Modifier.focusRequester(firstFocus) else Modifier,
                        )
                    }
                }
            }

            HorizontalDivider(color = PurplePalette.Line1)

            // ── Subtitle size ─────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.subtitle_size_label)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(
                        0.75f to R.string.subtitle_size_small,
                        1.0f  to R.string.subtitle_size_medium,
                        1.5f  to R.string.subtitle_size_large,
                    ).forEach { (size, labelRes) ->
                        TvSettingsButton(
                            label    = stringResource(labelRes),
                            selected = subSize == size,
                            onClick  = { playerVm.updateSubtitleSize(size) },
                        )
                    }
                }
            }

            // ── Subtitle color ────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.subtitle_color_label)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    TvColorOption(
                        name     = stringResource(R.string.subtitle_color_white),
                        color    = Color.White,
                        selected = subColor == "white",
                        onClick  = { playerVm.updateSubtitleColor("white") },
                    )
                    TvColorOption(
                        name     = stringResource(R.string.subtitle_color_yellow),
                        color    = Color.Yellow,
                        selected = subColor == "yellow",
                        onClick  = { playerVm.updateSubtitleColor("yellow") },
                    )
                }
            }

            // ── Arrière-plan ──────────────────────────────────────────────────
            // Manquait côté TV : l'aperçu ci-dessous *reflétait* déjà ce réglage
            // (`subBg`), mais aucun contrôle ne permettait de le changer. Le
            // composable TvToggleOption existait, sans être utilisé nulle part.
            SettingsSection(stringResource(R.string.subtitle_background_label)) {
                TvToggleOption(
                    label           = stringResource(R.string.subtitle_background_dark),
                    checked         = subBg,
                    onCheckedChange = { playerVm.updateSubtitleBackground(it) },
                )
            }

            // ── Preview ───────────────────────────────────────────────────────
            SettingsSection(stringResource(R.string.subtitle_preview_label)) {
                Box(
                    modifier         = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .clip(PurpleShapes.Md)
                        .background(Color.Black),
                    contentAlignment = Alignment.Center,
                ) {
                    androidx.compose.material3.Text(
                        stringResource(R.string.subtitle_preview_text),
                        color     = if (subColor == "yellow") Color.Yellow else Color.White,
                        fontSize  = (18f * subSize).sp,
                        textAlign = TextAlign.Center,
                        modifier  = Modifier
                            .then(if (subBg) Modifier.background(Color.Black.copy(0.5f), PurpleShapes.Xs) else Modifier)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                    )
                }
            }

            HorizontalDivider(color = PurplePalette.Line1)

            // ── Sign out ──────────────────────────────────────────────────────
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    stringResource(R.string.settings_logout_title),
                    style = LocalPurpleType.current.h3.copy(color = PurplePalette.Fg1),
                )
                androidx.compose.material3.Text(
                    stringResource(R.string.settings_logout_desc),
                    color      = PurplePalette.Fg3,
                    fontSize   =  14.sp,
                    lineHeight = 18.sp,
                )
                Spacer(Modifier.height(4.dp))
                if (!logoutConfirmOpen) {
                    TvSettingsButton(
                        label       = stringResource(R.string.btn_logout),
                        selected    = false,
                        accentColor = PurplePalette.Danger,
                        onClick     = { logoutAnchor.rememberOrigin(LOGOUT_ANCHOR); onLogoutConfirmOpen(true) },
                        modifier    = Modifier.focusAnchor(logoutAnchor, LOGOUT_ANCHOR),
                    )
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        TvSettingsButton(
                            label    = stringResource(R.string.btn_cancel),
                            selected = false,
                            // Annuler détruit ces deux boutons : sans ancre, le focus
                            // retombe sur le focalisable le plus proche de l'arbre — le
                            // rail — qui se déplie alors « tout seul » (G2).
                            onClick  = { onLogoutConfirmOpen(false); logoutAnchor.restore() },
                            modifier = Modifier.focusRequester(confirmFocus),
                        )
                        TvSettingsButton(
                            label       = stringResource(R.string.btn_logout),
                            selected    = false,
                            accentColor = PurplePalette.Danger,
                            onClick     = onSignOut,
                        )
                    }
                    LaunchedEffect(Unit) {
                        withFrameNanos { }
                        runCatching { confirmFocus.requestFocus() }
                    }
                    // RETOUR ferme la confirmation depuis le BackHandler de Main, qui ne
                    // sait rien de l'ancre : on la réarme ici pour que les DEUX voies de
                    // fermeture rendent le focus au même endroit (leçon de G5).
                    DisposableEffect(Unit) { onDispose { logoutAnchor.restore() } }
                }
            }
        }
    }
}

@Composable
private fun SettingsSection(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            label,
            style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Fg4),
        )
        content()
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSettingsButton(
    label:      String,
    selected:   Boolean,
    onClick:    () -> Unit,
    modifier:   Modifier = Modifier,
    accentColor: Color = PurplePalette.Purple400,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape    = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors   = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) accentColor.copy(0.2f) else PurplePalette.Bg3,
            focusedContainerColor = accentColor.copy(0.25f),
        ),
        scale  = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    if (selected) 2.dp else 1.dp,
                    if (selected) accentColor else PurplePalette.Line1,
                ),
                shape = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, accentColor),
                shape  = PurpleShapes.Md,
            ),
        ),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(elevationColor = accentColor, elevation = 10.dp),
        ),
        interactionSource = interactionSource,
    ) {
        Text(
            label,
            style    = LocalPurpleType.current.button.copy(
                // Le focus teinte le fond avec `accentColor` : y écrire aussi en
                // `accentColor` rendait le libellé illisible — la pastille de langue
                // sélectionnée *et* focalisée apparaissait vide.
                color      = when {
                    isFocused -> PurplePalette.Fg1
                    selected  -> accentColor
                    else      -> PurplePalette.Fg2
                },
                fontWeight = if (selected) androidx.compose.ui.text.font.FontWeight.ExtraBold
                             else androidx.compose.ui.text.font.FontWeight.SemiBold,
            ),
            // Le bouton se dimensionne à son contenu. Il y avait ici un
            // `.then(if (modifier == Modifier) … else fillMaxWidth())` : comparer un
            // Modifier par égalité est fragile, et le seul appelant à en passer un est
            // le premier bouton de langue (pour son focusRequester). Résultat, « FR »
            // s'étirait sur toute la largeur et « EN » sortait de l'écran.
            modifier  = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            textAlign = TextAlign.Center,
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvColorOption(name: String, color: Color, selected: Boolean, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    Surface(
        onClick = onClick,
        shape   = ClickableSurfaceDefaults.shape(shape = PurpleShapes.Md),
        colors  = ClickableSurfaceDefaults.colors(
            containerColor        = if (selected) PurplePalette.Purple400.copy(0.2f) else Color.Transparent,
            focusedContainerColor = PurplePalette.Purple400.copy(0.2f),
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    if (selected) 2.dp else 1.dp,
                    if (selected) PurplePalette.Purple400 else PurplePalette.Line1.copy(0.4f),
                ),
                shape = PurpleShapes.Md,
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, PurplePalette.Purple400),
                shape  = PurpleShapes.Md,
            ),
        ),
        interactionSource = interactionSource,
    ) {
        Row(
            modifier              = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment     = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                Modifier
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(0.5.dp, PurplePalette.Line1, CircleShape)
            )
            Text(
                name,
                style = LocalPurpleType.current.bodySmall.copy(
                    color = if (selected || isFocused) PurplePalette.Fg1 else PurplePalette.Fg3,
                ),
            )
        }
    }
}

@Composable
private fun TvToggleOption(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier          = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        androidx.compose.material3.Text(
            label,
            color    = PurplePalette.Fg2,
            fontSize = 14.sp,
            modifier = Modifier.weight(1f),
        )
        Switch(
            checked         = checked,
            onCheckedChange = onCheckedChange,
            colors          = SwitchDefaults.colors(
                checkedThumbColor   = PurplePalette.FgOnPrimary,
                checkedTrackColor   = PurplePalette.Purple400,
                uncheckedThumbColor = PurplePalette.Fg3,
                uncheckedTrackColor = PurplePalette.Bg3,
            ),
        )
    }
}
