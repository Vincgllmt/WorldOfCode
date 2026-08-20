package com.purple.iptvplayer.mobile.ui.cast

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.purple.iptvplayer.mobile.cast.CastInfo
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.R

@Composable
fun CastRemoteSheet(
    castVm:   CastViewModel,
    modifier: Modifier = Modifier,
    /**
     * Hauteur à réserver sous la barre repliée.
     *
     * La feuille est rendue globalement, par-dessus toute la pile de navigation : sans
     * ce décalage elle recouvrait la barre d'onglets de l'écran principal, et chaque
     * tentative de changer d'onglet rouvrait la télécommande.
     */
    bottomInset: Dp = 0.dp,
) {
    val info by castVm.state.collectAsState()
    if (!info.isConnected) return

    // Repliée par défaut, et **jamais** dépliée d'office.
    //
    // Elle s'ouvrait en plein écran au démarrage puis se rouvrait à chaque changement
    // de titre : impossible de s'en débarrasser, et toute tentative d'atteindre la
    // barre d'onglets la relançait. C'est l'utilisateur qui la déplie, en la touchant.
    var expanded by rememberSaveable { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxWidth()) {
        if (expanded) {
            ExpandedRemote(
                info          = info,
                onCollapse    = { expanded = false },
                onPlayPause   = { if (info.isPlaying) castVm.pause() else castVm.play() },
                onSkipBack    = { castVm.skipBackward() },
                onSkipFwd     = { castVm.skipForward() },
                // Arrêter la diffusion met fin à la session : sinon `isConnected` reste
                // vrai et la barre survit indéfiniment, sans contenu et sans moyen de la
                // faire disparaître.
                onStop        = { castVm.stop(); castVm.disconnect(); expanded = false },
                onSeek        = { castVm.seekTo(it) },
                onDisconnect  = { castVm.disconnect() },
            )
        } else {
            MiniBar(
                modifier    = Modifier.padding(bottom = bottomInset),
                info        = info,
                onExpand    = { expanded = true },
                onPlayPause = { if (info.isPlaying) castVm.pause() else castVm.play() },
                onStop      = { castVm.stop(); castVm.disconnect() },
            )
        }
    }
}

@Composable
private fun MiniBar(
    modifier:    Modifier = Modifier,
    info:        CastInfo,
    onExpand:    () -> Unit,
    onPlayPause: () -> Unit,
    onStop:      () -> Unit,
) {
    Surface(
        // `modifier` était déclaré et jamais utilisé : la chaîne repartait de zéro, donc
        // le décalage passé par l'appelant était perdu et la barre restait sur les onglets.
        modifier = modifier
            .fillMaxWidth()
            .padding(8.dp)
            .height(64.dp)
            .shadow(12.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .clickable { onExpand() },
        color = BgCard,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (!info.mediaCover.isNullOrEmpty()) {
                AsyncImage(
                    model            = info.mediaCover,
                    contentDescription = null,
                    contentScale     = ContentScale.Crop,
                    modifier         = Modifier.size(40.dp).clip(RoundedCornerShape(8.dp)),
                )
            } else {
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(8.dp)).background(BgSurface), Alignment.Center) {
                    Icon(Icons.Rounded.Cast, null, tint = PurpleGlow, modifier = Modifier.size(20.dp))
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(info.mediaTitle.ifEmpty { "Casting…" }, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Sur ${info.deviceName}", color = PurpleGlow, fontSize = 11.sp, maxLines = 1)
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onPlayPause) {
                    Icon(if (info.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow, null, tint = TextPrimary)
                }
                IconButton(onClick = onStop) {
                    Icon(Icons.Rounded.Stop, null, tint = ColorError.copy(alpha = 0.8f))
                }
            }
        }
    }
}

@Composable
private fun ExpandedRemote(
    info:         CastInfo,
    onCollapse:   () -> Unit,
    onPlayPause:  () -> Unit,
    onSkipBack:   () -> Unit,
    onSkipFwd:    () -> Unit,
    onStop:       () -> Unit,
    onSeek:       (Long) -> Unit,
    onDisconnect: () -> Unit,
) {
    var showInfoDialog by remember { mutableStateOf(false) }

    if (showInfoDialog) {
        AlertDialog(
            onDismissRequest = { showInfoDialog = false },
            confirmButton = {
                TextButton(onClick = { showInfoDialog = false }) {
                    Text("OK", color = PurpleGlow, fontWeight = FontWeight.Bold)
                }
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Rounded.Info, null, tint = PurpleGlow, modifier = Modifier.size(24.dp))
                    Text(stringResource(R.string.cast_info_title), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            text = {
                Text(stringResource(R.string.cast_info_text), color = TextSub, fontSize = 14.sp, lineHeight = 20.sp)
            },
            containerColor = BgCard,
            shape = RoundedCornerShape(28.dp),
        )
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color    = BgHome,
    ) {
        Column(
            modifier = Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth().height(56.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                IconButton(onClick = onCollapse) {
                    Icon(Icons.Rounded.KeyboardArrowDown, null, tint = Color.White, modifier = Modifier.size(32.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { showInfoDialog = true }) {
                        Icon(Icons.Rounded.Info, null, tint = Color.White.copy(0.7f), modifier = Modifier.size(24.dp))
                    }
                    CastButton(modifier = Modifier.size(40.dp))
                }
            }

            Spacer(Modifier.weight(0.1f))

            // Cover with glow
            Box(contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(260.dp, 360.dp)
                        .shadow(40.dp, RoundedCornerShape(24.dp), ambientColor = PurpleGlow, spotColor = PurpleGlow)
                )
                AsyncImage(
                    model              = info.mediaCover,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier
                        .size(240.dp, 340.dp)
                        .clip(RoundedCornerShape(24.dp)),
                )
            }

            Spacer(Modifier.weight(0.1f))

            // Metadata
            Text(
                info.mediaTitle.ifEmpty { "Casting…" },
                color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center, maxLines = 2, overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Sur ${info.deviceName}",
                color = PurpleGlow, fontSize = 15.sp, fontWeight = FontWeight.Medium,
            )

            Spacer(Modifier.weight(0.1f))

            // Progress
            if (info.durationMs > 0L) {
                Column {
                    Slider(
                        value = (info.positionMs.toFloat() / info.durationMs.toFloat()).coerceIn(0f, 1f),
                        onValueChange = { onSeek((it * info.durationMs).toLong()) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = SliderDefaults.colors(thumbColor = Color.White, activeTrackColor = PurpleGlow, inactiveTrackColor = Color.White.copy(0.1f))
                    )
                    Row(Modifier.fillMaxWidth()) {
                        Text(info.positionMs.toTimeStr(), color = TextSub, fontSize = 12.sp)
                        Spacer(Modifier.weight(1f))
                        Text(info.durationMs.toTimeStr(), color = TextSub, fontSize = 12.sp)
                    }
                }
            }

            Spacer(Modifier.weight(0.1f))

            // Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                ControlButtonSmall(icon = Icons.Rounded.Stop, onClick = onStop)
                ControlButtonSmall(icon = Icons.Rounded.Replay10, onClick = onSkipBack)
                
                // Play/Pause Large
                Box(
                    modifier = Modifier
                        .size(86.dp)
                        .clip(CircleShape)
                        .background(Purple)
                        .clickable { onPlayPause() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (info.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        null, tint = Color.White, modifier = Modifier.size(48.dp)
                    )
                }

                ControlButtonSmall(icon = Icons.Rounded.Forward10, onClick = onSkipFwd)
                // Pas de bouton de pistes : Google Cast ne sait changer de piste audio ou
                // de sous-titres que sur un flux adaptatif (HLS/DASH). Le fournisseur sert
                // des fichiers progressifs, le récepteur joue donc la piste par défaut du
                // conteneur — souvent l'anglais — sans alternative. Le bouton existait avec
                // un `onClick = {}` vide : il promettait un choix qui n'a jamais existé.
            }

            Spacer(Modifier.weight(0.15f))
        }
    }
}

@Composable
private fun ControlButtonSmall(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(52.dp)
            .clip(CircleShape)
            .background(Color.White.copy(0.08f))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = Color.White, modifier = Modifier.size(26.dp))
    }
}

private fun Long.toTimeStr(): String {
    val s = this / 1000
    val h = s / 3600
    val m = (s % 3600) / 60
    val sec = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, sec) else "%02d:%02d".format(m, sec)
}
