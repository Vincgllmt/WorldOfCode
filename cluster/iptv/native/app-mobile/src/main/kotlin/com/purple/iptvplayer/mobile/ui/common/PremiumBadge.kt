package com.purple.iptvplayer.mobile.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text

/**
 * Dégradé doré du badge PREMIUM.
 *
 * Repris du jumeau Flutter (`client/lib/screens/setup_screen.dart`), qui utilisait
 * un `ShaderMask` à cinq arrêts : la brillance centrale (Lemon Chiffon) est ce qui
 * donne l'effet métallique — un simple dégradé à deux tons rend un aplat terne.
 */
private val GoldGradient = Brush.linearGradient(
    0.00f to Color(0xFFB8860B), // Dark Goldenrod
    0.25f to Color(0xFFFFD700), // Gold
    0.50f to Color(0xFFFFFACD), // Lemon Chiffon — la brillance
    0.75f to Color(0xFFFFD700),
    1.00f to Color(0xFFB8860B),
)

/**
 * Marque visuellement qu'un utilisateur a payé.
 *
 * @param subtitle précision facultative — le temps restant pour un abonnement,
 *   rien pour un achat définitif : un décompte n'a de sens que s'il y a une échéance.
 */
@Composable
fun PremiumBadge(
    label: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    fontSize: androidx.compose.ui.unit.TextUnit = 30.sp,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = label,
            style = TextStyle(
                brush = GoldGradient,
                fontSize = fontSize,
                fontWeight = FontWeight.Black,
                letterSpacing = 8.sp,
                textAlign = TextAlign.Center,
            ),
        )
        if (subtitle != null) {
            Text(
                text = subtitle,
                color = Color(0xFFD9C08A),
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}
