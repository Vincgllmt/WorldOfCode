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
import com.purple.iptvplayer.tv.ui.theme.TvSurfaceDefaults
import androidx.compose.foundation.focusGroup
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusEvent

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
    /** `true` dans « Ma liste », où tout est favori ; variable en navigation. */
    isFav: Boolean = true,
    /** Réordonnancement — `null` masque la commande (cf. `ChannelRow` mobile). */
    onMoveUp:   (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null,
) {
    // G11 — deux arrêts de focus par ligne : la ligne, puis l'étoile. Le trajet
    // genre → chaîne coûtait 3 appuis `▶` au lieu d'un, et chaque traversée verticale
    // facturait l'étoile au passage.
    //
    // On ne la supprime pas — retirer un élément supprime la fonction qu'il portait
    // (§8.6) — on la retire du **parcours** tant que la ligne n'a pas le focus.
    //
    // ⚠️ `hasFocus` et non `isFocused` : le groupe englobe la ligne ET l'étoile. Avec
    // `isFocused`, l'étoile se retirerait du parcours au moment même où le focus
    // l'atteint, et le focus serait perdu — le défaut symétrique de §8.14.
    var rowHasFocus by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .focusGroup()
            .onFocusEvent { rowHasFocus = it.hasFocus },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Surface(
            onClick  = onPlay,
            modifier = Modifier.weight(1f),
            shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
            // G10 — le contenu suit l'état au lieu de le contredire.
            colors   = TvSurfaceDefaults.onAccent(),
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
                    // `LocalContentColor` est fourni par la Surface TV selon son état :
                    // Fg1 au repos, FgOnPrimary au focus. Plus de couleur en dur.
                    style    = LocalPurpleType.current.body.copy(color = LocalContentColor.current),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }

        if (onMoveUp != null) {
            ArrowButton("▲", onMoveUp)
        }
        if (onMoveDown != null) {
            ArrowButton("▼", onMoveDown)
        }

        Surface(
            onClick = onFav,
            // Reste dans la mise en page — pas de saut de largeur au focus — mais ne
            // coûte un appui que sur la ligne où l'on se trouve.
            modifier = Modifier
                .alpha(if (rowHasFocus) 1f else 0.35f)
                .focusProperties { canFocus = rowHasFocus },
            shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
            colors  = TvSurfaceDefaults.onAccent(),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            // ⚠️ L'étoile n'est pas du texte ordinaire : l'or `#FFD700` sur `#B36BFC` tombe
            // à **2,1 : 1**. Corriger le libellé et laisser l'icône illisible reviendrait à
            // ne corriger qu'à moitié. Elle bascule donc sur le jeton au focus.
            val focused = LocalContentColor.current == PurplePalette.FgOnPrimary
            Box(Modifier.size(56.dp), contentAlignment = Alignment.Center) {
                Text(
                    if (isFav) "★" else "☆",
                    color    = when {
                        focused -> PurplePalette.FgOnPrimary
                        isFav   -> Color(0xFFFFD700)
                        else    -> PurplePalette.Fg3
                    },
                    fontSize = 22.sp,
                )
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


/** Flèche de réordonnancement — une surface focalisable, opérable à la télécommande. */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ArrowButton(glyph: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Xs),
        colors  = TvSurfaceDefaults.onAccent(contentColor = PurplePalette.Fg2),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
    ) {
        Box(Modifier.size(56.dp), contentAlignment = Alignment.Center) {
            Text(glyph, color = LocalContentColor.current, fontSize = 16.sp)
        }
    }
}
