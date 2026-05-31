package com.purple.iptvplayer.core.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.purple.iptvplayer.core.model.Credentials
import com.purple.iptvplayer.core.model.PlaylistType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CredentialsRepository(context: Context) {

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "purple_iptv_credentials",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    suspend fun load(): Credentials? = withContext(Dispatchers.IO) {
        val host = prefs.getString(KEY_HOST, null) ?: return@withContext null
        if (host.isEmpty()) return@withContext null
        val type = if (prefs.getString(KEY_TYPE, "xtream") == "m3u") PlaylistType.M3U else PlaylistType.XTREAM
        if (type == PlaylistType.M3U) {
            Credentials(host = host, type = PlaylistType.M3U)
        } else {
            val user = prefs.getString(KEY_USER, null)
            val pass = prefs.getString(KEY_PASS, null)
            if (!user.isNullOrEmpty() && !pass.isNullOrEmpty())
                Credentials(host = host, user = user, pass = pass, type = PlaylistType.XTREAM)
            else null
        }
    }

    suspend fun save(creds: Credentials) = withContext(Dispatchers.IO) {
        prefs.edit()
            .putString(KEY_HOST, creds.host)
            .putString(KEY_USER, creds.user ?: "")
            .putString(KEY_PASS, creds.pass ?: "")
            .putString(KEY_TYPE, if (creds.type == PlaylistType.M3U) "m3u" else "xtream")
            .apply()
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_HOST = "host"
        private const val KEY_USER = "user"
        private const val KEY_PASS = "pass"
        private const val KEY_TYPE = "type"
    }
}
