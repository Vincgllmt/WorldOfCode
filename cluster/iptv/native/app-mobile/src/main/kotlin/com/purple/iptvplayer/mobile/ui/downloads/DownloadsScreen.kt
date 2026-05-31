package com.purple.iptvplayer.mobile.ui.downloads

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
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
import com.purple.iptvplayer.R
import com.purple.iptvplayer.mobile.ui.theme.*
import org.koin.androidx.compose.koinViewModel

@Composable
fun DownloadsScreen(onPlay: (url: String, title: String) -> Unit) {
    val vm: DownloadViewModel = koinViewModel()
    val downloads by vm.downloads.collectAsState()

    val activeItem   = downloads.firstOrNull { it.status == DownloadStatus.DOWNLOADING }
    val queuedItems  = downloads.filter { it.status == DownloadStatus.QUEUED }
    val failedItems  = downloads.filter { it.status == DownloadStatus.FAILED }
    val completed    = downloads.filter { it.status == DownloadStatus.COMPLETED }
    val completedMovies   = completed.filter { it.type == DownloadType.MOVIE }
    val seriesGroups = completed
        .filter { it.type == DownloadType.EPISODE }
        .groupBy { it.seriesId ?: it.title }
        .values
        .map { eps -> eps.sortedWith(compareBy({ it.season }, { it.episodeNum })) }
        .sortedBy { it.firstOrNull()?.seriesName ?: it.firstOrNull()?.title ?: "" }

    val isEmpty = activeItem == null && queuedItems.isEmpty() && failedItems.isEmpty() && completed.isEmpty()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(BgHome),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        if (isEmpty) {
            item {
                Box(
                    modifier = Modifier.fillParentMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Rounded.Download, null, tint = TextSub.copy(0.25f), modifier = Modifier.size(72.dp))
                        Spacer(Modifier.height(20.dp))
                        Text(
                            stringResource(R.string.downloads_empty),
                            color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.downloads_empty_sub),
                            color = TextSub, fontSize = 14.sp, textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        } else {
            // ── Active download ────────────────────────────────────────────────
            if (activeItem != null) {
                item {
                    SectionHeader(stringResource(R.string.downloads_section_active))
                }
                item {
                    ActiveDownloadCard(
                        item = activeItem,
                        onCancel = { vm.remove(activeItem.id) },
                    )
                }
            }

            // ── Queue ──────────────────────────────────────────────────────────
            if (queuedItems.isNotEmpty()) {
                item {
                    SectionHeader(
                        title       = stringResource(R.string.downloads_section_queue),
                        actionLabel = stringResource(R.string.btn_cancel_all),
                        onAction    = {
                            val toCancel = listOfNotNull(activeItem?.id) + queuedItems.map { it.id }
                            toCancel.forEach { vm.remove(it) }
                        },
                    )
                }
                items(queuedItems, key = { it.id }) { item ->
                    QueuedItemCard(item = item, onCancel = { vm.remove(item.id) })
                }
            }

            // ── Failed ─────────────────────────────────────────────────────────
            if (failedItems.isNotEmpty()) {
                item { SectionHeader(stringResource(R.string.download_failed)) }
                items(failedItems, key = { it.id }) { item ->
                    FailedItemCard(
                        item = item,
                        onRetry = { vm.retry(item.id) },
                        onDelete = { vm.remove(item.id) },
                    )
                }
            }

            // ── Completed ──────────────────────────────────────────────────────
            if (completedMovies.isNotEmpty() || seriesGroups.isNotEmpty()) {
                item { SectionHeader(stringResource(R.string.downloads_section_completed)) }

                // Movies
                items(completedMovies, key = { it.id }) { item ->
                    CompletedItemCard(
                        item = item,
                        onPlay = { onPlay(item.localPath?.let { "file://$it" } ?: item.url, item.title) },
                        onDelete = { vm.remove(item.id) },
                    )
                }

                // Series groups
                seriesGroups.forEach { eps ->
                    item(key = "series_${eps.first().seriesId ?: eps.first().title}") {
                        SeriesGroupCard(
                            episodes    = eps,
                            onPlay      = { ep -> onPlay(ep.localPath?.let { "file://$it" } ?: ep.url, ep.title) },
                            onDelete    = { ep -> vm.remove(ep.id) },
                            onDeleteAll = { vm.removeAll(eps.map { it.id }) },
                        )
                    }
                }
            }
        }
    }
}

// ─── Section header ───────────────────────────────────────────────────────────

@Composable
private fun SectionHeader(title: String, actionLabel: String? = null, onAction: (() -> Unit)? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 8.dp, top = 20.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title.uppercase(),
            color = PurpleGlow,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
            modifier = Modifier.weight(1f),
        )
        if (actionLabel != null && onAction != null) {
            TextButton(
                onClick = onAction,
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
            ) {
                Text(actionLabel, color = TextSub, fontSize = 12.sp)
            }
        }
    }
}

// ─── Active download ──────────────────────────────────────────────────────────

@Composable
private fun ActiveDownloadCard(item: DownloadItem, onCancel: () -> Unit) {
    val infiniteTransition = rememberInfiniteTransition(label = "dl_shimmer")
    val animatedProgress by infiniteTransition.animateFloat(
        initialValue = item.progress / 100f,
        targetValue  = item.progress / 100f,
        animationSpec = infiniteRepeatable(tween(300), RepeatMode.Restart),
        label = "progress",
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(BgCard)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        DownloadCover(item.cover, Modifier.size(width = 64.dp, height = 88.dp))

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let {
                Text(it, color = TextSub, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { item.progress / 100f },
                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color = PurpleGlow,
                trackColor = BgHome,
            )
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.download_active),
                    color = PurpleGlow, fontSize = 11.sp)
                Text("${item.progress}%", color = TextSub, fontSize = 11.sp)
            }
        }

        Spacer(Modifier.width(8.dp))

        IconButton(onClick = onCancel, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Close, stringResource(R.string.download_cancel),
                tint = TextSub, modifier = Modifier.size(20.dp))
        }
    }
}

// ─── Queued item ──────────────────────────────────────────────────────────────

@Composable
private fun QueuedItemCard(item: DownloadItem, onCancel: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(BgCard)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        DownloadCover(item.cover, Modifier.size(width = 64.dp, height = 88.dp))

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let {
                Text(it, color = TextSub, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Rounded.Schedule, null, tint = TextSub.copy(0.6f), modifier = Modifier.size(12.dp))
                Text(stringResource(R.string.download_queued),
                    color = TextSub, fontSize = 11.sp)
            }
        }

        Spacer(Modifier.width(8.dp))

        IconButton(onClick = onCancel, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Close, stringResource(R.string.download_cancel),
                tint = TextSub, modifier = Modifier.size(20.dp))
        }
    }
}

// ─── Failed item ──────────────────────────────────────────────────────────────

@Composable
private fun FailedItemCard(item: DownloadItem, onRetry: () -> Unit, onDelete: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(BgCard)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        DownloadCover(item.cover, Modifier.size(width = 64.dp, height = 88.dp))

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let {
                Text(it, color = TextSub, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(4.dp))
            Text(stringResource(R.string.download_failed),
                color = ColorError, fontSize = 11.sp)
        }

        Spacer(Modifier.width(8.dp))

        IconButton(onClick = onRetry, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Refresh, stringResource(R.string.btn_retry),
                tint = PurpleGlow, modifier = Modifier.size(20.dp))
        }
        IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Delete, stringResource(R.string.btn_delete),
                tint = TextSub, modifier = Modifier.size(20.dp))
        }
    }
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

@Composable
private fun DeleteConfirmDialog(title: String, onConfirm: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor   = BgCard,
        title = { Text(stringResource(R.string.btn_delete), color = TextPrimary, fontWeight = FontWeight.Bold) },
        text  = { Text(stringResource(R.string.delete_confirm_text, title), color = TextSub, fontSize = 14.sp) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(stringResource(R.string.btn_delete), color = ColorError, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.btn_cancel), color = TextPrimary)
            }
        },
    )
}

// ─── Completed movie ──────────────────────────────────────────────────────────

@Composable
private fun CompletedItemCard(item: DownloadItem, onPlay: () -> Unit, onDelete: () -> Unit) {
    var showConfirm by remember { mutableStateOf(false) }
    if (showConfirm) {
        DeleteConfirmDialog(
            title     = item.title,
            onConfirm = { showConfirm = false; onDelete() },
            onDismiss = { showConfirm = false },
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onPlay() }
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(BgCard)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        DownloadCover(item.cover, Modifier.size(width = 64.dp, height = 88.dp))

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(item.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 2, overflow = TextOverflow.Ellipsis)
            item.subtitle?.let {
                Text(it, color = TextSub, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Icon(Icons.Rounded.CheckCircle, null, tint = Color(0xFF4CAF50), modifier = Modifier.size(12.dp))
                Text(stringResource(R.string.download_done),
                    color = Color(0xFF4CAF50), fontSize = 11.sp)
            }
        }

        Spacer(Modifier.width(8.dp))

        IconButton(onClick = onPlay, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.PlayCircle, null, tint = Purple, modifier = Modifier.size(28.dp))
        }
        IconButton(onClick = { showConfirm = true }, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Delete, stringResource(R.string.btn_delete),
                tint = TextSub, modifier = Modifier.size(20.dp))
        }
    }
}

// ─── Series group ─────────────────────────────────────────────────────────────

@Composable
private fun SeriesGroupCard(
    episodes:    List<DownloadItem>,
    onPlay:      (DownloadItem) -> Unit,
    onDelete:    (DownloadItem) -> Unit,
    onDeleteAll: () -> Unit,
) {
    val seriesName = episodes.firstOrNull()?.seriesName ?: episodes.firstOrNull()?.title ?: ""
    var expanded by remember { mutableStateOf(true) }
    var showDeleteAllConfirm by remember { mutableStateOf(false) }
    if (showDeleteAllConfirm) {
        DeleteConfirmDialog(
            title     = seriesName,
            onConfirm = { showDeleteAllConfirm = false; onDeleteAll() },
            onDismiss = { showDeleteAllConfirm = false },
        )
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(BgCard),
    ) {
        // Group header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(start = 12.dp, end = 4.dp, top = 10.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            DownloadCover(
                episodes.firstOrNull()?.cover,
                Modifier.size(width = 40.dp, height = 56.dp),
                cornerRadius = 8.dp,
            )
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(seriesName, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${episodes.size} episodes", color = TextSub, fontSize = 12.sp)
            }
            IconButton(onClick = { showDeleteAllConfirm = true }, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Rounded.Delete, stringResource(R.string.btn_delete),
                    tint = TextSub.copy(0.5f), modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(8.dp))
            Icon(
                if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                null, tint = TextSub, modifier = Modifier.size(20.dp).padding(end = 4.dp),
            )
        }

        if (expanded) {
            HorizontalDivider(color = BorderPurple.copy(0.3f), thickness = 0.5.dp)
            episodes.forEach { ep ->
                EpisodeDownloadRow(ep = ep, onPlay = { onPlay(ep) }, onDelete = { onDelete(ep) })
                if (ep != episodes.last()) {
                    HorizontalDivider(
                        color = BorderPurple.copy(0.2f), thickness = 0.5.dp,
                        modifier = Modifier.padding(start = 16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun EpisodeDownloadRow(ep: DownloadItem, onPlay: () -> Unit, onDelete: () -> Unit) {
    var showConfirm by remember { mutableStateOf(false) }
    if (showConfirm) {
        val label = buildString {
            if (ep.season != null && ep.episodeNum != null) append("S${ep.season} E${ep.episodeNum} · ")
            append(ep.subtitle?.substringAfterLast("· ")?.trim() ?: ep.title)
        }
        DeleteConfirmDialog(
            title     = label,
            onConfirm = { showConfirm = false; onDelete() },
            onDismiss = { showConfirm = false },
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onPlay() }
            .padding(start = 12.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            val seasonEp = if (ep.season != null && ep.episodeNum != null)
                "S${ep.season} E${ep.episodeNum} · " else ""
            Text(
                "$seasonEp${ep.subtitle?.substringAfterLast("· ")?.trim() ?: ep.title}",
                color = TextPrimary, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis,
            )
        }
        IconButton(onClick = onPlay, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.PlayCircle, null, tint = Purple, modifier = Modifier.size(24.dp))
        }
        IconButton(onClick = { showConfirm = true }, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Rounded.Delete, null, tint = TextSub, modifier = Modifier.size(18.dp))
        }
    }
}

// ─── Cover thumbnail ──────────────────────────────────────────────────────────

@Composable
private fun DownloadCover(url: String?, modifier: Modifier, cornerRadius: androidx.compose.ui.unit.Dp = 10.dp) {
    Box(modifier = modifier.clip(RoundedCornerShape(cornerRadius)).background(BgHome)) {
        if (!url.isNullOrEmpty()) {
            AsyncImage(model = url, contentDescription = null,
                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Icon(Icons.Rounded.Movie, null, tint = TextSub.copy(0.3f),
                modifier = Modifier.align(Alignment.Center).size(24.dp))
        }
    }
}
