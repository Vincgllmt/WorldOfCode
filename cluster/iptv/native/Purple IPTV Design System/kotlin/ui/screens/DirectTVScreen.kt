package com.purpleiptv.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyColumn
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import com.purpleiptv.tv.model.Channel
import com.purpleiptv.tv.theme.LocalPurpleType
import com.purpleiptv.tv.theme.PurplePalette
import com.purpleiptv.tv.theme.PurpleSpacing
import com.purpleiptv.tv.ui.components.CapsLabel
import com.purpleiptv.tv.ui.components.ChannelTile
import com.purpleiptv.tv.ui.components.ContentRow

/**
 * Direct TV — channel browse with one horizontal row per genre.
 *
 * For thousands of channels we want vertical paging (LazyColumn) of
 * horizontally-pannable rows (TvLazyRow). The Compose for TV team
 * built this exact pattern as `ImmersiveList` but here we keep it
 * simple — `TvLazyColumn` of `ContentRow`s — so the navigation is
 * predictable across genres.
 */
@Composable
fun DirectTVScreen(
    channelsByGroup: List<Pair<String, List<Channel>>>,
    totalChannels: Int,
    totalGenres: Int,
    onPlayChannel: (Channel) -> Unit,
    onOpenGenre: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    TvLazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1),
        verticalArrangement = Arrangement.spacedBy(40.dp),
        contentPadding = PaddingValues(top = 100.dp, bottom = 60.dp),
    ) {
        item("header") { Header(totalChannels, totalGenres) }
        itemsIndexed(channelsByGroup, key = { _, p -> p.first }) { _, (group, channels) ->
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    modifier = Modifier.padding(start = PurpleSpacing.TvSafeX),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    CapsLabel(group)
                    Text(
                        "(${channels.size})",
                        style = LocalPurpleType.current.bodySmall.copy(color = PurplePalette.Fg3),
                    )
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = "All ${group}",
                        tint = PurplePalette.Fg3,
                        modifier = Modifier.size(16.dp),
                    )
                }
                ContentRow(
                    title = "", // header rendered above to allow the chevron
                    items = channels,
                ) { ch, _, dim ->
                    ChannelTile(channel = ch, onClick = { onPlayChannel(ch) }, isAnySiblingFocused = dim)
                }
            }
        }
    }
}

@Composable
private fun Header(totalChannels: Int, totalGenres: Int) {
    Column(
        modifier = Modifier.padding(start = PurpleSpacing.TvSafeX + 100.dp, bottom = 0.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        CapsLabel("Live")
        Text(
            "Direct TV",
            style = LocalPurpleType.current.display.copy(color = Color.White),
        )
        Text(
            "${"%,d".format(totalChannels)} channels · $totalGenres genres",
            style = LocalPurpleType.current.body.copy(color = PurplePalette.Fg3),
        )
    }
}
