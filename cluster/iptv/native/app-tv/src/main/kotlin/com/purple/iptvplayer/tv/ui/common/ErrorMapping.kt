package com.purple.iptvplayer.tv.ui.common

import com.purple.iptvplayer.core.viewmodel.ContentFailure
import com.purple.iptvplayer.core.viewmodel.SetupFailure

/** Traduit une cause typée en texte lisible pour l'UI TV.
 *  Remplace les libellés écrits en dur qui vivaient dans le ViewModel.
 *  L'UI conserve la responsabilité du wording. */
fun ContentFailure.toDisplayString(): String = when (this) {
    ContentFailure.NETWORK      -> "Network error. Please check your connection."
    ContentFailure.NOT_FOUND    -> "Content not found."
    ContentFailure.PARSE_ERROR  -> "Failed to parse response."
    ContentFailure.UNKNOWN      -> "An unexpected error occurred."
}

fun SetupFailure.toDisplayString(): String = when (this) {
    SetupFailure.INVALID_INPUT -> "Invalid input. Please check your entries."
    SetupFailure.NETWORK       -> "Could not connect to the server. Please check your credentials."
    SetupFailure.UNKNOWN       -> "An unexpected error occurred."
}
