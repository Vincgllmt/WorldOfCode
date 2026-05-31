package com.purpleiptv.tv.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.purpleiptv.tv.model.FeaturedHero
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurpleMotion
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleSpacing
import kotlinx.coroutines.delay

/**
 * Immersive hero at the top of Home. Full-bleed backdrop, protection
 * gradients on the left + bottom, big title, three action buttons.
 *
 * Auto-rotates through [items] every [PurpleMotion.HeroIntervalMs].
 */
@Composable
fun HeroBanner(
    items: List<FeaturedHero>,
    onPlay: (FeaturedHero) -> Unit,
    onMoreInfo: (FeaturedHero) -> Unit,
    onAddToList: (FeaturedHero) -> Unit,
    modifier: Modifier = Modifier,
    height: androidx.compose.ui.unit.Dp = 720.dp,
) {
    if (items.isEmpty()) return
    var index by remember { mutableStateOf(0) }

    LaunchedEffect(items.size) {
        while (true) {
            delay(PurpleMotion.HeroIntervalMs)
            index = (index + 1) % items.size
        }
    }

    val current = items[index]

    Box(modifier = modifier.fillMaxWidth().height(height)) {
        // Backdrop — crossfade between hero items
        AnimatedContent(
            targetState = current,
            transitionSpec = {
                fadeIn(tween(PurpleMotion.DurationHero, easing = PurpleMotion.EaseOutQuint))
                    .togetherWith(fadeOut(tween(PurpleMotion.DurationHero, easing = PurpleMotion.EaseOutQuint)))
            },
            label = "hero-backdrop",
        ) { hero ->
            if (hero.movie.backdropUrl != null) {
                AsyncImage(
                    model = hero.movie.backdropUrl,
                    contentDescription = hero.movie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                // Color fallback when artwork is missing
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(Color(hero.movie.accentColor)),
                )
            }
        }

        // Left protection gradient (so text stays legible over photography)
        Box(
            Modifier
                .fillMaxHeight()
                .fillMaxWidth(0.6f)
                .background(
                    Brush.horizontalGradient(
                        0f to PurplePalette.Bg1,
                        0.25f to Color(0xEB_0B0414),
                        0.55f to Color(0x8C_0B0414),
                        0.85f to Color.Transparent,
                    ),
                ),
        )
        // Bottom protection gradient — fades hero into the rows below
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(height * 0.5f)
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        0.6f to Color(0xB3_0B0414),
                        1f to PurplePalette.Bg1,
                    ),
                ),
        )

        // Content
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = PurpleSpacing.TvSafeX + 100.dp, end = PurpleSpacing.TvSafeX, top = 140.dp)
                .widthIn(max = 920.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CapsLabel("★ Featured this week", size = 16)
                Text(
                    "· in 4K HDR",
                    style = LocalPurpleType.current.meta.copy(color = PurplePalette.Fg3, fontSize = androidx.compose.ui.unit.TextUnit(16f, androidx.compose.ui.unit.TextUnitType.Sp)),
                )
            }
            Text(
                text = current.movie.title.uppercase(),
                style = LocalPurpleType.current.heroTitle.copy(
                    fontSize = androidx.compose.ui.unit.TextUnit(72f, androidx.compose.ui.unit.TextUnitType.Sp),
                ),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = Color.White,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (current.movie.rating > 0) RatingChip(current.movie.rating)
                MetaChip(current.movie.year.toString())
                MetaChip(current.movie.duration)
                current.movie.genres.forEach { MetaChip(it) }
            }
            Text(
                text = current.tagline,
                style = LocalPurpleType.current.body.copy(color = Color.White.copy(alpha = 0.82f)),
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp), modifier = Modifier.padding(top = 8.dp)) {
                PurpleButton(text = "Play",       onClick = { onPlay(current) },       icon = Icons.Default.PlayArrow)
                PurpleButton(text = "More info",  onClick = { onMoreInfo(current) },   icon = Icons.Default.Info,
                    variant = PurpleButtonVariant.Secondary)
                PurpleButton(text = "My list",    onClick = { onAddToList(current) },  icon = Icons.Default.Add,
                    variant = PurpleButtonVariant.Ghost)
            }
            // Pager dots
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
                items.forEachIndexed { i, _ ->
                    Box(
                        Modifier
                            .height(4.dp)
                            .width(if (i == index) 28.dp else 8.dp)
                            .background(
                                if (i == index) PurplePalette.Purple400 else Color.White.copy(alpha = 0.3f),
                                shape = com.purpleiptv.tv.theme.PurpleShapes.Pill,
                            ),
                    )
                }
            }
        }
    }
}
