package com.purple.iptvplayer.mobile.ui.common

import android.content.Context
import android.content.ContextWrapper
import androidx.activity.ComponentActivity
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModelStoreOwner

/**
 * Remonte la chaîne des [ContextWrapper] pour trouver le [ComponentActivity],
 * qui est le [ViewModelStoreOwner] racine de l'application.
 *
 * Nécessaire pour partager un même ViewModel entre plusieurs destinations d'un
 * NavHost : sans cela chaque [NavBackStackEntry] crée sa propre instance.
 * C'est la cause du défaut #97 — `PlayerViewModel` piloté depuis la fiche de
 * série et depuis le lecteur avec deux instances distinctes.
 */
@Composable
fun requireActivityViewModelStoreOwner(): ViewModelStoreOwner {
    var context: Context = LocalContext.current
    while (context is ContextWrapper) {
        if (context is ViewModelStoreOwner) return context
        context = context.baseContext
    }
    error("No ViewModelStoreOwner found in context hierarchy")
}
