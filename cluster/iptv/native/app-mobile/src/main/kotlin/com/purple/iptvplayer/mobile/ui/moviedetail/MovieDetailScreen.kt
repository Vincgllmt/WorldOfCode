package com.purple.iptvplayer.mobile.ui.moviedetail

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import androidx.compose.runtime.rememberCoroutineScope
import com.purple.iptvplayer.core.data.ProgressRepository
import com.purple.iptvplayer.core.model.DownloadItem
import com.purple.iptvplayer.core.model.DownloadStatus
import com.purple.iptvplayer.core.model.DownloadType
import com.purple.iptvplayer.core.model.MovieDetail
import com.purple.iptvplayer.core.viewmodel.ContentState
import com.purple.iptvplayer.core.viewmodel.ContentViewModel
import com.purple.iptvplayer.core.viewmodel.DownloadViewModel
import com.purple.iptvplayer.R
import com.purple.iptvplayer.mobile.ui.cast.CastButton
import com.purple.iptvplayer.mobile.ui.theme.*
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject

@Composable
fun MovieDetailScreen(
    movieId: Int,
    onPlay:  (url: String, title: String, id: Int, cover: String) -> Unit,
    onBack:  () -> Unit,
) {
    val vm:           ContentViewModel  = koinViewModel()
    val dlVm:         DownloadViewModel = koinViewModel()
    val castVm:       CastViewModel     = koinViewModel()
    val playerVm:     com.purple.iptvplayer.core.viewmodel.PlayerViewModel = koinViewModel()
    val progressRepo: ProgressRepository = koinInject()
    val detailState    by vm.movieDetail.collectAsState()
    val downloads      by dlVm.downloads.collectAsState()
    val recentItems    by progressRepo.recentItems.collectAsState(initial = emptyList())
    val movieWatchlist by vm.movieFavorites.collectAsState()

    LaunchedEffect(movieId) { vm.loadMovieDetail(movieId) }
    DisposableEffect(Unit) { onDispose { vm.clearMovieDetail() } }

    when (val s = detailState) {
        null, is ContentState.Loading -> Box(Modifier.fillMaxSize().background(BgHome), Alignment.Center) {
            CircularProgressIndicator(color = Purple)
        }
        is ContentState.Error -> Box(Modifier.fillMaxSize().background(BgHome), Alignment.Center) {
            Text(s.message, color = ColorError)
        }
        is ContentState.Success -> {
            val d = s.data
            val dlId       = "movie_${d.id}"
            val dlItem     = downloads.find { it.id == dlId }
            val isInList   = movieWatchlist.contains(d.id.toString())
            val scope = rememberCoroutineScope()

            val movieRecent = remember(recentItems, d.id) { recentItems.find { it.id == "${d.id}" } }
            val savedPos  = movieRecent?.progress ?: 0L
            val savedDur  = movieRecent?.duration  ?: 0L
            val isStarted = savedPos > 0L && (savedDur == 0L || savedPos < savedDur * 0.9f)
            val watchFraction = if (savedDur > 0L) (savedPos.toFloat() / savedDur).coerceIn(0f, 1f) else 0f

            // Register pending cast media with resume position
            LaunchedEffect(d.url, savedPos) {
                castVm.setPendingMedia(d.url, d.name, d.coverBig ?: d.cover, savedPos)
            }
            DisposableEffect(Unit) { onDispose { castVm.clearPendingMedia() } }

            Box(modifier = Modifier.fillMaxSize().background(BgHome)) {
                Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                    // Hero cover
                    Box(modifier = Modifier.fillMaxWidth().height(300.dp)) {
                        if (!d.coverBig.isNullOrEmpty()) {
                            AsyncImage(model = d.coverBig, contentDescription = d.name,
                                contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                        }
                        Box(modifier = Modifier.fillMaxSize().background(
                            Brush.verticalGradient(listOf(Color.Transparent, BgHome), startY = 150f)
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

                    // Info section
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(d.name, color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Black)
                        Spacer(Modifier.height(8.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            d.year?.let { MetaChip(it) }
                            d.duration?.let { MetaChip(it) }
                            d.rating?.let { MetaChip("★ $it") }
                        }

                        Spacer(Modifier.height(8.dp))
                        d.genre?.let { Text(it, color = PurpleGlow, fontSize = 13.sp) }

                        if (isStarted && watchFraction > 0f) {
                            Spacer(Modifier.height(12.dp))
                            LinearProgressIndicator(
                                progress = { watchFraction },
                                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                                color = Purple, trackColor = BorderPurple.copy(alpha = 0.3f),
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        // Play / Resume button
                        Button(
                            onClick = { onPlay(d.url, d.name, d.id, d.cover ?: "") },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Purple),
                        ) {
                            Icon(Icons.Rounded.PlayArrow, null, modifier = Modifier.size(24.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                stringResource(if (isStarted) R.string.btn_resume else R.string.btn_play),
                                fontSize = 16.sp, fontWeight = FontWeight.Bold,
                            )
                        }

                        if (isStarted) {
                            Spacer(Modifier.height(8.dp))
                            OutlinedButton(
                                onClick = {
                                    scope.launch {
                                        progressRepo.clearProgress("${d.id}")
                                        onPlay(d.url, d.name, d.id, d.cover ?: "")
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, BorderPurple.copy(alpha = 0.5f)),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextSub),
                            ) {
                                Icon(Icons.Rounded.Replay, null, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(stringResource(R.string.btn_restart), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            }
                        }

                        Spacer(Modifier.height(8.dp))

                        // Ma liste button
                        OutlinedButton(
                            onClick  = { vm.toggleMovieFavorite(d.id.toString()) },
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

                        Spacer(Modifier.height(8.dp))

                        // Download button
                        DownloadButton(
                            item = dlItem,
                            onDownload = {
                                dlVm.enqueue(DownloadItem(
                                    id    = dlId,
                                    type  = DownloadType.MOVIE,
                                    title = d.name,
                                    url   = d.url,
                                    cover = d.cover,
                                ))
                            },
                            onCancel = { dlVm.remove(dlId) },
                            onRetry  = { dlVm.retry(dlId) },
                            onPlay   = { it?.let { onPlay("file://$it", d.name, d.id, d.cover ?: "") } }
                        )

                        Spacer(Modifier.height(24.dp))

                        // Plot
                        Text(stringResource(R.string.detail_plot), color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(8.dp))
                        Text(d.description ?: "No plot available", color = TextSub, fontSize = 14.sp, lineHeight = 20.sp)

                        d.director?.takeIf { it.isNotBlank() }?.let {
                            Spacer(Modifier.height(16.dp))
                            Text(stringResource(R.string.detail_director), color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(4.dp))
                            Text(it, color = TextSub, fontSize = 13.sp)
                        }

                        d.cast?.takeIf { it.isNotBlank() }?.let {
                            Spacer(Modifier.height(16.dp))
                            Text(stringResource(R.string.detail_cast), color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(4.dp))
                            Text(it, color = TextSub, fontSize = 13.sp, lineHeight = 18.sp)
                        }

                        Spacer(Modifier.height(32.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun MetaChip(text: String) {
    Surface(
        color = BgCard,
        shape = RoundedCornerShape(6.dp),
        border = BorderStroke(1.dp, BorderPurple.copy(alpha = 0.3f))
    ) {
        Text(text, color = TextSub, fontSize = 11.sp, fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
    }
}

@Composable
private fun DownloadButton(
    item:       DownloadItem?,
    onDownload: () -> Unit,
    onCancel:   () -> Unit,
    onRetry:    () -> Unit,
    onPlay:     (String?) -> Unit,
) {
    var icon = Icons.Rounded.Download
    var label = stringResource(R.string.dl_download)
    var color: Color = PurpleGlow
    var action: () -> Unit = onDownload
    when (item?.status) {
        DownloadStatus.QUEUED -> { icon = Icons.Rounded.Schedule; label = stringResource(R.string.dl_queued); color = TextSub; action = onCancel }
        DownloadStatus.DOWNLOADING -> { icon = Icons.Rounded.Sync; label = "Downloading ${item.progress}%"; color = PurpleGlow; action = onCancel }
        DownloadStatus.COMPLETED -> { icon = Icons.Rounded.CheckCircle; label = stringResource(R.string.dl_done); color = Color(0xFF4CAF50); action = { onPlay(item.localPath) } }
        DownloadStatus.FAILED -> { icon = Icons.Rounded.ErrorOutline; label = stringResource(R.string.dl_failed); color = ColorError; action = onRetry }
        else -> {}
    }

    OutlinedButton(
        onClick = action,
        modifier = Modifier.fillMaxWidth().height(48.dp),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, color.copy(alpha = 0.5f)),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color)
    ) {
        Icon(icon, null, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}
