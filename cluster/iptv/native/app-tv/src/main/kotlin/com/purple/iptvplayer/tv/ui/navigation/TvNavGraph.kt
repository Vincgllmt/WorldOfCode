package com.purple.iptvplayer.tv.ui.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.purple.iptvplayer.core.data.CredentialsRepository
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import com.purple.iptvplayer.tv.ui.main.TvMainScreen
import com.purple.iptvplayer.tv.ui.player.TvPlayerScreen
import com.purple.iptvplayer.tv.ui.purchase.TvPurchaseScreen
import com.purple.iptvplayer.tv.ui.setup.TvSetupScreen
import com.purple.iptvplayer.tv.ui.theme.TvBgApp
import com.purple.iptvplayer.tv.ui.theme.TvPurple
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject

sealed class TvScreen {
    object Setup : TvScreen()
    object Main  : TvScreen()

    /**
     * @param blocking l'écran est atteint comme **barrière** (accès expiré) et non par
     *   ouverture volontaire depuis le badge d'essai. Même donnée que
     *   `Routes.purchase(blocking)` côté mobile (P9). Elle commande deux choses : la
     *   présence du lien « Plus tard » (B2) et celle du `BackHandler` (B4).
     */
    data class Purchase(val blocking: Boolean = false) : TvScreen()

    data class Player(val url: String, val title: String, val mediaId: String = "", val type: String = "", val cover: String = "", val streamId: Int = 0) : TvScreen()
}

@Composable
fun TvNavGraph() {
    val trialVm: TrialViewModel = koinViewModel()
    val credRepo: CredentialsRepository = koinInject()

    var currentScreen by remember { mutableStateOf<TvScreen?>(null) }

    /**
     * Retient l'état de chaque destination pendant qu'elle quitte la composition.
     *
     * Sans lui, partir dans le lecteur détruisait **tout** `TvMainScreen` : l'onglet
     * courant, la fiche ouverte, la position des listes. Quitter la lecture d'un film
     * ramenait donc sur Direct TV, jamais sur la fiche d'où l'on venait — signalé à
     * l'usage, et c'est exactement la leçon du §38 (« `rememberSaveable` ne survit pas à
     * un `when` qui retire la branche de la composition ») appliquée un cran plus haut :
     * elle valait déjà pour les onglets, elle vaut aussi pour les destinations.
     */
    val navStateHolder = rememberSaveableStateHolder()

    LaunchedEffect(Unit) {
        val creds = credRepo.load()
        // Wait until hasAccess is resolved (TrialViewModel.init already launched refresh())
        val access = trialVm.hasAccess.first { it != null }
        currentScreen = when {
            access == false -> TvScreen.Purchase(blocking = true)
            creds == null   -> TvScreen.Setup
            else            -> TvScreen.Main
        }
    }

    val screen = currentScreen

    // B4 — une destination = une règle de retour.
    //
    // `TvNavGraph` est une machine à états sans pile de navigation : sans ce handler,
    // `RETOUR` traversait jusqu'à l'Activity, qui se terminait — en pleine lecture au
    // troisième appui. Ce qui n'a pas de destination laisse volontairement la touche
    // remonter, donc quitte l'application : c'est le comportement Leanback attendu depuis
    // une racine (Main, Setup), et le seul acceptable depuis la barrière d'achat, dont
    // sortir vers Main rouvrirait la fuite de B2.
    //
    // ⚠️ Ne suffit pas seul dans le lecteur : `TvPlayerScreen` doit aussi cesser de
    // consommer `Key.Back`, sinon l'Activity ne voit jamais la touche et ce handler n'est
    // pas notifié. Cf. `TvPlayerKeys`.
    BackHandler(enabled = TvBackPolicy.handlesBack(screen)) {
        TvBackPolicy.destinationFor(screen)?.let { currentScreen = it }
    }

    when (screen) {
        null -> Box(
            modifier = Modifier.fillMaxSize().background(TvBgApp),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = TvPurple)
        }

        is TvScreen.Setup -> TvSetupScreen(onSuccess = { currentScreen = TvScreen.Main })

        is TvScreen.Main -> navStateHolder.SaveableStateProvider("main") {
            TvMainScreen(
            onPlay     = { url, title, mediaId, type, cover, streamId -> currentScreen = TvScreen.Player(url, title, mediaId, type, cover, streamId) },
            onPurchase = { currentScreen = TvScreen.Purchase(blocking = false) },
            onSignOut  = {
                kotlinx.coroutines.MainScope().launch {
                    credRepo.clear()
                    currentScreen = TvScreen.Setup
                }
            },
            )
        }

        is TvScreen.Purchase -> TvPurchaseScreen(
            // B2 — `null` sur la barrière : le lien « Plus tard » était le seul focalisable
            // de l'écran et ouvrait le catalogue complet en deux appuis.
            onBack    = if (TvPurchaseAccess.allowsDismiss(screen.blocking))
                            ({ currentScreen = TvScreen.Main }) else null,
            onSuccess = { currentScreen = TvScreen.Main },
        )

        is TvScreen.Player -> TvPlayerScreen(
            url      = screen.url,
            title    = screen.title,
            mediaId  = screen.mediaId,
            type     = screen.type,
            cover    = screen.cover,
            streamId = screen.streamId,
            onBack   = { currentScreen = TvScreen.Main },
        )
    }
}
