package com.purple.iptvplayer.mobile.ui.setup

import android.app.Activity
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.purple.iptvplayer.core.viewmodel.SetupState
import com.purple.iptvplayer.core.data.AccessState
import com.purple.iptvplayer.core.viewmodel.SetupViewModel
import com.purple.iptvplayer.core.viewmodel.TrialViewModel
import com.purple.iptvplayer.mobile.ui.common.PremiumBadge
import com.purple.iptvplayer.R
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.mobile.util.LocaleHelper
import org.koin.androidx.compose.koinViewModel
import androidx.compose.ui.res.pluralStringResource

@Composable
fun SetupScreen(onSuccess: () -> Unit) {
    val vm: SetupViewModel = koinViewModel()
    val trialVm: TrialViewModel = koinViewModel()
    val access by trialVm.accessState.collectAsState()
    val state by vm.state.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity

    var modeIndex    by remember { mutableIntStateOf(0) }
    var urlText      by remember { mutableStateOf("") }
    var hostText     by remember { mutableStateOf("") }
    var userText     by remember { mutableStateOf("") }
    var passText     by remember { mutableStateOf("") }
    var passVisible  by remember { mutableStateOf(false) }
    var selectedFile by remember { mutableStateOf<String?>(null) }
    var currentLang  by remember { mutableStateOf(LocaleHelper.getLanguage(context)) }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.path?.let { selectedFile = it }
    }

    LaunchedEffect(state) {
        if (state is SetupState.Success) onSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgHome)
            .systemBarsPadding(),
    ) {
        // Scrollable content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(72.dp))

            // Logo
            Image(
                painter = painterResource(R.drawable.ic_logo),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(130.dp),
            )

            Spacer(Modifier.height(20.dp))

            // "PURPLE IPTV" badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(Purple.copy(alpha = 0.12f))
                    .border(1.5.dp, Purple.copy(alpha = 0.55f), RoundedCornerShape(14.dp))
                    .padding(horizontal = 28.dp, vertical = 10.dp),
            ) {
                Text("PURPLE IPTV", color = PurpleGlow, fontSize = 18.sp,
                    fontWeight = FontWeight.Black, letterSpacing = 4.sp)
            }

            Spacer(Modifier.height(16.dp))

            Text(
                text = stringResource(R.string.setup_subtitle),
                color = TextSub,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp,
            )

            Spacer(Modifier.height(28.dp))

            // Tab bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(BgCard)
                    .padding(4.dp),
            ) {
                val tabs = listOf(
                    stringResource(R.string.tab_m3u),
                    stringResource(R.string.tab_credentials),
                    stringResource(R.string.tab_file),
                )
                tabs.forEachIndexed { index, label ->
                    val active = modeIndex == index
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .then(
                                if (active) Modifier.border(1.5.dp, Purple, RoundedCornerShape(12.dp))
                                else Modifier
                            )
                            .clickable { modeIndex = index; vm.resetState() }
                            .padding(vertical = 11.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = label,
                            color = if (active) PurpleGlow else TextSub,
                            fontSize = 12.sp,
                            fontWeight = if (active) FontWeight.ExtraBold else FontWeight.Medium,
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Fields
            when (modeIndex) {
                0 -> SetupField(
                    value = urlText, onValueChange = { urlText = it },
                    hint = stringResource(R.string.field_m3u_hint),
                    icon = Icons.Rounded.Link,
                    imeAction = ImeAction.Done,
                    onDone = { vm.submitM3uUrl(urlText) },
                )
                1 -> {
                    SetupField(value = hostText, onValueChange = { hostText = it },
                        hint = stringResource(R.string.field_server), icon = Icons.Rounded.Dns)
                    Spacer(Modifier.height(10.dp))
                    SetupField(value = userText, onValueChange = { userText = it },
                        hint = stringResource(R.string.field_username), icon = Icons.Rounded.Person)
                    Spacer(Modifier.height(10.dp))
                    SetupField(
                        value = passText, onValueChange = { passText = it },
                        hint = stringResource(R.string.field_password), icon = Icons.Rounded.Lock,
                        visualTransformation = if (passVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            Icon(
                                imageVector = if (passVisible) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                                contentDescription = null,
                                tint = TextSub,
                                modifier = Modifier.size(22.dp).clickable { passVisible = !passVisible },
                            )
                        },
                        imeAction = ImeAction.Done,
                        onDone = { vm.submitXtream(hostText, userText, passText) },
                    )
                }
                2 -> FilePickerRow(
                    selectedPath = selectedFile,
                    localLabel   = stringResource(R.string.file_local),
                    pathHint     = stringResource(R.string.file_path_hint),
                    onPick       = { filePicker.launch("*/*") },
                )
            }

            // Error
            if (state is SetupState.Error) {
                Spacer(Modifier.height(12.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(ColorError.copy(alpha = 0.12f))
                        .border(1.dp, ColorError.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(Icons.Rounded.ErrorOutline, null, tint = ColorError, modifier = Modifier.size(18.dp))
                    Text((state as SetupState.Error).message, color = ColorError, fontSize = 13.sp, lineHeight = 19.sp)
                }
            }

            Spacer(Modifier.height(12.dp))

            // Trial info
            // UX-1 : ne pas vendre un essai gratuit à quelqu'un qui a déjà payé.
            // Le texte d'essai n'a de sens que pendant l'essai ; un abonné voit son
            // statut, avec son échéance, et un achat définitif n'a rien à décompter.
            when (val a = access) {
                is AccessState.Pro -> PremiumBadge(
                    label = stringResource(R.string.premium_badge),
                    subtitle = stringResource(R.string.premium_lifetime),
                    modifier = Modifier.fillMaxWidth(),
                )
                is AccessState.Subscribed -> PremiumBadge(
                    label = stringResource(R.string.premium_badge),
                    subtitle = pluralStringResource(R.plurals.premium_days, a.daysLeft, a.daysLeft),
                    modifier = Modifier.fillMaxWidth(),
                )
                // Essai en cours, expiré, ou état pas encore résolu : l'argument
                // commercial reste pertinent, c'est le cas d'un nouvel utilisateur.
                else -> Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(BgCard)
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(Icons.Rounded.Info, null, tint = Purple,
                        modifier = Modifier.size(18.dp).padding(top = 1.dp))
                    Text(stringResource(R.string.trial_info), color = TextSub, fontSize = 13.sp, lineHeight = 20.sp)
                }
            }

            Spacer(Modifier.height(24.dp))

            // Connect button
            val btnBrush: Brush = if (state is SetupState.Loading)
                SolidColor(Purple.copy(alpha = 0.5f))
            else
                Brush.horizontalGradient(listOf(Purple, Color(0xFFBB55FF)))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(btnBrush)
                    .clickable(enabled = state !is SetupState.Loading) {
                        when (modeIndex) {
                            0 -> vm.submitM3uUrl(urlText)
                            1 -> vm.submitXtream(hostText, userText, passText)
                            2 -> selectedFile?.let { vm.submitLocalFile(it) }
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                if (state is SetupState.Loading) {
                    CircularProgressIndicator(Modifier.size(26.dp), color = Color.White, strokeWidth = 3.dp)
                } else {
                    Text(
                        stringResource(R.string.btn_connect),
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.5.sp,
                    )
                }
            }

            Spacer(Modifier.height(32.dp))
        }

        // FR / EN switcher — top right, drawn after Column so it sits above it
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 16.dp, end = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf("fr", "en").forEach { lang ->
                val active = currentLang == lang
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (active) Purple else BgCard)
                        .clickable {
                            currentLang = lang
                            LocaleHelper.setLocale(context, lang)
                            activity?.recreate()
                        }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = lang.uppercase(),
                        color = TextPrimary,
                        fontSize = 13.sp,
                        fontWeight = if (active) FontWeight.ExtraBold else FontWeight.Medium,
                    )
                }
            }
        }
    }
}

@Composable
private fun SetupField(
    value: String,
    onValueChange: (String) -> Unit,
    hint: String,
    icon: ImageVector,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null,
    imeAction: ImeAction = ImeAction.Next,
    onDone: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(BgCard)
            .padding(horizontal = 16.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Purple, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            visualTransformation = visualTransformation,
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = imeAction, keyboardType = KeyboardType.Uri),
            keyboardActions = KeyboardActions(onDone = { onDone?.invoke() }),
            textStyle = TextStyle(color = TextPrimary, fontSize = 14.sp),
            cursorBrush = SolidColor(Purple),
            modifier = Modifier.weight(1f).padding(vertical = 14.dp),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(hint, color = TextSub.copy(alpha = 0.45f), fontSize = 14.sp)
                inner()
            },
        )
        if (trailingIcon != null) {
            Spacer(Modifier.width(8.dp))
            trailingIcon()
        }
    }
}

@Composable
private fun FilePickerRow(
    selectedPath: String?,
    localLabel: String,
    pathHint: String,
    onPick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(BgCard)
            .clickable { onPick() }
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(Icons.Rounded.AttachFile, null, tint = Purple, modifier = Modifier.size(20.dp))
        Column(Modifier.weight(1f)) {
            Text(localLabel, color = TextSub, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(3.dp))
            Text(
                text = selectedPath?.substringAfterLast('/') ?: pathHint,
                color = if (selectedPath != null) TextPrimary else TextSub.copy(alpha = 0.35f),
                fontSize = if (selectedPath != null) 14.sp else 12.sp,
                fontWeight = if (selectedPath != null) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
            )
        }
        if (selectedPath != null) {
            Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(20.dp))
        }
    }
}
