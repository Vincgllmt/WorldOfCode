package com.purple.iptvplayer.mobile.ui.purchase

import android.app.Activity
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.android.billingclient.api.ProductDetails
import com.purple.iptvplayer.R
import com.purple.iptvplayer.core.data.BillingRepository
import com.purple.iptvplayer.core.data.OfferPrice
import com.purple.iptvplayer.core.viewmodel.PurchaseScreenState
import com.purple.iptvplayer.core.viewmodel.PurchaseViewModel
import com.purple.iptvplayer.mobile.ui.theme.*
import org.koin.androidx.compose.koinViewModel

@Composable
fun PurchaseScreen(onBack: (() -> Unit)?, onSuccess: () -> Unit) {
    val vm: PurchaseViewModel = koinViewModel()
    val state    by vm.state.collectAsState()
    val products by vm.products.collectAsState()
    val isPro    by vm.isPro.collectAsState()
    val activity = LocalContext.current as Activity

    LaunchedEffect(state) {
        if (state is PurchaseScreenState.PurchaseSuccess) onSuccess()
    }

    Box(modifier = Modifier.fillMaxSize().background(
        Brush.radialGradient(listOf(Color(0xFF2D1B4E), BgApp), radius = 1200f)
    )) {
        when (state) {
            is PurchaseScreenState.Loading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = PurpleGlow)
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 24.dp, vertical = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = stringResource(R.string.purchase_title),
                        color = TextPrimary,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                        letterSpacing = 1.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.purchase_pitch),
                        color = TextSub,
                        fontSize = 16.sp,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(48.dp))

                    if (products.isEmpty()) {
                        Text(stringResource(R.string.purchase_none), color = TextSub, textAlign = TextAlign.Center)
                    } else {
                        ConstrainedBox(maxWidth = 460.dp) {
                            products.forEach { product ->
                                PriceCard(
                                    product = product,
                                    isLoading = state is PurchaseScreenState.Purchasing,
                                    onTap = { vm.purchase(activity, product) },
                                )
                                Spacer(Modifier.height(16.dp))
                            }
                        }
                    }

                    Spacer(Modifier.height(48.dp))

                    // Absent quand l'écran sert de barrière : cf. onBack nullable.
                    if (onBack != null) {
                        TextButton(onClick = onBack) {
                            Text(
                                text  = stringResource(R.string.purchase_later),
                                color = TextPrimary.copy(alpha = 0.3f),
                                style = LocalTextStyle.current.copy(
                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline
                                ),
                            )
                        }
                    }
                }
            }
        }

        // Purchasing overlay
        if (state is PurchaseScreenState.Purchasing) {
            Box(
                modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.7f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = PurpleGlow)
                    Spacer(Modifier.height(24.dp))
                    Text(stringResource(R.string.purchase_processing), color = TextPrimary, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun PriceCard(product: ProductDetails, isLoading: Boolean, onTap: () -> Unit) {
    val isLifetime = product.productId == BillingRepository.LIFETIME_ID
    val isYearly   = product.productId == BillingRepository.YEARLY_ID
    // B3 : un abonnement n'a pas d'oneTimePurchaseOfferDetails — lire ce seul champ
    // affichait « N/A » sur les deux abonnements, dont Play connaissait pourtant le prix.
    val price      = OfferPrice.formatted(
        oneTime = product.oneTimePurchaseOfferDetails?.formattedPrice,
        subscriptionPhases = product.subscriptionOfferDetails
            ?.firstOrNull()
            ?.pricingPhases
            ?.pricingPhaseList
            ?.map { it.formattedPrice }
            .orEmpty(),
    )

    val title  = when (product.productId) {
        BillingRepository.MONTHLY_ID  -> "Monthly"
        BillingRepository.YEARLY_ID   -> "Yearly"
        BillingRepository.LIFETIME_ID -> "Lifetime"
        else -> product.name
    }
    val period = when (product.productId) {
        BillingRepository.MONTHLY_ID  -> stringResource(R.string.period_month)
        BillingRepository.YEARLY_ID   -> stringResource(R.string.period_year)
        BillingRepository.LIFETIME_ID -> stringResource(R.string.period_onetime)
        else -> ""
    }
    val badge = when (product.productId) {
        BillingRepository.YEARLY_ID   -> "SAVE 58%"
        BillingRepository.LIFETIME_ID -> stringResource(R.string.badge_best_deal)
        else -> null
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(if (isLifetime) Purple.copy(alpha = 0.15f) else BgCard)
            .border(
                width = if (isLifetime) 2.5.dp else 1.5.dp,
                color = when {
                    isLifetime -> ColorGold
                    isYearly   -> PurpleGlow
                    else       -> TextPrimary.copy(alpha = 0.1f)
                },
                shape = RoundedCornerShape(20.dp),
            )
            .clickable(enabled = !isLoading) { onTap() }
            .padding(20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            badge?.let {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isLifetime) ColorGold else PurpleGlow)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = it,
                        color = if (isLifetime) Color.Black else TextPrimary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                    )
                }
                Spacer(Modifier.height(8.dp))
            }
            Text(
                text       = title,
                color      = if (isLifetime) ColorGold else TextPrimary,
                fontSize   = 18.sp,
                fontWeight = FontWeight.Black,
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(price,  color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Black)
            Text(period, color = TextPrimary.copy(alpha = 0.5f), fontSize = 12.sp)
        }
        Spacer(Modifier.width(16.dp))
        Icon(
            imageVector = Icons.Rounded.ChevronRight,
            contentDescription = null,
            tint = if (isLifetime) ColorGold else TextPrimary.copy(alpha = 0.24f),
        )
    }
}

@Composable
private fun ConstrainedBox(maxWidth: androidx.compose.ui.unit.Dp, content: @Composable ColumnScope.() -> Unit) {
    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Column(modifier = Modifier.widthIn(max = maxWidth).fillMaxWidth(), content = content)
    }
}
