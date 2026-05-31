package com.purple.iptvplayer.mobile.cast

import android.content.Context
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider

class CastOptionsProvider : OptionsProvider {
    override fun getCastOptions(context: Context): CastOptions =
        CastOptions.Builder()
            .setReceiverApplicationId("CC1AD845") // Google's Default Media Receiver (supports HLS/DASH)
            .build()

    override fun getAdditionalSessionProviders(context: Context): List<SessionProvider>? = null
}
