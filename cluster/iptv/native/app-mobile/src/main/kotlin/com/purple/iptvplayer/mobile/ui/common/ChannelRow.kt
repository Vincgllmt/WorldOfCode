package com.purple.iptvplayer.mobile.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.model.Channel
import com.purple.iptvplayer.mobile.ui.theme.*

/**
 * Une chaîne, sur une ligne.
 *
 * Trois écarts délibérés avec [ChannelCard], qu'elle remplace pour le live :
 *
 * 1. **Logo en [ContentScale.Fit], jamais `Crop`.** Les logos de chaînes sont de ratios
 *    très variés et souvent transparents ; les recadrer en 16:9 en amputait une partie.
 * 2. **Repli en initiales** quand le logo est absent ou ne charge pas — un catalogue réel
 *    en compte beaucoup, et une icône générique répétée sur 200 lignes n'aide personne à
 *    distinguer les chaînes.
 * 3. **L'étoile de favori fonctionne.** [ChannelCard] déclarait `onFav` sans jamais
 *    l'appeler : mettre une chaîne en favori était impossible depuis la grille.
 */
@Composable
fun ChannelRow(
    channel: Channel,
    isFav:   Boolean,
    onPlay:  () -> Unit,
    onFav:   () -> Unit,
    /**
     * Réordonnancement. `null` masque les commandes — elles n'ont de sens que là où
     * l'ordre est celui de l'utilisateur, c'est-à-dire « Ma liste », pas la navigation.
     *
     * Des boutons plutôt qu'un glisser-déposer : c'est la seule forme utilisable **à la
     * télécommande**, et elle donne la même interaction sur mobile et sur TV.
     */
    onMoveUp:   (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(BgCard)
            .clickable { onPlay() }
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(BgSurface),
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
                    text       = channel.initials(),
                    color      = PurpleGlow,
                    fontSize   = 13.sp,
                    fontWeight = FontWeight.Black,
                )
            }
        }

        Spacer(Modifier.width(12.dp))

        Text(
            text     = channel.name,
            color    = TextPrimary,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )

        if (onMoveUp != null || onMoveDown != null) {
            IconButton(
                onClick  = { onMoveUp?.invoke() },
                enabled  = onMoveUp != null,
                modifier = Modifier.size(36.dp),
            ) {
                Icon(
                    Icons.Rounded.KeyboardArrowUp, "Monter",
                    tint     = if (onMoveUp != null) TextSub else TextSub.copy(0.2f),
                    modifier = Modifier.size(20.dp),
                )
            }
            IconButton(
                onClick  = { onMoveDown?.invoke() },
                enabled  = onMoveDown != null,
                modifier = Modifier.size(36.dp),
            ) {
                Icon(
                    Icons.Rounded.KeyboardArrowDown, "Descendre",
                    tint     = if (onMoveDown != null) TextSub else TextSub.copy(0.2f),
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        IconButton(onClick = onFav, modifier = Modifier.size(36.dp)) {
            Icon(
                imageVector        = if (isFav) Icons.Rounded.Star else Icons.Rounded.StarBorder,
                contentDescription = null,
                tint               = if (isFav) ColorGold else TextSub.copy(0.6f),
                modifier           = Modifier.size(19.dp),
            )
        }
    }
}

/** Deux lettres tirées du nom, en repli du logo. Les décorations ont déjà été nettoyées en amont (cf. P7). */
private fun Channel.initials(): String =
    name.split(' ', '|', '-')
        .filter { it.isNotBlank() }
        .take(2)
        .map { it.first().uppercaseChar() }
        .joinToString("")
        .ifEmpty { "?" }
