package com.purple.iptvplayer.tv.ui.common

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext

private fun Context.findActivity(): Activity? {
    var ctx = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}

/**
 * Empêche le téléviseur de s'endormir pendant la lecture — cf.
 * `mobile/ui/common/ScreenMode.kt` pour le raisonnement.
 *
 * Le cas est plus visible sur TV : une télécommande reste posée, l'inactivité
 * mesurée par le système dure donc tout le film.
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
