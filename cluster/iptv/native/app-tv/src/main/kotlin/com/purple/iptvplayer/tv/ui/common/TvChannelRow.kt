package com.purple.iptvplayer.tv.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.model.Channel
import com.purple.iptvplayer.tv.ui.theme.LocalPurpleType
import com.purple.iptvplayer.tv.ui.theme.PurplePalette
import com.purple.iptvplayer.tv.ui.theme.PurpleShapes

/**
 * Une chaîne, sur une ligne — équivalent TV de `mobile/ui/common/ChannelRow`.
 *
 * Deux surfaces focalisables distinctes : la ligne (lecture) et l'étoile (retrait du
 * favori). C'est ce second point qui manquait — la vue de navigation par défaut
 * (`TvHomeScreen`, `showFavBtn = false`) n'expose aucun bouton favori, et « Ma liste »
 * n'affichait pas les chaînes : une chaîne mise en favori n'était donc **retirable
 * nulle part**.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvChannelRow(
    channel: Channel,
    onPlay:  () -> Unit,
    onFav:   () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Surface(
            onClick  = onPlay,
            modifier = Modifier.weight(1f),
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
            colors   = ClickableSurfaceDefaults.colors(
                containerColor        = PurplePalette.Bg2,
                focusedContainerColor = PurplePalette.Purple400,
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(PurpleShapes.Xs)
                        .background(PurplePalette.Bg0),
                    contentAlignment = Alignment.Center,
                ) {
                    var failed by remember(channel.url) { mutableStateOf(false) }
                    if (!channel.logo.isNullOrEmpty() && !failed) {
                        AsyncImage(
                            model              = channel.logo,
                            contentDescription = null,
                            contentScale       = ContentScale.Fit,
                            onError            = { failed = true },
                            modifier           = Modifier.fillMaxSize().padding(4.dp),
                        )
                    } else {
                        Text(
                            channel.initials(),
                            style = LocalPurpleType.current.bodySmall.copy(
                                color = PurplePalette.Purple300, fontWeight = FontWeight.Black,
                            ),
                        )
                    }
                }
                Spacer(Modifier.width(14.dp))
                Text(
                    channel.name,
                    style    = LocalPurpleType.current.body.copy(color = PurplePalette.Fg1),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        Surface(
            onClick = onFav,
            shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
            colors  = ClickableSurfaceDefaults.colors(
                containerColor        = PurplePalette.Bg2,
                focusedContainerColor = PurplePalette.Purple400,
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            Box(Modifier.size(56.dp), contentAlignment = Alignment.Center) {
                Text("★", color = Color(0xFFFFD700), fontSize = 22.sp)
            }
        }
    }
}

/** Deux lettres tirées du nom, en repli du logo. */
private fun Channel.initials(): String =
    name.split(' ', '|', '-')
        .filter { it.isNotBlank() }
        .take(2)
        .map { it.first().uppercaseChar() }
        .joinToString("")
        .ifEmpty { "?" }
