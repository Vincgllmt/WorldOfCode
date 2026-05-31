package com.purple.iptvplayer.tv

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.purple.iptvplayer.tv.ui.navigation.TvNavGraph
import com.purple.iptvplayer.tv.ui.theme.PurpleIptvTvTheme
import com.purple.iptvplayer.tv.util.LocaleHelper

class TvActivity : ComponentActivity() {

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PurpleIptvTvTheme {
                TvNavGraph()
            }
        }
    }
}
