package com.purple.iptvplayer.tv.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import com.purple.iptvplayer.core.viewmodel.ContentFailure
import com.purple.iptvplayer.tv.ui.theme.LocalPurpleType
import com.purple.iptvplayer.tv.ui.theme.PurplePalette

/**
 * Composant d'erreur réutilisable pour l'UI TV.
 *
 * Affiche une icône et le message localisé d'un [ContentFailure],
 * centré avec un padding adapté aux écrans TV (#36).
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvErrorContent(
    failure: ContentFailure,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 48.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Rounded.ErrorOutline,
            contentDescription = null,
            tint = PurplePalette.Danger,
            modifier = Modifier.size(48.dp),
        )
        androidx.compose.foundation.layout.Spacer(Modifier.padding(12.dp))
        Text(
            failure.toDisplayString(),
            style = LocalPurpleType.current.body.copy(color = PurplePalette.Danger),
        )
    }
}
