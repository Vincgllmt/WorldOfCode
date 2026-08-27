package com.purple.iptvplayer.core.di

import com.purple.iptvplayer.core.data.*
import com.purple.iptvplayer.core.network.XtreamApiClient
import com.purple.iptvplayer.core.player.PlayerService
import com.purple.iptvplayer.core.viewmodel.*
import org.koin.android.ext.koin.androidContext
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

val coreModule = module {

    // Network
    single { XtreamApiClient() }

    // Repositories
    single { CredentialsRepository(androidContext()) }
    single { CacheRepository(androidContext()) }
    single { IptvRepository(androidContext(), get(), get(), get()) }
    single<TrialRepository> { TrialRepositoryImpl(androidContext()) }
    single<BillingRepository> { BillingRepositoryImpl(androidContext(), get()) }
    single { FavoritesRepository(androidContext()) }
    single { ProgressRepository(androidContext()) }
    single { SettingsRepository(androidContext()) }
    single { DownloadRepository(androidContext(), get()) }

    // Player — singleton so it survives navigation
    single { PlayerService(androidContext()) }

    // ViewModels
    viewModel { SetupViewModel(get(), get()) }
    viewModel { ContentViewModel(get(), get(), get()) }
    viewModel { PlayerViewModel(get(), get(), get()) }
    viewModel { PurchaseViewModel(get(), get()) }
    viewModel { TrialViewModel(get(), get()) }
    viewModel { DownloadViewModel(get()) }
}
