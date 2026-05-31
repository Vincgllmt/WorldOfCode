package com.purpleiptv.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.purpleiptv.tv.model.Movie
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleSpacing
import com.purpleiptv.tv.ui.components.*

/**
 * Movie detail. The original mobile screen put hero artwork on top
 * and stacked everything below; on a TV the same content reads
 * better as a left-aligned text column over a right-positioned hero.
 */
@Composable
fun MovieDetailScreen(
    movie: Movie,
    onPlay: () -> Unit,
    onDownload: () -> Unit,
    onAddToList: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1),
    ) {
        // Right-side hero artwork
        if (movie.backdropUrl != null) {
            AsyncImage(
                model = movie.backdropUrl,
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(0.65f)
                    .align(Alignment.TopEnd),
            )
        } else {
            Box(
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(0.65f)
                    .align(Alignment.TopEnd)
                    .background(Color(movie.accentColor)),
            )
        }
        // Left protection
        Box(
            Modifier
                .fillMaxHeight()
                .fillMaxWidth(0.7f)
                .background(
                    Brush.horizontalGradient(
                        0f to PurplePalette.Bg1,
                        0.45f to Color(0xCC_0B0414),
                        1f to Color.Transparent,
                    ),
                ),
        )
        // Bottom protection
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .fillMaxHeight(0.4f)
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        1f to PurplePalette.Bg1,
                    ),
                ),
        )

        // Back affordance
        Row(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(horizontal = PurpleSpacing.TvSafeX, vertical = 54.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = PurplePalette.Fg3, modifier = Modifier.size(22.dp))
            Text("Back", style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3))
        }

        // Content
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = PurpleSpacing.TvSafeX + 100.dp, end = PurpleSpacing.TvSafeX)
                .widthIn(max = 920.dp),
            verticalArrangement = Arrangement.spacedBy(26.dp),
        ) {
            CapsLabel("Film", size = 14)
            Text(
                text = movie.title.uppercase(),
                style = LocalPurpleType.current.heroTitle.copy(color = Color.White),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                if (movie.rating > 0) RatingChip(movie.rating)
                MetaChip(movie.year.toString())
                MetaChip(movie.duration)
                movie.genres.forEach { MetaChip(it) }
            }
            if (movie.plot != null) {
                Text(
                    text = movie.plot,
                    style = LocalPurpleType.current.body.copy(color = PurplePalette.Fg2),
                )
            }
            if (movie.director != null) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    CapsLabel("Director", color = PurplePalette.Fg3, size = 12)
                    Text(movie.director, style = LocalPurpleType.current.h3.copy(color = Color.White))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp), modifier = Modifier.padding(top = 16.dp)) {
                PurpleButton("Play", onPlay, icon = Icons.Default.PlayArrow)
                PurpleButton("Download", onDownload, icon = Icons.Default.Download, variant = PurpleButtonVariant.Secondary)
                PurpleButton("My list", onAddToList, icon = Icons.Default.Add, variant = PurpleButtonVariant.Ghost)
            }
        }
    }
}

/**
 * Tiny helper for the size 14 default of CapsLabel — kept private here
 * to avoid bleeding into the components package's public API.
 */
@Composable
private fun CapsLabel(text: String, size: Int = 14, color: Color = PurplePalette.Purple300) {
    com.purpleiptv.tv.ui.components.CapsLabel(text = text, color = color)
}
