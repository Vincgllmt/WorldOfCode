package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "trial_prefs")

class TrialRepository(private val context: Context) {

    // DataStore keys
    private val KEY_TRIAL_START = longPreferencesKey("trial_start_date")
    private val KEY_IS_PRO      = booleanPreferencesKey("is_pro_user")
    private val KEY_EXPIRY      = longPreferencesKey("subscription_expiry_date")

    // EncryptedSharedPreferences for tamper-resistant storage (backup layer)
    private val securePrefs by lazy {
        EncryptedSharedPreferences.create(
            context, "purple_trial_secure",
            MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    suspend fun initTrial() {
        val prefs = context.dataStore.data.first()
        if (!prefs.contains(KEY_TRIAL_START)) {
            val now = System.currentTimeMillis()
            context.dataStore.edit { it[KEY_TRIAL_START] = now }
            withContext(Dispatchers.IO) { securePrefs.edit().putLong("trial_start_date", now).apply() }
        }
    }

    suspend fun getRemainingDays(): Int {
        if (isPro()) return 999
        val expiry = getExpiryMs()
        if (expiry != null) {
            val diff = ((expiry - System.currentTimeMillis()) / 86_400_000L).toInt()
            if (diff > 0) return diff
        }
        val start = getTrialStartMs() ?: return 3
        val daysPassed = ((System.currentTimeMillis() - start) / 86_400_000L).toInt()
        return (3 - daysPassed).coerceAtLeast(0)
    }

    suspend fun hasAccess(): Boolean = getRemainingDays() > 0

    suspend fun isPremium(): Boolean {
        if (isPro()) return true
        val expiry = getExpiryMs() ?: return false
        return expiry > System.currentTimeMillis()
    }

    suspend fun isPro(): Boolean {
        val ds = context.dataStore.data.first()
        if (ds[KEY_IS_PRO] == true) return true
        return withContext(Dispatchers.IO) { securePrefs.getBoolean("is_pro_user", false) }
    }

    suspend fun setPro() {
        context.dataStore.edit { it[KEY_IS_PRO] = true }
        withContext(Dispatchers.IO) { securePrefs.edit().putBoolean("is_pro_user", true).apply() }
    }

    suspend fun activateSubscription(durationMs: Long) {
        val expiry = System.currentTimeMillis() + durationMs
        context.dataStore.edit { it[KEY_EXPIRY] = expiry }
        withContext(Dispatchers.IO) { securePrefs.edit().putLong("subscription_expiry_date", expiry).apply() }
    }

    suspend fun resetAll() {
        context.dataStore.edit { it.clear() }
        withContext(Dispatchers.IO) { securePrefs.edit().clear().apply() }
    }

    private suspend fun getTrialStartMs(): Long? {
        val ds = context.dataStore.data.first()
        return ds[KEY_TRIAL_START]
            ?: withContext(Dispatchers.IO) {
                val v = securePrefs.getLong("trial_start_date", -1L)
                if (v == -1L) null else v
            }
    }

    private suspend fun getExpiryMs(): Long? {
        val ds = context.dataStore.data.first()
        return ds[KEY_EXPIRY]
            ?: withContext(Dispatchers.IO) {
                val v = securePrefs.getLong("subscription_expiry_date", -1L)
                if (v == -1L) null else v
            }
    }
}
