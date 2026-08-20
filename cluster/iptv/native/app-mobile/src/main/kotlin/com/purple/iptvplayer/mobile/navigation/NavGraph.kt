package com.purple.iptvplayer.mobile.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import kotlinx.coroutines.flow.first
import com.purple.iptvplayer.mobile.ui.main.MainScreen
import com.purple.iptvplayer.mobile.ui.moviedetail.MovieDetailScreen
import com.purple.iptvplayer.mobile.ui.player.PlayerScreen
import com.purple.iptvplayer.mobile.ui.purchase.PurchaseScreen
import com.purple.iptvplayer.mobile.ui.seriesdetail.SeriesDetailScreen
import com.purple.iptvplayer.mobile.ui.setup.SetupScreen
import org.koin.androidx.compose.koinViewModel
import com.purple.iptvplayer.core.data.CredentialsRepository
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.ui.Alignment
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.purple.iptvplayer.mobile.ui.theme.BgApp
import org.koin.compose.koinInject
import com.purple.iptvplayer.mobile.ui.cast.CastRemoteSheet
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel

object Routes {
    const val SPLASH   = "splash"
    const val SETUP    = "setup"
    const val MAIN     = "main"
    const val PURCHASE = "purchase?blocking={blocking}"
    const val PLAYER   = "player?url={url}&title={title}&mediaId={mediaId}&type={type}&cover={cover}&streamId={streamId}"
    const val MOVIE_DETAIL  = "movie_detail/{id}"
    const val SERIES_DETAIL = "series_detail/{id}"

    fun player(url: String, title: String, mediaId: String = "", type: String = "", cover: String = "", streamId: Int = 0) =
        "player?url=${encode(url)}&title=${encode(title)}&mediaId=${encode(mediaId)}&type=${encode(type)}&cover=${encode(cover)}&streamId=$streamId"

    /**
     * @param blocking l'écran est atteint comme **barrière** (essai expiré) et non
     *   depuis le menu : aucune échappatoire ne doit alors être proposée.
     */
    fun purchase(blocking: Boolean = false) = "purchase?blocking=$blocking"

    fun movieDetail(id: Int) = "movie_detail/$id"
    fun seriesDetail(id: Int) = "series_detail/$id"

    private fun encode(s: String) = java.net.URLEncoder.encode(s, "UTF-8")
}

/** Hauteur de la barre d'onglets de l'écran principal (cf. `MainScreen.BottomNav`). */
private val BOTTOM_NAV_HEIGHT = 60.dp

@Composable
fun IptvNavGraph() {
    val navController = rememberNavController()
    val trialVm: TrialViewModel = koinViewModel()
    val castVm: CastViewModel = koinViewModel()
    val credRepo: CredentialsRepository = koinInject()

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(navController = navController, startDestination = Routes.SPLASH) {

            composable(Routes.SPLASH) {
                // `hasAccess` vaut null jusqu'à ce que TrialViewModel.refresh() aboutisse.
                // Il FAUT attendre cette résolution : lire la valeur immédiatement donne
                // null, `access == false` est alors faux, et un utilisateur expiré part
                // sur MAIN — le blocage ne s'applique jamais. Même approche que TvNavGraph.
                LaunchedEffect(Unit) {
                    val creds = credRepo.load()
                    val access = trialVm.hasAccess.first { it != null }
                    val route = when {
                        access == false -> Routes.purchase(blocking = true)
                        creds == null   -> Routes.SETUP
                        else            -> Routes.MAIN
                    }
                    navController.navigate(route) { popUpTo(Routes.SPLASH) { inclusive = true } }
                }
                Box(Modifier.fillMaxSize().background(BgApp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = com.purple.iptvplayer.mobile.ui.theme.Purple)
                }
            }

            composable(Routes.SETUP) {
                SetupScreen(onSuccess = {
                    navController.navigate(Routes.MAIN) { popUpTo(Routes.SETUP) { inclusive = true } }
                })
            }

            composable(Routes.MAIN) {
                MainScreen(
                    onPlayChannel  = { url, title, cover, streamId -> navController.navigate(Routes.player(url, title, type = "live", cover = cover, streamId = streamId)) },
                    onPlayMovie    = { url, title, id, cover -> navController.navigate(Routes.player(url, title, id.toString(), "movie", cover)) },
                    onMovieDetail  = { id -> navController.navigate(Routes.movieDetail(id)) },
                    onSeriesDetail = { id -> navController.navigate(Routes.seriesDetail(id)) },
                    onPurchase     = { navController.navigate(Routes.purchase()) },
                    onLogout       = { navController.navigate(Routes.SETUP) { popUpTo(0) { inclusive = true } } },
                )
            }

            composable(
                route = Routes.PURCHASE,
                arguments = listOf(navArgument("blocking") { type = NavType.BoolType; defaultValue = false }),
            ) { back ->
                val blocking = back.arguments?.getBoolean("blocking") ?: false
                PurchaseScreen(
                    // Écran-barrière : pas de « Maybe later ». Le lien ne faisait rien
                    // (pile de navigation vide) tout en paraissant actionnable.
                    onBack    = if (blocking) null else ({ navController.popBackStack() }),
                    onSuccess = { navController.navigate(Routes.MAIN) { popUpTo(0) { inclusive = true } } },
                )
            }

            composable(
                route = Routes.PLAYER,
                arguments = listOf(
                    navArgument("url")      { type = NavType.StringType; defaultValue = "" },
                    navArgument("title")    { type = NavType.StringType; defaultValue = "" },
                    navArgument("mediaId")  { type = NavType.StringType; defaultValue = "" },
                    navArgument("type")     { type = NavType.StringType; defaultValue = "" },
                    navArgument("cover")    { type = NavType.StringType; defaultValue = "" },
                    navArgument("streamId") { type = NavType.IntType;    defaultValue = 0  },
                )
            ) { backStack ->
                PlayerScreen(
                    url      = java.net.URLDecoder.decode(backStack.arguments?.getString("url") ?: "", "UTF-8"),
                    title    = java.net.URLDecoder.decode(backStack.arguments?.getString("title") ?: "", "UTF-8"),
                    mediaId  = java.net.URLDecoder.decode(backStack.arguments?.getString("mediaId") ?: "", "UTF-8"),
                    type     = backStack.arguments?.getString("type") ?: "",
                    cover    = java.net.URLDecoder.decode(backStack.arguments?.getString("cover") ?: "", "UTF-8"),
                    streamId = backStack.arguments?.getInt("streamId") ?: 0,
                    onBack   = { navController.popBackStack() },
                )
            }

            composable(Routes.MOVIE_DETAIL, arguments = listOf(navArgument("id") { type = NavType.IntType })) { back ->
                MovieDetailScreen(
                    movieId = back.arguments?.getInt("id") ?: 0,
                    onPlay  = { url, title, id, cover -> navController.navigate(Routes.player(url, title, id.toString(), "movie", cover)) },
                    onBack  = { navController.popBackStack() },
                )
            }

            composable(Routes.SERIES_DETAIL, arguments = listOf(navArgument("id") { type = NavType.IntType })) { back ->
                SeriesDetailScreen(
                    seriesId = back.arguments?.getInt("id") ?: 0,
                    onPlayEpisode = { url, title, mediaId, cover -> navController.navigate(Routes.player(url, title, mediaId, "series", cover)) },
                    onBack = { navController.popBackStack() },
                )
            }
        }

        // Télécommande de cast, commune à tous les écrans.
        //
        // Seul l'écran principal porte une barre d'onglets : ailleurs, rien à éviter.
        val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
        CastRemoteSheet(
            castVm      = castVm,
            modifier    = Modifier.align(Alignment.BottomCenter),
            bottomInset = if (currentRoute == Routes.MAIN) BOTTOM_NAV_HEIGHT else 0.dp,
        )
    }
}
