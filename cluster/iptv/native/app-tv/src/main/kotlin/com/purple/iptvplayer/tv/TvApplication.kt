package com.purple.iptvplayer.tv

import android.app.Application
import com.purple.iptvplayer.core.di.coreModule
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import org.koin.core.logger.Level

class TvApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidLogger(Level.ERROR)
            androidContext(this@TvApplication)
            modules(coreModule)
        }
    }
}
