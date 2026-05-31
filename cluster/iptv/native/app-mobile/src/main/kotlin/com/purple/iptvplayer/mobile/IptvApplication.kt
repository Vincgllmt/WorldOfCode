package com.purple.iptvplayer.mobile

import android.app.Application
import com.purple.iptvplayer.core.di.coreModule
import com.purple.iptvplayer.mobile.di.castModule
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import org.koin.core.logger.Level

class IptvApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidLogger(Level.ERROR)
            androidContext(this@IptvApplication)
            modules(coreModule, castModule)
        }
    }
}
