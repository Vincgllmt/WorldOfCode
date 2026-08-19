package com.purple.iptvplayer.tv.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text

/**
 * Dégradé doré du badge PREMIUM — identique à celui du mobile
 * (`mobile/ui/common/PremiumBadge.kt`), les deux UI devant présenter le même
 * statut de la même façon.
 *
 * Dupliqué et non partagé parce que les deux modules n'ont pas le même `Text` :
 * `androidx.tv.material3` ici, `androidx.compose.material3` côté mobile. Seule la
 * présentation est dupliquée — la **décision** vit dans `core` ([AccessState]).
 */
private val GoldGradient = Brush.linearGradient(
    0.00f to Color(0xFFB8860B), // Dark Goldenrod
    0.25f to Color(0xFFFFD700), // Gold
    0.50f to Color(0xFFFFFACD), // Lemon Chiffon — la brillance
    0.75f to Color(0xFFFFD700),
    1.00f to Color(0xFFB8860B),
)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvPremiumBadge(
    label: String,
    modifier: Modifier = Modifier,
    fontSize: TextUnit = 14.sp,
) {
    Text(
        text = label,
        modifier = modifier,
        style = TextStyle(
            brush = GoldGradient,
            fontSize = fontSize,
            fontWeight = FontWeight.Black,
            letterSpacing = 4.sp,
        ),
    )
}
