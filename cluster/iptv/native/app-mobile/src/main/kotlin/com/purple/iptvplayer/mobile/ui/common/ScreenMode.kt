package com.purple.iptvplayer.mobile.ui.common

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

private fun Context.findActivity(): Activity? {
    var ctx = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}

/**
 * Empêche l'appareil de s'endormir tant que ce composable est affiché.
 *
 * Rien ne posait ce verrou nulle part — ni mobile, ni TV, ni `core` : l'appareil
 * s'endormait donc en pleine lecture, faute de savoir que l'application était
 * utilisée. Un lecteur vidéo n'a aucune interaction tactile, l'inactivité mesurée
 * par le système est donc totale.
 *
 * Le drapeau est **retiré à la sortie** : le laisser poserait le défaut inverse,
 * un écran qui ne s'éteint jamais.
 */
@Composable
fun KeepScreenOn(enabled: Boolean = true) {
    val activity = LocalContext.current.findActivity()
    DisposableEffect(activity, enabled) {
        val window = activity?.window
        if (enabled) window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
}

/**
 * Vrai plein écran : masque la barre d'état et la barre de navigation.
 *
 * Elles restaient visibles pendant toute la lecture — heure, batterie et boutons
 * système par-dessus l'image.
 *
 * `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` conserve l'accès aux barres par un
 * glissement : les masquer sans échappatoire enfermerait l'utilisateur.
 */
@Composable
fun ImmersiveFullScreen(enabled: Boolean = true) {
    val activity = LocalContext.current.findActivity()
    DisposableEffect(activity, enabled) {
        val window = activity?.window
        val controller = window?.let { WindowInsetsControllerCompat(it, it.decorView) }
        if (enabled && window != null && controller != null) {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        }
        onDispose {
            if (window != null && controller != null) {
                controller.show(WindowInsetsCompat.Type.systemBars())
                WindowCompat.setDecorFitsSystemWindows(window, true)
            }
        }
    }
}
