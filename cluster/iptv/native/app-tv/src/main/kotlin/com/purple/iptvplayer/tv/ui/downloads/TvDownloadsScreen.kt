package com.purple.iptvplayer.tv.ui.downloads

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.viewmodel.DownloadViewModel
import com.purple.iptvplayer.tv.R
import com.purple.iptvplayer.tv.ui.theme.*
import org.koin.androidx.compose.koinViewModel

@Composable
fun TvDownloadsScreen(onPlay: (url: String, title: String) -> Unit) {
    val vm: DownloadViewModel = koinViewModel()
    val downloads by vm.downloads.collectAsState()

    val activeItem   = downloads.firstOrNull { it.status == DownloadStatus.DOWNLOADING }
    val queuedItems  = downloads.filter { it.status == DownloadStatus.QUEUED }
    val failedItems  = downloads.filter { it.status == DownloadStatus.FAILED }
    val completed    = downloads.filter { it.status == DownloadStatus.COMPLETED }
    val completedMovies  = completed.filter { it.type == DownloadType.MOVIE }
    val seriesGroups = completed
        .filter { it.type == DownloadType.EPISODE }
        .groupBy { it.seriesId ?: it.title }
        .values
        .map { eps -> eps.sortedWith(compareBy({ it.season }, { it.episodeNum })) }
        .sortedBy { it.firstOrNull()?.seriesName ?: it.firstOrNull()?.title ?: "" }

    val isEmpty = activeItem == null && queuedItems.isEmpty() && failedItems.isEmpty() && completed.isEmpty()
    var pendingDelete by remember { mutableStateOf<DownloadItem?>(null) }

    Column(modifier = Modifier.fillMaxSize().background(TvBgHome)) {
        Text(
            stringResource(R.string.nav_downloads),
            color = TvTextPrimary, fontSize = 22.sp, fontWeight = FontWeight.Black,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 20.dp),
        )

        if (isEmpty) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Rounded.Download, null, tint = TvTextSub.copy(0.25f),
                        modifier = Modifier.size(80.dp))
                    Spacer(Modifier.height(24.dp))
                    Text(stringResource(R.string.downloads_empty),
                        color = TvTextPrimary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(10.dp))
                    Text(stringResource(R.string.downloads_empty_sub),
                        color = TvTextSub, fontSize = 15.sp, textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 64.dp))
                }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Active
                if (activeItem != null) {
                    item { TvSectionHeader(stringResource(R.string.downloads_section_active)) }
                    item { TvActiveDownloadRow(activeItem, onCancel = { vm.remove(activeItem.id) }) }
                }

                // Queue
                if (queuedItems.isNotEmpty()) {
                    item {
                        TvSectionHeader(
                            title       = stringResource(R.string.downloads_section_queue),
                            actionLabel = stringResource(R.string.btn_cancel_all),
                            onAction    = { vm.removeAll(queuedItems.map { it.id }) },
                        )
                    }
                    items(queuedItems, key = { it.id }) { item ->
                        TvQueuedRow(item, onCancel = { vm.remove(item.id) })
                    }
                }

                // Failed
                if (failedItems.isNotEmpty()) {
                    item { TvSectionHeader(stringResource(R.string.download_failed)) }
                    items(failedItems, key = { it.id }) { item ->
                        TvFailedRow(item, onRetry = { vm.retry(item.id) }, onDelete = { pendingDelete = item })
                    }
                }

                // Completed movies
                if (completedMovies.isNotEmpty()) {
                    item { TvSectionHeader(stringResource(R.string.downloads_section_completed)) }
                    items(completedMovies, key = { it.id }) { item ->
                        TvCompletedRow(
                            item     = item,
                            onPlay   = { onPlay(item.localPath?.let { "file://$it" } ?: item.url, item.title) },
                            onDelete = { pendingDelete = item },
                        )
                    }
                }

                // Completed series
                seriesGroups.forEach { eps ->
                    item(key = "series_grp_${eps.first().seriesId}") {
                        TvSeriesGroupRow(
                            episodes = eps,
                            onPlay   = { ep -> onPlay(ep.localPath?.let { "file://$it" } ?: ep.url, ep.title) },
                            onDelete = { ep -> pendingDelete = ep },
                        )
                    }
                }
            }
        }
    }

    pendingDelete?.let { item ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text(stringResource(R.string.delete_confirm_title), color = TvTextPrimary) },
            text  = { Text(stringResource(R.string.delete_confirm_text, item.title), color = TvTextSub) },
            confirmButton = {
                TextButton(onClick = { vm.remove(item.id); pendingDelete = null }) {
                    Text(stringResource(R.string.btn_confirm_delete), color = TvColorError)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) {
                    Text(stringResource(R.string.btn_cancel), color = TvTextSub)
                }
            },
            containerColor = TvBgCard,
        )
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

@Composable
private fun TvSectionHeader(title: String, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
    Row(
        modifier              = Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment     = Alignment.CenterVertically,
    ) {
        Text(title.uppercase(), color = TvPurpleGlow, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
        if (actionLabel != null && onAction != null) {
            TvFocusableButton(label = actionLabel, icon = Icons.Rounded.DeleteSweep, color = TvColorError, onClick = onAction)
        }
    }
}

@Composable
private fun TvDownloadCover(url: String?) {
    Box(
        modifier = Modifier
            .size(width = 72.dp, height = 100.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(TvBgSurface),
    ) {
        if (!url.isNullOrEmpty()) {
            AsyncImage(model = url, contentDescription = null,
                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Icon(Icons.Rounded.Movie, null, tint = TvTextSub.copy(0.3f),
                modifier = Modifier.align(Alignment.Center).size(28.dp))
        }
    }
}

@Composable
private fun TvActiveDownloadRow(item: DownloadItem, onCancel: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(TvBgCard)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TvDownloadCover(item.cover)
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TvTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let { Text(it, color = TvTextSub, fontSize = 13.sp, maxLines = 1) }
            Spacer(Modifier.height(10.dp))
            LinearProgressIndicator(
                progress = { item.progress / 100f },
                modifier = Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)),
                color = TvPurpleGlow, trackColor = TvBgSurface,
            )
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(item.title, color = TvPurpleGlow, fontSize = 12.sp)
                Text("${item.progress}%", color = TvTextSub, fontSize = 12.sp)
            }
        }
        Spacer(Modifier.width(12.dp))
        TvFocusableButton(
            label = stringResource(R.string.download_cancel),
            icon  = Icons.Rounded.Close,
            color = TvColorError,
            onClick = onCancel,
        )
    }
}

@Composable
private fun TvQueuedRow(item: DownloadItem, onCancel: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(TvBgCard)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TvDownloadCover(item.cover)
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TvTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let { Text(it, color = TvTextSub, fontSize = 13.sp, maxLines = 1) }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Rounded.Schedule, null, tint = TvTextSub.copy(0.6f), modifier = Modifier.size(14.dp))
                Text(stringResource(R.string.download_queued), color = TvTextSub, fontSize = 13.sp)
            }
        }
        TvFocusableButton(
            label = stringResource(R.string.download_cancel),
            icon  = Icons.Rounded.Close,
            color = TvColorError,
            onClick = onCancel,
        )
    }
}

@Composable
private fun TvFailedRow(item: DownloadItem, onRetry: () -> Unit, onDelete: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(TvBgCard)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TvDownloadCover(item.cover)
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TvTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let { Text(it, color = TvTextSub, fontSize = 13.sp, maxLines = 1) }
            Text(stringResource(R.string.download_failed), color = TvColorError, fontSize = 13.sp)
        }
        TvFocusableButton(label = stringResource(R.string.btn_retry), icon = Icons.Rounded.Refresh,
            color = TvPurpleGlow, onClick = onRetry)
        Spacer(Modifier.width(8.dp))
        TvFocusableButton(label = stringResource(R.string.btn_delete), icon = Icons.Rounded.Delete,
            color = TvTextSub, onClick = onDelete)
    }
}

@Composable
private fun TvCompletedRow(item: DownloadItem, onPlay: () -> Unit, onDelete: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (isFocused) TvPurple.copy(0.2f) else TvBgCard)
            .border(if (isFocused) 2.dp else 0.dp, if (isFocused) TvPurpleGlow else Color.Transparent, RoundedCornerShape(12.dp))
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onPlay(); true
                } else false
            }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TvDownloadCover(item.cover)
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = if (isFocused) Color.White else TvTextPrimary,
                fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let { Text(it, color = TvTextSub, fontSize = 13.sp, maxLines = 1) }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(14.dp))
                Text(stringResource(R.string.download_done), color = Color(0xFF4CAF50), fontSize = 13.sp)
            }
        }
        TvFocusableButton(label = stringResource(R.string.btn_play), icon = Icons.Rounded.PlayCircle,
            color = TvPurple, onClick = onPlay)
        Spacer(Modifier.width(8.dp))
        TvFocusableButton(label = stringResource(R.string.btn_delete), icon = Icons.Rounded.Delete,
            color = TvTextSub, onClick = onDelete)
    }
}

@Composable
private fun TvSeriesGroupRow(
    episodes: List<DownloadItem>,
    onPlay:   (DownloadItem) -> Unit,
    onDelete: (DownloadItem) -> Unit,
) {
    val seriesName = episodes.firstOrNull()?.seriesName ?: ""
    var expanded by remember { mutableStateOf(false) }
    var headerFocused by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(TvBgCard),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(if (headerFocused) 2.dp else 0.dp,
                    if (headerFocused) TvPurpleGlow else Color.Transparent, RoundedCornerShape(12.dp))
                .focusable()
                .onFocusChanged { headerFocused = it.isFocused }
                .onKeyEvent { event ->
                    if (event.type == KeyEventType.KeyUp && (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                        expanded = !expanded; true
                    } else false
                }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TvDownloadCover(episodes.firstOrNull()?.cover)
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(seriesName, color = TvTextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${episodes.size} episodes", color = TvTextSub, fontSize = 13.sp)
            }
            Icon(
                if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                null, tint = TvTextSub, modifier = Modifier.size(24.dp),
            )
        }

        if (expanded) {
            HorizontalDivider(color = TvBorder, thickness = 0.5.dp)
            episodes.forEach { ep ->
                TvEpisodeCompletedRow(ep = ep, onPlay = { onPlay(ep) }, onDelete = { onDelete(ep) })
            }
        }
    }
}

@Composable
private fun TvEpisodeCompletedRow(ep: DownloadItem, onPlay: () -> Unit, onDelete: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isFocused) TvPurple.copy(0.15f) else Color.Transparent)
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onPlay(); true
                } else false
            }
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            val prefix = if (ep.season != null && ep.episodeNum != null) "S${ep.season} E${ep.episodeNum} - " else ""
            Text("$prefix${ep.subtitle?.substringAfterLast("- ")?.trim() ?: ep.title}",
                color = if (isFocused) Color.White else TvTextPrimary, fontSize = 14.sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        TvFocusableButton(label = stringResource(R.string.btn_play), icon = Icons.Rounded.PlayCircle,
            color = TvPurple, onClick = onPlay)
        Spacer(Modifier.width(8.dp))
        TvFocusableButton(label = null, icon = Icons.Rounded.Delete, color = TvTextSub, onClick = onDelete)
    }
}

// ─── Reusable TV action button ────────────────────────────────────────────────

@Composable
private fun TvFocusableButton(
    label:   String?,
    icon:    androidx.compose.ui.graphics.vector.ImageVector,
    color:   Color,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (isFocused) color.copy(0.22f) else Color.Transparent)
            .border(if (isFocused) 2.dp else 0.dp, if (isFocused) color else Color.Transparent, RoundedCornerShape(8.dp))
            .focusable()
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp && (event.key == Key.DirectionCenter || event.key == Key.Enter)) {
                    onClick(); true
                } else false
            }
            .padding(horizontal = if (label != null) 12.dp else 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(icon, null, tint = if (isFocused) color else TvTextSub, modifier = Modifier.size(20.dp))
        if (label != null) {
            Text(label, color = if (isFocused) color else TvTextSub, fontSize = 13.sp)
        }
    }
}
