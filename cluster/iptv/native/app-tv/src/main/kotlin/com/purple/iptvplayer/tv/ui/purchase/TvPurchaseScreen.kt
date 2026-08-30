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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
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
import com.purple.iptvplayer.core.data.OfferPrice
import com.purple.iptvplayer.core.data.BillingRepository
import com.purple.iptvplayer.core.data.PurchaseFailure
import com.purple.iptvplayer.core.viewmodel.PurchaseScreenState
import com.purple.iptvplayer.core.viewmodel.PurchaseViewModel
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel

/**
 * @param onBack `null` quand l'écran sert de **barrière** (accès expiré) — cf. B2.
 *
 * L'écran rendait ce bouton inconditionnellement, et c'était le **seul focalisable**
 * lorsque la facturation ne renvoyait aucune offre : `▼ OK` ouvrait le catalogue complet,
 * sans aucune revérification ensuite. Le mobile avait reçu ce correctif (P9), pas la TV.
 *
 * Le retirer seul aurait laissé un écran **sans aucune cible** : le repli « Réessayer » /
 * « Restaurer mes achats » n'est donc pas un confort, c'est ce qui empêche de remplacer
 * une fuite par une impasse (§8.14). Un abonné dont le droit n'a pas été resynchronisé
 * (§32) doit pouvoir se débloquer sans repasser à la caisse.
 */
@Composable
fun TvPurchaseScreen(onBack: (() -> Unit)?, onSuccess: () -> Unit) {
    val vm: PurchaseViewModel = koinViewModel()
    val state    by vm.state.collectAsState()
    val products by vm.products.collectAsState()
    val activity = LocalContext.current as Activity

    val blocking = onBack == null
    val loading  = state is PurchaseScreenState.Loading
    val entryFocus = remember { FocusRequester() }

    LaunchedEffect(state) {
        if (state is PurchaseScreenState.PurchaseSuccess) onSuccess()
    }

    // Le focus d'arrivée va à l'ACTION, jamais à la sortie. Sur la barrière c'est vital :
    // c'est le seul moyen de manipuler l'écran à la télécommande.
    LaunchedEffect(products.isEmpty(), loading) {
        if (loading) return@LaunchedEffect
        withFrameNanos { }
        runCatching { entryFocus.requestFocus() }
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
                Text(stringResource(R.string.purchase_premium), color = TvTextPrimary, fontSize = 40.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(16.dp))
                Text(stringResource(R.string.purchase_pitch),
                    color = TvTextSub, fontSize = 16.sp, lineHeight = 24.sp)
                if (blocking) {
                    Spacer(Modifier.height(20.dp))
                    Text(stringResource(R.string.purchase_blocked_hint),
                        color = TvColorGold, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.height(32.dp))
                // Absent quand l'écran sert de barrière — cf. PurchaseScreen mobile (P9).
                // Et bouton, pas lien souligné : le soulignement est une convention web,
                // illisible à trois mètres (M4).
                onBack?.let { dismiss ->
                    TvSecondaryButton(
                        label   = stringResource(R.string.purchase_later),
                        onClick = dismiss,
                    )
                }
            }

            // Right — product cards
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                when {
                    loading -> CircularProgressIndicator(color = TvPurpleGlow)

                    // Repli obligatoire : sans lui, une barrière sans offre n'aurait plus
                    // aucun focalisable. Cf. TvPurchaseAccess.focusableCount.
                    products.isEmpty() -> {
                        // Toujours la cause typée : le champ `message` qui passait devant
                        // portait du français fabriqué dans `core` (#R9, §67).
                        val err = state as? PurchaseScreenState.PurchaseError
                        Text(
                            err?.reason?.let { stringResource(it.labelRes()) }
                                ?: stringResource(R.string.purchase_none),
                            color = TvTextSub, textAlign = TextAlign.Center,
                        )
                        Spacer(Modifier.height(8.dp))
                        TvSecondaryButton(
                            label     = stringResource(R.string.action_retry),
                            onClick   = { vm.loadProducts() },
                            emphasise = true,
                            modifier  = Modifier.focusRequester(entryFocus),
                        )
                        TvSecondaryButton(
                            label   = stringResource(R.string.action_restore),
                            onClick = { vm.restorePurchases() },
                        )
                    }

                    else -> products.forEachIndexed { index, product ->
                        TvPriceCard(
                            product   = product,
                            isLoading = state is PurchaseScreenState.Purchasing,
                            onSelect  = { vm.purchase(activity, product) },
                            modifier  = if (index == 0) Modifier.focusRequester(entryFocus) else Modifier,
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
                    Text(stringResource(R.string.purchase_processing), color = TvTextPrimary, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun TvPriceCard(
    product: ProductDetails,
    isLoading: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isLifetime = product.productId == BillingRepository.LIFETIME_ID
    val isYearly   = product.productId == BillingRepository.YEARLY_ID
    // B3 : cf. PurchaseScreen — un abonnement n'a pas d'oneTimePurchaseOfferDetails.
    val price = OfferPrice.formatted(
        oneTime = product.oneTimePurchaseOfferDetails?.formattedPrice,
        subscriptionPhases = product.subscriptionOfferDetails
            ?.firstOrNull()
            ?.pricingPhases
            ?.pricingPhaseList
            ?.map { it.formattedPrice }
            .orEmpty(),
    )
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
        modifier = modifier
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
            // ⚠️ ORDRE : `onFocusChanged` AVANT `focusable()`. Un
            // `FocusEventModifierNode` n'observe que les cibles de focus placées **après**
            // lui ; dans l'ordre inverse la callback n'est jamais appelée, `isFocused`
            // reste faux, et **aucune carte ne s'éclaire**. Quatrième occurrence du piège
            // du §49.2 — la même que `TvTrackRow`.
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
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
                        fontSize =  12.sp, fontWeight = FontWeight.Black)
                }
                Spacer(Modifier.height(8.dp))
            }
            Text(title, color = if (isLifetime) TvColorGold else Color.White,
                fontSize = 20.sp, fontWeight = FontWeight.Black)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(price,  color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(period, color = TvTextSub,   fontSize =  14.sp)
        }
        Spacer(Modifier.width(16.dp))
        Icon(Icons.Rounded.ChevronRight, null,
            tint = if (isLifetime) TvColorGold else TvTextPrimary.copy(0.3f))
    }
}


/**
 * Action secondaire de TV : un bouton à bordure, pas un lien souligné.
 *
 * Le soulignement et l'opacité 0,4 sont une convention **web** — 3,41 : 1 de contraste même
 * focalisé, illisible à trois mètres (M4). Sur le focus, le contenu passe en sombre sur
 * l'accent : 9,4 : 1 au lieu de 3,27 : 1 (G10).
 */
@Composable
private fun TvSecondaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    emphasise: Boolean = false,
) {
    var isFocused by remember { mutableStateOf(false) }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                when {
                    isFocused -> TvPurple
                    emphasise -> TvPurple.copy(alpha = 0.22f)
                    else      -> Color.Transparent
                }
            )
            .border(
                width = if (isFocused) 2.5.dp else 1.dp,
                color = if (isFocused) TvPurpleGlow else TvTextPrimary.copy(0.18f),
                shape = RoundedCornerShape(12.dp),
            )
            // Même piège d'ordre que TvPriceCard, et il coûtait plus cher ici : sur la
            // barrière d'accès expiré, ces deux boutons sont les **seuls** focalisables de
            // l'écran. Sans liseré, l'écran paraît mort — signalé à l'usage, « je ne peux
            // pas naviguer ». Le focus y était pourtant, invisible.
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp &&
                    (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onClick(); true
                } else false
            }
            .padding(horizontal = 24.dp, vertical = 13.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color      = if (isFocused) Color(0xFF12061F) else TvTextPrimary.copy(0.85f),
            fontSize   = 15.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}


/**
 * Traduit une cause d'échec de facturation en ressource locale.
 *
 * La table vit **dans l'UI** et non dans `core` : un module sans `Context` n'a pas à
 * décider d'une langue, et c'est précisément d'avoir voulu le faire que venaient les
 * libellés français en dur (§43).
 */
private fun PurchaseFailure.labelRes(): Int = when (this) {
    PurchaseFailure.OFFERS_UNAVAILABLE   -> R.string.purchase_err_offers
    PurchaseFailure.RESTORE_FAILED       -> R.string.purchase_err_restore
    PurchaseFailure.NOTHING_TO_RESTORE   -> R.string.purchase_err_nothing
    PurchaseFailure.BILLING_UNAVAILABLE  -> R.string.purchase_err_billing_unavailable
    PurchaseFailure.SERVICE_DISCONNECTED -> R.string.purchase_err_service_disconnected
    PurchaseFailure.SERVICE_UNAVAILABLE  -> R.string.purchase_err_service_unavailable
    PurchaseFailure.ITEM_UNAVAILABLE     -> R.string.purchase_err_item_unavailable
    PurchaseFailure.ITEM_ALREADY_OWNED   -> R.string.purchase_err_item_owned
    PurchaseFailure.DEVELOPER_ERROR      -> R.string.purchase_err_developer
    PurchaseFailure.OFFER_UNAVAILABLE    -> R.string.purchase_err_offer_missing
    PurchaseFailure.UNKNOWN              -> R.string.purchase_err_unknown
}
