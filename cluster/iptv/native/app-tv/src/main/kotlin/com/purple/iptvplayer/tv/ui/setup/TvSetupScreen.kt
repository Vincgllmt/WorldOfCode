package com.purple.iptvplayer.tv.ui.setup

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.purple.iptvplayer.core.data.AccessState
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import com.purple.iptvplayer.tv.ui.common.TvPremiumBadge
import com.purple.iptvplayer.core.viewmodel.SetupState
import com.purple.iptvplayer.core.viewmodel.SetupViewModel
import com.purple.iptvplayer.tv.BuildConfig
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.navigation.TvFieldKeys
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel
import androidx.compose.ui.res.pluralStringResource

@Composable
fun TvSetupScreen(onSuccess: () -> Unit) {
    val vm: SetupViewModel = koinViewModel()
    val trialVm: TrialViewModel = koinViewModel()
    val access by trialVm.accessState.collectAsState()
    val state by vm.state.collectAsState()

    var modeIndex  by remember { mutableIntStateOf(0) }
    // Pré-rempli depuis `purple.defaultM3u` (local.properties, non versionné) : saisir un
    // lien M3U complet à la télécommande est interminable. Vide si la propriété n'est pas
    // définie — donc rien de particulier pour une build faite ailleurs.
    var urlText    by remember { mutableStateOf(BuildConfig.DEFAULT_M3U) }
    var hostText   by remember { mutableStateOf("") }
    var userText   by remember { mutableStateOf("") }
    var passText   by remember { mutableStateOf("") }
    var passVisible by remember { mutableStateOf(false) }

    LaunchedEffect(state) {
        if (state is SetupState.Success) onSuccess()
    }

    Row(
        modifier = Modifier.fillMaxSize().background(TvBgHome),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // ── Left pane : branding ──────────────────────────────────────────────
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Image(
                painter = painterResource(R.drawable.ic_logo),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(140.dp),
            )

            Spacer(Modifier.height(24.dp))

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(TvPurple.copy(alpha = 0.12f))
                    .border(1.5.dp, TvPurple.copy(alpha = 0.55f), RoundedCornerShape(16.dp))
                    .padding(horizontal = 32.dp, vertical = 12.dp),
            ) {
                Text(
                    "PURPLE IPTV",
                    color = TvPurpleGlow,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 5.sp,
                )
            }

            Spacer(Modifier.height(20.dp))

            Text(
                text = stringResource(R.string.setup_subtitle),
                color = TvTextSub,
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp,
            )
        }

        // ── Right pane : form ─────────────────────────────────────────────────
        Column(
            modifier = Modifier
                .weight(1.3f)
                .fillMaxHeight()
                .background(TvBgCard)
                .padding(horizontal = 52.dp, vertical = 40.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            // Tab bar — 2 tabs only (no file picker on TV)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(TvBgHome)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                val tabs = listOf(
                    stringResource(R.string.tab_m3u),
                    stringResource(R.string.tab_credentials),
                )
                tabs.forEachIndexed { index, label ->
                    TvTabButton(
                        label    = label,
                        selected = modeIndex == index,
                        modifier = Modifier.weight(1f),
                        onClick  = { modeIndex = index; vm.resetState() },
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            // Fields
            when (modeIndex) {
                0 -> TvFormField(
                    value = urlText, onValueChange = { urlText = it },
                    label = stringResource(R.string.field_m3u_hint),
                    icon  = Icons.Rounded.Link,
                    imeAction = ImeAction.Done,
                    onDone = { vm.submitM3uUrl(urlText) },
                )
                1 -> {
                    TvFormField(
                        value = hostText, onValueChange = { hostText = it },
                        label = stringResource(R.string.field_server),
                        icon  = Icons.Rounded.Dns,
                    )
                    Spacer(Modifier.height(14.dp))
                    TvFormField(
                        value = userText, onValueChange = { userText = it },
                        label = stringResource(R.string.field_username),
                        icon  = Icons.Rounded.Person,
                    )
                    Spacer(Modifier.height(14.dp))
                    TvFormField(
                        value = passText, onValueChange = { passText = it },
                        label = stringResource(R.string.field_password),
                        icon  = Icons.Rounded.Lock,
                        visualTransformation = if (passVisible) VisualTransformation.None
                                               else PasswordVisualTransformation(),
                        trailingIcon = {
                            TvIconToggle(
                                icon = if (passVisible) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                                onClick = { passVisible = !passVisible },
                            )
                        },
                        imeAction = ImeAction.Done,
                        onDone = { vm.submitXtream(hostText, userText, passText) },
                    )
                }
            }

            // Error banner
            if (state is SetupState.Error) {
                Spacer(Modifier.height(14.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(TvColorError.copy(alpha = 0.12f))
                        .border(1.dp, TvColorError.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(Icons.Rounded.ErrorOutline, null, tint = TvColorError, modifier = Modifier.size(16.dp))
                    Text((state as SetupState.Error).message, color = TvColorError, fontSize =  14.sp)
                }
            }

            Spacer(Modifier.height(20.dp))

            // Trial info box
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(TvBgHome)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(Icons.Rounded.Info, null, tint = TvPurple,
                    modifier = Modifier.size(17.dp).padding(top = 1.dp))
                // UX-1 : cf. SetupScreen mobile — pas d'argumentaire d'essai pour qui a payé.
                when (val a = access) {
                    is AccessState.Pro -> TvPremiumBadge(
                        label = stringResource(R.string.premium_badge), fontSize = 20.sp)
                    is AccessState.Subscribed -> Column {
                        TvPremiumBadge(label = stringResource(R.string.premium_badge), fontSize = 20.sp)
                        Text(pluralStringResource(R.plurals.premium_days, a.daysLeft, a.daysLeft),
                            color = TvTextSub, fontSize = 12.sp)
                    }
                    else -> Text(stringResource(R.string.trial_info), color = TvTextSub, fontSize =  14.sp, lineHeight = 20.sp)
                }
            }

            Spacer(Modifier.height(28.dp))

            // Connect button — D-pad focusable via Material3 Button
            var btnFocused by remember { mutableStateOf(false) }
            Button(
                onClick = {
                    when (modeIndex) {
                        0 -> vm.submitM3uUrl(urlText)
                        1 -> vm.submitXtream(hostText, userText, passText)
                    }
                },
                enabled  = state !is SetupState.Loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp)
                    .onFocusChanged { btnFocused = it.isFocused }
                    .border(
                        width = if (btnFocused) 3.dp else 0.dp,
                        color = if (btnFocused) TvPurpleGlow else Color.Transparent,
                        shape = RoundedCornerShape(14.dp),
                    ),
                shape  = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (btnFocused) TvPurpleGlow else TvPurple,
                ),
            ) {
                if (state is SetupState.Loading) {
                    CircularProgressIndicator(Modifier.size(24.dp), color = Color.White, strokeWidth = 3.dp)
                } else {
                    Text(
                        stringResource(R.string.btn_connect),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.5.sp,
                    )
                }
            }
        }
    }
}

// ── Shared sub-composables ────────────────────────────────────────────────────

@Composable
private fun TvTabButton(label: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(
                when {
                    isFocused -> TvPurpleGlow.copy(alpha = 0.22f)
                    selected  -> TvPurple.copy(alpha = 0.25f)
                    else      -> Color.Transparent
                }
            )
            .border(
                width = when {
                    isFocused -> 2.5.dp
                    selected  -> 1.5.dp
                    else      -> 0.dp
                },
                color = when {
                    isFocused -> TvPurpleGlow
                    selected  -> TvPurple
                    else      -> Color.Transparent
                },
                shape = RoundedCornerShape(10.dp),
            )
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp &&
                    (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onClick(); true
                } else false
            }
            .padding(vertical = 11.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = when {
                isFocused -> Color.White
                selected  -> TvPurpleGlow
                else      -> TvTextSub
            },
            fontSize =  14.sp,
            fontWeight = if (selected || isFocused) FontWeight.ExtraBold else FontWeight.Medium,
        )
    }
}

/**
 * Champ de saisie utilisable **à la télécommande** — B1.
 *
 * Trois défauts se cumulaient dans la version précédente, un `OutlinedTextField` Material3
 * nu :
 *
 * 1. *Le champ était focalisable en permanence.* Le focus y entrait au simple passage, le
 *    `TextField` demandait l'IME, et le clavier virtuel Leanback avalait les quatre
 *    directions. Rien n'en sortait — mesuré : `▼ ×5` ⇒ focus inchangé cinq fois.
 * 2. *Même clavier fermé, le champ consommait les directions.* `BasicTextField` traite
 *    haut/bas comme un déplacement de curseur et **retourne consommé**, y compris sur une
 *    ligne unique. `moveFocus` n'était jamais appelé.
 * 3. *`OK` ne rouvrait pas le clavier.* Un `TextField` ouvre l'IME sur *acquisition* du
 *    focus, pas sur validation — or le champ l'avait déjà. Seul `KEYCODE_ENTER`, absent
 *    des vraies télécommandes, y parvenait.
 *
 * La solution est celle de `TvSearchBar` (§22, §26), dont l'audit confirme qu'elle tient :
 * `canFocus = editing`, conteneur `clickable` (qui traite nativement `DPAD_CENTER`), et
 * interception haut/bas déléguée à [TvFieldKeys]. S'y ajoute `ImeAction.Next` qui **avance
 * le focus** au lieu de compter sur la touche « suivant » du clavier virtuel — neuf appuis
 * mesurés pour passer un champ.
 */
@Composable
private fun TvFormField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: ImageVector,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null,
    imeAction: ImeAction = ImeAction.Next,
    onDone: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val focusManager = LocalFocusManager.current
    var isFocused by remember { mutableStateOf(false) }

    // Le champ n'entre dans le parcours du focus **qu'une fois activé** : c'est ce qui
    // empêche le clavier de s'ouvrir au simple passage.
    var editing by remember { mutableStateOf(false) }
    val fieldFocus = remember { FocusRequester() }

    LaunchedEffect(editing) {
        if (editing) {
            // Laisser la recomposition appliquer `canFocus = true` avant de réclamer le
            // focus, sinon la demande porte sur un nœud encore non focalisable.
            withFrameNanos { }
            runCatching { fieldFocus.requestFocus() }
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            // Interception AVANT le champ : lui laisser la touche revient à la perdre.
            // `moveFocus` renvoie `false` s'il n'y a rien dans cette direction — on laisse
            // alors passer plutôt que d'avaler la touche.
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                if (TvFieldKeys.closesEditing(event.key, editing)) {
                    editing = false
                    return@onPreviewKeyEvent true
                }
                val direction = TvFieldKeys.escapeDirectionFor(event.key)
                    ?: return@onPreviewKeyEvent false
                focusManager.moveFocus(direction)
            }
            .border(
                width = if (isFocused) 2.5.dp else 1.dp,
                color = if (isFocused) TvPurpleGlow else TvBorder,
                shape = RoundedCornerShape(14.dp),
            )
            .clip(RoundedCornerShape(14.dp))
            .background(if (isFocused) TvBgSurface else TvBgHome)
            .onFocusChanged { isFocused = it.hasFocus; if (!it.hasFocus) editing = false }
            // `clickable` rend focalisable ET traite `DPAD_CENTER` comme un clic : c'est
            // ce qui manquait. Ajouter `focusable()` en plus ferait deux nœuds concurrents
            // et la validation n'atteindrait pas l'`onClick` (piège relevé au §26).
            .clickable { editing = true }
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            icon, null,
            tint     = if (isFocused) TvPurpleGlow else TvPurple,
            modifier = Modifier.size(18.dp),
        )
        Box(modifier = Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(label, color = TvTextSub.copy(0.5f), fontSize = 14.sp)
            }
            BasicTextField(
                value                = value,
                onValueChange        = onValueChange,
                singleLine           = true,
                textStyle            = LocalTextStyle.current.copy(color = TvTextPrimary, fontSize = 15.sp),
                cursorBrush          = SolidColor(TvPurpleGlow),
                visualTransformation = visualTransformation,
                keyboardOptions      = KeyboardOptions(imeAction = imeAction, keyboardType = KeyboardType.Uri),
                // Le clavier virtuel TV facture neuf appuis pour atteindre sa touche
                // « suivant ». On avance le focus nous-mêmes.
                keyboardActions      = KeyboardActions(
                    onNext = { editing = false; focusManager.moveFocus(FocusDirection.Down) },
                    onDone = { editing = false; onDone?.invoke() },
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(fieldFocus)
                    .focusProperties { canFocus = editing },
            )
        }
        trailingIcon?.invoke()
    }
}

@Composable
private fun TvIconToggle(icon: ImageVector, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (isFocused) TvPurpleGlow.copy(0.30f) else Color.Transparent)
            .border(
                width = if (isFocused) 2.dp else 0.dp,
                color = if (isFocused) TvPurpleGlow else Color.Transparent,
                shape = RoundedCornerShape(8.dp),
            )
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp &&
                    (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onClick(); true
                } else false
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = if (isFocused) Color.White else TvTextSub, modifier = Modifier.size(20.dp))
    }
}
