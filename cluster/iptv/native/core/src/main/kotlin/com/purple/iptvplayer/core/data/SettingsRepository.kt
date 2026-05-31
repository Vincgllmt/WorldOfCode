package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "app_settings")

enum class ViewMode { THEMES, GRID_SMALL, GRID_MEDIUM, GRID_LARGE }

class SettingsRepository(private val context: Context) {

    private val KEY_VIEW_MODE = stringPreferencesKey("view_mode")
    private val KEY_LANGUAGE  = stringPreferencesKey("language")
    private val KEY_SUB_SIZE  = androidx.datastore.preferences.core.floatPreferencesKey("sub_size")
    private val KEY_SUB_COLOR = stringPreferencesKey("sub_color")
    private val KEY_SUB_BG    = androidx.datastore.preferences.core.booleanPreferencesKey("sub_bg")

    val viewMode: Flow<ViewMode> = context.settingsDataStore.data.map { prefs ->
        ViewMode.values().firstOrNull { it.name == prefs[KEY_VIEW_MODE] } ?: ViewMode.GRID_MEDIUM
    }

    val language: Flow<String> = context.settingsDataStore.data.map { it[KEY_LANGUAGE] ?: "en" }

    val subtitleSize: Flow<Float> = context.settingsDataStore.data.map { it[KEY_SUB_SIZE] ?: 1.0f }
    val subtitleColor: Flow<String> = context.settingsDataStore.data.map { it[KEY_SUB_COLOR] ?: "white" }
    val subtitleBackground: Flow<Boolean> = context.settingsDataStore.data.map { it[KEY_SUB_BG] ?: false }

    suspend fun setViewMode(mode: ViewMode) {
        context.settingsDataStore.edit { it[KEY_VIEW_MODE] = mode.name }
    }

    suspend fun setLanguage(lang: String) {
        context.settingsDataStore.edit { it[KEY_LANGUAGE] = lang }
    }

    suspend fun setSubtitleSize(size: Float) {
        context.settingsDataStore.edit { it[KEY_SUB_SIZE] = size }
    }

    suspend fun setSubtitleColor(color: String) {
        context.settingsDataStore.edit { it[KEY_SUB_COLOR] = color }
    }

    suspend fun setSubtitleBackground(enabled: Boolean) {
        context.settingsDataStore.edit { it[KEY_SUB_BG] = enabled }
    }
}
