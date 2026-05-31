package com.purple.iptvplayer.tv.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
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
    object Setup    : TvScreen()
    object Main     : TvScreen()
    object Purchase : TvScreen()
    data class Player(val url: String, val title: String, val mediaId: String = "", val type: String = "", val cover: String = "", val streamId: Int = 0) : TvScreen()
}

@Composable
fun TvNavGraph() {
    val trialVm: TrialViewModel = koinViewModel()
    val credRepo: CredentialsRepository = koinInject()

    var currentScreen by remember { mutableStateOf<TvScreen?>(null) }

    LaunchedEffect(Unit) {
        val creds = credRepo.load()
        // Wait until hasAccess is resolved (TrialViewModel.init already launched refresh())
        val access = trialVm.hasAccess.first { it != null }
        currentScreen = when {
            access == false -> TvScreen.Purchase
            creds == null   -> TvScreen.Setup
            else            -> TvScreen.Main
        }
    }

    when (val screen = currentScreen) {
        null -> Box(
            modifier = Modifier.fillMaxSize().background(TvBgApp),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = TvPurple)
        }

        is TvScreen.Setup -> TvSetupScreen(onSuccess = { currentScreen = TvScreen.Main })

        is TvScreen.Main -> TvMainScreen(
            onPlay     = { url, title, mediaId, type, cover, streamId -> currentScreen = TvScreen.Player(url, title, mediaId, type, cover, streamId) },
            onPurchase = { currentScreen = TvScreen.Purchase },
            onSignOut  = {
                kotlinx.coroutines.MainScope().launch {
                    credRepo.clear()
                    currentScreen = TvScreen.Setup
                }
            },
        )

        is TvScreen.Purchase -> TvPurchaseScreen(
            onBack    = { currentScreen = TvScreen.Main },
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
