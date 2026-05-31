package com.purple.iptvplayer.mobile.di

import com.purple.iptvplayer.mobile.cast.CastRepository
import com.purple.iptvplayer.mobile.viewmodel.CastViewModel
import org.koin.android.ext.koin.androidContext
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

val castModule = module {
    single { CastRepository(androidContext()) }
    viewModel { CastViewModel(get()) }
}
