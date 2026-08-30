package com.purple.iptvplayer.mobile.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.purple.iptvplayer.core.viewmodel.ContentFailure
import com.purple.iptvplayer.core.viewmodel.SetupFailure
import com.purple.iptvplayer.R

/**
 * Traduit une cause typée en texte lisible. L'UI garde la responsabilité du libellé —
 * `core` ne connaît que la cause.
 *
 * ⚠️ **`@Composable` et `stringResource`, pas un littéral** (#R8). Ces libellés étaient
 * écrits en dur en anglais dans ce fichier, et s'affichaient tels quels au milieu d'une
 * interface française : « Network error. Please check your connection. » sous un titre
 * « Ma liste ». `tools/check_strings.py` ne pouvait pas le voir, puisqu'il contrôle la
 * parité des **ressources** et non les chaînes du code.
 */
@Composable
fun ContentFailure.toDisplayString(): String = stringResource(
    when (this) {
        ContentFailure.NETWORK     -> R.string.error_network
        ContentFailure.NOT_FOUND   -> R.string.error_not_found
        ContentFailure.PARSE_ERROR -> R.string.error_parse
        ContentFailure.UNKNOWN     -> R.string.error_unknown
    }
)

@Composable
fun SetupFailure.toDisplayString(): String = stringResource(
    when (this) {
        SetupFailure.INVALID_INPUT -> R.string.setup_error_invalid
        SetupFailure.NETWORK       -> R.string.setup_error_network
        SetupFailure.UNKNOWN       -> R.string.error_unknown
    }
)
