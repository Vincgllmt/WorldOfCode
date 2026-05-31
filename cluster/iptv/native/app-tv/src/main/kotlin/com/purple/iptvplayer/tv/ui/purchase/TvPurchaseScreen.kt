package com.purple.iptvplayer.tv.ui.purchase

import android.app.Activity
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.android.billingclient.api.ProductDetails
import com.purple.iptvplayer.core.data.BillingRepository
import com.purple.iptvplayer.core.viewmodel.PurchaseScreenState
import com.purple.iptvplayer.core.viewmodel.PurchaseViewModel
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel

@Composable
fun TvPurchaseScreen(onBack: () -> Unit, onSuccess: () -> Unit) {
    val vm: PurchaseViewModel = koinViewModel()
    val state    by vm.state.collectAsState()
    val products by vm.products.collectAsState()
    val activity = LocalContext.current as Activity

    LaunchedEffect(state) {
        if (state is PurchaseScreenState.PurchaseSuccess) onSuccess()
    }

    Box(
        modifier = Modifier.fillMaxSize().background(
            Brush.radialGradient(listOf(Color(0xFF2D1B4E), TvBgApp), radius = 1500f)
        ),
        contentAlignment = Alignment.Center,
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(64.dp), horizontalArrangement = Arrangement.spacedBy(48.dp)) {
            // Left — title
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
                Text("PURPLE IPTV", color = TvPurpleGlow, fontSize = 28.sp,
                    fontWeight = FontWeight.Black, letterSpacing = 5.sp)
                Spacer(Modifier.height(16.dp))
                Text("Premium", color = TvTextPrimary, fontSize = 40.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(16.dp))
                Text("Unlock unlimited access to all channels, movies & series.",
                    color = TvTextSub, fontSize = 16.sp, lineHeight = 24.sp)
                Spacer(Modifier.height(32.dp))
                TextButton(onClick = onBack) {
                    Text("Maybe later", color = TvTextPrimary.copy(0.4f), fontSize = 14.sp,
                        style = LocalTextStyle.current.copy(
                            textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline))
                }
            }

            // Right — product cards
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (state is PurchaseScreenState.Loading) {
                    CircularProgressIndicator(color = TvPurpleGlow)
                } else if (products.isEmpty()) {
                    Text("No products available", color = TvTextSub, textAlign = TextAlign.Center)
                } else {
                    products.forEach { product ->
                        TvPriceCard(
                            product = product,
                            isLoading = state is PurchaseScreenState.Purchasing,
                            onSelect = { vm.purchase(activity, product) },
                        )
                    }
                }
            }
        }

        if (state is PurchaseScreenState.Purchasing) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(0.7f)), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = TvPurpleGlow)
                    Spacer(Modifier.height(16.dp))
                    Text("Processing payment...", color = TvTextPrimary, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun TvPriceCard(product: ProductDetails, isLoading: Boolean, onSelect: () -> Unit) {
    val isLifetime = product.productId == BillingRepository.LIFETIME_ID
    val isYearly   = product.productId == BillingRepository.YEARLY_ID
    val price = product.oneTimePurchaseOfferDetails?.formattedPrice ?: "N/A"
    val title = when (product.productId) {
        BillingRepository.MONTHLY_ID  -> "Monthly"
        BillingRepository.YEARLY_ID   -> "Yearly"
        BillingRepository.LIFETIME_ID -> "Lifetime"
        else -> product.name
    }
    val period = when (product.productId) {
        BillingRepository.MONTHLY_ID  -> "/ month"
        BillingRepository.YEARLY_ID   -> "/ year"
        BillingRepository.LIFETIME_ID -> "one-time"
        else -> ""
    }
    val badge = when (product.productId) {
        BillingRepository.YEARLY_ID   -> "SAVE 58%"
        BillingRepository.LIFETIME_ID -> "BEST DEAL"
        else -> null
    }

    var isFocused by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(when {
                isFocused  -> TvPurple.copy(0.4f)
                isLifetime -> TvPurple.copy(0.15f)
                else       -> TvBgCard
            })
            .border(
                width = if (isFocused) 2.5.dp else if (isLifetime) 2.dp else 1.dp,
                color = when {
                    isFocused  -> TvPurpleGlow
                    isLifetime -> TvColorGold
                    isYearly   -> TvPurpleGlow
                    else       -> TvTextPrimary.copy(0.1f)
                },
                shape = RoundedCornerShape(16.dp),
            )
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { event ->
                if (!isLoading && event.type == KeyEventType.KeyUp &&
                    (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onSelect(); true
                } else false
            }
            .padding(20.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            badge?.let {
                Box(Modifier.clip(RoundedCornerShape(6.dp))
                    .background(if (isLifetime) TvColorGold else TvPurpleGlow)
                    .padding(horizontal = 8.dp, vertical = 4.dp)) {
                    Text(it, color = if (isLifetime) Color.Black else Color.White,
                        fontSize = 10.sp, fontWeight = FontWeight.Black)
                }
                Spacer(Modifier.height(8.dp))
            }
            Text(title, color = if (isLifetime) TvColorGold else Color.White,
                fontSize = 20.sp, fontWeight = FontWeight.Black)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(price,  color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(period, color = TvTextSub,   fontSize = 13.sp)
        }
        Spacer(Modifier.width(16.dp))
        Icon(Icons.Rounded.ChevronRight, null,
            tint = if (isLifetime) TvColorGold else TvTextPrimary.copy(0.3f))
    }
}
