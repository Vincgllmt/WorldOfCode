package com.purple.iptvplayer.mobile.ui.seriesdetail

import com.purple.iptvplayer.mobile.ui.common.toDisplayString
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.animation.animateContentSize
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.data.ProgressPolicy
import com.purple.iptvplayer.core.model.EpisodeTitle
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.model.Episode
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.DownloadViewModel
import com.purple.iptvplayer.R
import com.purple.iptvplayer.mobile.ui.cast.CastButton
import com.purple.iptvplayer.mobile.ui.common.requireActivityViewModelStoreOwner
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import org.koin.androidx.compose.koinViewModel

@Composable
fun SeriesDetailScreen(
    seriesId: Int,
    onPlayEpisode: (url: String, title: String, mediaId: String, cover: String) -> Unit,
    onBack: () -> Unit,
) {
    val vm:     ContentViewModel  = koinViewModel()
    val dlVm:   DownloadViewModel = koinViewModel()
    val castVm: CastViewModel     = koinViewModel()
    val playerVm: com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel(
        viewModelStoreOwner = requireActivityViewModelStoreOwner()
    )
    val detailState      by vm.seriesDetail.collectAsState()
    val downloads        by dlVm.downloads.collectAsState()
    val seriesWatchlist  by vm.seriesFavorites.collectAsState()

    LaunchedEffect(seriesId) { vm.loadSeriesDetail(seriesId) }
    DisposableEffect(Unit) { onDispose { vm.clearSeriesDetail() } }

    when (val s = detailState) {
        null, is ContentState.Loading -> Box(Modifier.fillMaxSize().background(BgHome), Alignment.Center) {
            CircularProgressIndicator(color = Purple)
        }
        is ContentState.Error -> Box(Modifier.fillMaxSize().background(BgHome), Alignment.Center) {
            Text(s.reason.toDisplayString(), color = ColorError)
        }
        is ContentState.Success -> {
            val d          = s.data
            val isInList   = seriesWatchlist.contains(seriesId.toString())
            val sortedSeasons = d.seasons.keys.sortedBy { it.toIntOrNull() ?: 0 }
            var selectedSeason by remember { mutableStateOf(sortedSeasons.firstOrNull()) }

            val seasonRowState = androidx.compose.foundation.lazy.rememberLazyListState()

            LaunchedEffect(selectedSeason) {
                val idx = sortedSeasons.indexOf(selectedSeason)
                if (idx >= 0) {
                    seasonRowState.animateScrollToItem(idx)
                }
            }

            LazyColumn(modifier = Modifier.fillMaxSize().background(BgHome)) {
                // Hero
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(260.dp)) {
                        if (!d.cover.isNullOrEmpty()) {
                            // Image paysage en priorité, cf. la fiche film : le poster
                            // 2:3 étiré en bandeau était agrandi d'environ 1,8×.
                            AsyncImage(
                                model = d.backdrop?.takeIf { it.isNotBlank() } ?: d.cover,
                                contentDescription = d.name,
                                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize(),
                            )
                        }
                        Box(modifier = Modifier.fillMaxSize().background(
                            Brush.verticalGradient(listOf(Color.Transparent, BgHome), startY = 120f)
                        ))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(top = 8.dp)
                                .align(Alignment.TopStart),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            IconButton(onClick = onBack, modifier = Modifier.padding(8.dp)) {
                                Icon(Icons.Rounded.ArrowBack, null, tint = Color.White)
                            }
                            CastButton(modifier = Modifier.size(40.dp).padding(end = 8.dp), tint = Color.White)
                        }
                    }
                }

                item {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(d.name, color = TextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Black)
                        d.plot?.let { plot ->
                            Spacer(Modifier.height(8.dp))
                            // Le synopsis était coupé à trois lignes sans aucun moyen de
                            // lire la suite. Dépliable plutôt que défilant : un défilement
                            // imbriqué dans une page déjà défilante se manipule mal au
                            // doigt. Le lien n'apparaît que si le texte est réellement
                            // tronqué — mesuré au rendu, pas supposé d'après sa longueur.
                            var plotExpanded by rememberSaveable(plot) { mutableStateOf(false) }
                            var plotOverflows by remember(plot) { mutableStateOf(false) }
                            Text(
                                plot,
                                color      = TextSub,
                                fontSize   = 13.sp,
                                maxLines   = if (plotExpanded) Int.MAX_VALUE else 3,
                                overflow   = TextOverflow.Ellipsis,
                                onTextLayout = { if (!plotExpanded) plotOverflows = it.hasVisualOverflow },
                                modifier   = Modifier.animateContentSize(),
                            )
                            if (plotOverflows || plotExpanded) {
                                Text(
                                    stringResource(
                                        if (plotExpanded) R.string.action_show_less
                                        else R.string.action_show_more
                                    ),
                                    color      = PurpleGlow,
                                    fontSize   = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier   = Modifier
                                        .padding(top = 4.dp)
                                        .clickable { plotExpanded = !plotExpanded },
                                )
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedButton(
                            onClick  = { vm.toggleSeriesFavorite(seriesId.toString()) },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape    = RoundedCornerShape(12.dp),
                            border   = BorderStroke(1.dp, if (isInList) PurpleGlow else BorderPurple.copy(alpha = 0.5f)),
                            colors   = ButtonDefaults.outlinedButtonColors(
                                contentColor = if (isInList) PurpleGlow else TextSub,
                            ),
                        ) {
                            Icon(
                                if (isInList) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                                null, modifier = Modifier.size(20.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                if (isInList) "✓ Ma liste" else "+ Ma liste",
                                fontSize = 14.sp, fontWeight = FontWeight.Medium,
                            )
                        }
                    }
                }

                // Season tabs + download season button
                if (sortedSeasons.isNotEmpty()) {
                    item {
                        Column {
                            LazyRow(
                                state = seasonRowState,
                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                items(sortedSeasons) { season ->
                                    val active = season == selectedSeason
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(20.dp))
                                            .background(if (active) Purple else BgCard)
                                            .clickable { selectedSeason = season }
                                            .padding(horizontal = 16.dp, vertical = 8.dp)
                                    ) {
                                        Text("Season $season", color = if (active) Color.White else TextSub,
                                            fontSize = 13.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium)
                                    }
                                }
                            }

                            // Download / cancel season buttons
                            val currentEps = d.seasons[selectedSeason] ?: emptyList()
                            val pendingCount = currentEps.count { ep -> downloads.none { it.id == "ep_${seriesId}_${ep.id}" && it.status == DownloadStatus.COMPLETED } }
                            val inProgressIds = currentEps.mapNotNull { ep ->
                                val dlId = "ep_${seriesId}_${ep.id}"
                                downloads.find { it.id == dlId && (it.status == DownloadStatus.DOWNLOADING || it.status == DownloadStatus.QUEUED) }?.id
                            }
                            if (pendingCount > 0 || inProgressIds.isNotEmpty()) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    if (pendingCount > 0) {
                                        Button(
                                            onClick = {
                                                currentEps.forEach { ep ->
                                                    val dlId = "ep_${seriesId}_${ep.id}"
                                                    if (downloads.none { it.id == dlId }) {
                                                        dlVm.enqueue(DownloadItem(
                                                            id         = dlId,
                                                            type       = DownloadType.EPISODE,
                                                            title      = d.name,
                                                            subtitle   = "S${ep.season} E${ep.episodeNum} · ${ep.title}",
                                                            url        = ep.url,
                                                            cover      = ep.cover ?: d.cover,
                                                            seriesId   = seriesId,
                                                            seriesName = d.name,
                                                            season     = ep.season,
                                                            episodeNum = ep.episodeNum,
                                                        ))
                                                    }
                                                }
                                            },
                                            modifier = Modifier.weight(1f),
                                            colors   = ButtonDefaults.buttonColors(containerColor = BgCard),
                                            shape    = RoundedCornerShape(12.dp),
                                            border   = BorderStroke(1.dp, Purple.copy(alpha = 0.5f)),
                                        ) {
                                            Icon(Icons.Rounded.Download, null, tint = PurpleGlow, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(stringResource(R.string.btn_download_season), color = PurpleGlow, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    if (inProgressIds.isNotEmpty()) {
                                        Button(
                                            onClick  = { dlVm.removeAll(inProgressIds) },
                                            modifier = Modifier.weight(1f),
                                            colors   = ButtonDefaults.buttonColors(containerColor = BgCard),
                                            shape    = RoundedCornerShape(12.dp),
                                            border   = BorderStroke(1.dp, ColorError.copy(alpha = 0.5f)),
                                        ) {
                                            Icon(Icons.Rounded.Close, null, tint = ColorError, modifier = Modifier.size(16.dp))
                                            Spacer(Modifier.width(6.dp))
                                            // Le libellé disait « Annuler la saison » même quand un
                                            // seul épisode était en cours : ce bouton annule ce qui
                                            // tourne, pas une saison entière.
                                            Text(
                                                pluralStringResource(
                                                    R.plurals.btn_cancel_downloads,
                                                    inProgressIds.size,
                                                    inProgressIds.size,
                                                ),
                                                color = ColorError, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Episodes of selected season
                item {
                    var dragOffset by remember { mutableStateOf(0f) }
                    AnimatedContent(
                        targetState = selectedSeason,
                        transitionSpec = {
                            val initialIdx = sortedSeasons.indexOf(initialState)
                            val targetIdx = sortedSeasons.indexOf(targetState)
                            if (targetIdx > initialIdx) {
                                slideInHorizontally { width -> width } togetherWith slideOutHorizontally { width -> -width }
                            } else {
                                slideInHorizontally { width -> -width } togetherWith slideOutHorizontally { width -> width }
                            }
                        },
                        label = "season_transition"
                    ) { targetSeason ->
                        Column(modifier = Modifier.pointerInput(Unit) {
                            detectHorizontalDragGestures(
                                onDragEnd = {
                                    if (dragOffset > 50f) {
                                        val idx = sortedSeasons.indexOf(targetSeason)
                                        if (idx > 0) selectedSeason = sortedSeasons[idx - 1]
                                    } else if (dragOffset < -50f) {
                                        val idx = sortedSeasons.indexOf(targetSeason)
                                        if (idx < sortedSeasons.size - 1) selectedSeason = sortedSeasons[idx + 1]
                                    }
                                    dragOffset = 0f
                                }
                            ) { change, dragAmount ->
                                change.consume()
                                dragOffset += dragAmount
                            }
                        }) {
                            val episodes = d.seasons[targetSeason] ?: emptyList()
                            episodes.forEach { ep ->
                                val dlId = "ep_${seriesId}_${ep.id}"
                                val dlItem = downloads.find { it.id == dlId }
                                EpisodeRow(
                                    seriesId = seriesId,
                                    seriesName = d.name,
                                    seriesCover = d.cover,
                                    episode  = ep,
                                    dlItem   = dlItem,
                                    onClick  = {
                                        playerVm.playWithEpisodes(episodes, episodes.indexOf(ep), seriesId, d.cover)
                                        onPlayEpisode("", "", "", "")
                                    },
                                    onDownload = {
                                        dlVm.enqueue(DownloadItem(
                                            id         = dlId,
                                            type       = DownloadType.EPISODE,
                                            title      = d.name,
                                            subtitle   = "S${ep.season} E${ep.episodeNum} · ${ep.title}",
                                            url        = ep.url,
                                            cover      = d.cover,
                                            seriesId   = seriesId,
                                            seriesName = d.name,
                                            season     = ep.season,
                                            episodeNum = ep.episodeNum,
                                        ))
                                    },
                                    onCancelDownload = { dlVm.remove(dlId) },
                                    onRetryDownload  = { dlVm.retry(dlId) },
                                    onPlayLocal = {
                                        dlItem?.localPath?.let {
                                            // #98 — **pas** de `playWithEpisodes` ici. Il amorçait
                                            // `playerService.playPlaylist` sur les URL **distantes**
                                            // avant qu'on ne bascule sur le fichier local : deux
                                            // lectures pour une demande, et hors ligne — le cas
                                            // d'usage même du téléchargement — la première part en
                                            // erreur avant que la seconde ne rattrape.
                                            //
                                            // Le contexte d'épisodes qu'il posait ne survivait de
                                            // toute façon pas : `playMedia` remet `episodes` à vide
                                            // et `episodesSeriesId` à `null` (PlayerViewModel:66-67).
                                            // L'appel n'avait donc aucun effet utile — seulement
                                            // l'effet néfaste.
                                            onPlayEpisode("file://$it", ep.title, EpisodeTitle.progressId(seriesId, ep.id), d.cover ?: "")
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

@Composable
private fun EpisodeRow(
    seriesId:        Int,
    seriesName:      String,
    seriesCover:     String?,
    episode:         Episode,
    dlItem:          DownloadItem?,
    onClick:         () -> Unit,
    onDownload:      () -> Unit,
    onCancelDownload: () -> Unit,
    onRetryDownload: () -> Unit,
    onPlayLocal:     () -> Unit,
) {
    val progressRepo: com.purple.iptvplayer.core.data.ProgressRepository = org.koin.compose.koinInject()
    var watchedProgress by remember(episode.id) { mutableStateOf(0L) }
    
    LaunchedEffect(episode.id) {
        watchedProgress = progressRepo.getProgress(EpisodeTitle.progressId(seriesId, episode.id))
    }

    val totalDurationMs = remember(episode.duration) { episode.duration.toMillis() }
    // Même règle de « vu jusqu'au bout » que « Reprendre la lecture » et que la fiche
    // TV : elle vit dans core, elle n'est plus recopiée ici (#43, §8.2).
    val isWatched = remember(watchedProgress, totalDurationMs) {
        ProgressPolicy.isComplete(watchedProgress, totalDurationMs)
    }
    val isPartiallyWatched = !isWatched && watchedProgress > 0L && totalDurationMs > 0L

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onClick() }
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Thumbnail
            val coverUrl = episode.cover?.takeIf { it.isNotEmpty() } ?: seriesCover
            Box(modifier = Modifier.width(100.dp).height(60.dp)) {
                if (!coverUrl.isNullOrEmpty()) {
                    AsyncImage(model = coverUrl, contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp)))
                } else {
                    Box(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp)).background(BgCard),
                        contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.PlayCircle, null, tint = TextPrimary.copy(0.3f), modifier = Modifier.size(28.dp))
                    }
                }
                // Un épisode vu se signale par une pastille de validation, pas par un
                // titre barré : barrer se lit « annulé », pas « déjà regardé ».
                if (isWatched) {
                    Box(
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp))
                            .background(Color.Black.copy(alpha = 0.55f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            modifier = Modifier.size(26.dp).clip(CircleShape).background(Purple),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Rounded.Check, null, tint = Color.White,
                                modifier = Modifier.size(17.dp))
                        }
                    }
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                val textColor = if (isWatched) TextSub else TextPrimary
                // Le fournisseur préfixe le nom de la série à chaque titre d'épisode ;
                // répété sur toute une saison, le vrai titre se noyait en fin de ligne.
                Text("E${episode.episodeNum} · ${EpisodeTitle.stripSeriesName(episode.title, seriesName)}",
                    color = textColor, fontSize = 14.sp,
                    fontWeight = FontWeight.Medium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                episode.duration?.let {
                    Spacer(Modifier.height(2.dp))
                    Text(it, color = TextSub, fontSize = 12.sp)
                }
                // Download progress inline
                if (dlItem?.status == DownloadStatus.DOWNLOADING) {
                    Spacer(Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { dlItem.progress / 100f },
                        modifier = Modifier.fillMaxWidth().height(2.dp).clip(RoundedCornerShape(1.dp)),
                        color = PurpleGlow, trackColor = BgCard,
                    )
                }
            }

            Spacer(Modifier.width(4.dp))

            // Download action icon
            EpisodeDownloadIcon(dlItem = dlItem, onDownload = onDownload,
                onCancel = onCancelDownload, onRetry = onRetryDownload, onPlayLocal = onPlayLocal)

            Spacer(Modifier.width(4.dp))

            Icon(Icons.Rounded.PlayArrow, null, tint = Purple, modifier = Modifier.size(28.dp))
        }

        if (isPartiallyWatched) {
            LinearProgressIndicator(
                progress = { (watchedProgress.toFloat() / totalDurationMs).coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.dp)
                    .padding(horizontal = 16.dp),
                color = Purple,
                trackColor = BorderPurple.copy(alpha = 0.3f),
            )
        }

        HorizontalDivider(color = BorderPurple.copy(alpha = 0.4f), thickness = 0.5.dp,
            modifier = Modifier.padding(horizontal = 16.dp))
    }
}

@Composable
private fun EpisodeDownloadIcon(
    dlItem:      DownloadItem?,
    onDownload:  () -> Unit,
    onCancel:    () -> Unit,
    onRetry:     () -> Unit,
    onPlayLocal: () -> Unit,
) {
    when (dlItem?.status) {
        null -> IconButton(onClick = onDownload, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Download, null, tint = TextSub.copy(0.5f), modifier = Modifier.size(20.dp))
        }
        DownloadStatus.QUEUED -> IconButton(onClick = onCancel, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Schedule, null, tint = TextSub.copy(0.6f), modifier = Modifier.size(20.dp))
        }
        DownloadStatus.DOWNLOADING -> IconButton(onClick = onCancel, modifier = Modifier.size(36.dp)) {
            CircularProgressIndicator(
                progress = { dlItem.progress / 100f },
                modifier = Modifier.size(20.dp),
                color = PurpleGlow, trackColor = BgCard, strokeWidth = 2.dp,
            )
        }
        DownloadStatus.COMPLETED -> IconButton(onClick = onPlayLocal, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(20.dp))
        }
        DownloadStatus.FAILED -> IconButton(onClick = onRetry, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.ErrorOutline, null, tint = ColorError, modifier = Modifier.size(20.dp))
        }
    }
}

private fun String?.toMillis(): Long {
    if (this == null) return 0L
    val parts = this.split(":").mapNotNull { it.trim().toLongOrNull() }
    return when (parts.size) {
        3 -> (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000
        2 -> (parts[0] * 60 + parts[1]) * 1000
        1 -> parts[0] * 1000
        else -> 0L
    }
}
