package com.purple.iptvplayer.mobile.ui.cast

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import androidx.mediarouter.app.MediaRouteButton
import com.google.android.gms.cast.framework.CastButtonFactory

@Composable
fun CastButton(
    modifier: Modifier = Modifier,
    tint: Color? = null // Reserved for future use if we find a stable way to override theme tint
) {
    AndroidView(
        modifier = modifier,
        factory  = { ctx ->
            MediaRouteButton(ctx).also { btn ->
                CastButtonFactory.setUpMediaRouteButton(ctx, btn)
            }
        }
    )
}
