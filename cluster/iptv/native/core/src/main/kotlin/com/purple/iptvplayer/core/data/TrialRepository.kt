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

class TrialRepository(
    private val context: Context,
    /** Source de temps injectable : permet de tester les règles d'accès sans toucher à l'horloge système. */
    private val now: () -> Long = System::currentTimeMillis,
) {

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
            val startedAt = now()
            context.dataStore.edit { it[KEY_TRIAL_START] = startedAt }
            withContext(Dispatchers.IO) { securePrefs.edit().putLong("trial_start_date", startedAt).apply() }
        }
    }

    suspend fun getRemainingDays(): Int = TrialPolicy.remainingDays(
        now = now(),
        trialStartMs = getTrialStartMs(),
        expiryMs = getExpiryMs(),
        isPro = isPro(),
    )

    /**
     * État d'accès pour l'interface : à quel titre l'utilisateur a accès, et non
     * seulement pour combien de temps. Voir [AccessState].
     */
    suspend fun getAccessState(): AccessState = TrialPolicy.accessState(
        now = now(),
        trialStartMs = getTrialStartMs(),
        expiryMs = getExpiryMs(),
        isPro = isPro(),
    )

    suspend fun hasAccess(): Boolean = TrialPolicy.hasAccess(
        now = now(),
        trialStartMs = getTrialStartMs(),
        expiryMs = getExpiryMs(),
        isPro = isPro(),
    )

    suspend fun isPremium(): Boolean = TrialPolicy.isPremium(
        now = now(),
        expiryMs = getExpiryMs(),
        isPro = isPro(),
    )

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
        val expiry = now() + durationMs
        context.dataStore.edit { it[KEY_EXPIRY] = expiry }
        withContext(Dispatchers.IO) { securePrefs.edit().putLong("subscription_expiry_date", expiry).apply() }
    }

    /**
     * Retire les droits payants, et **eux seuls**.
     *
     * Appelé quand Play ne reconnaît plus aucun achat — remboursement, révocation,
     * rétrofacturation (défaut B2). Les deux couches sont nettoyées : DataStore et les
     * `EncryptedSharedPreferences`, dont la vocation anti-fraude jouerait sinon contre
     * l'éditeur en conservant un `is_pro_user` périmé.
     *
     * ⚠️ **`trial_start_date` est délibérément conservé.** L'effacer réattribuerait un
     * essai gratuit de trois jours à chaque révocation : il suffirait de se faire
     * rembourser pour repartir en essai. C'est le piège déjà rencontré en B1.4, où
     * `pm clear` rendait l'accès par l'essai neuf et non par la synchronisation.
     */
    suspend fun revokeEntitlements() {
        context.dataStore.edit {
            it.remove(KEY_IS_PRO)
            it.remove(KEY_EXPIRY)
        }
        withContext(Dispatchers.IO) {
            securePrefs.edit()
                .remove("is_pro_user")
                .remove("subscription_expiry_date")
                .apply()
        }
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
