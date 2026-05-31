package com.purple.iptvplayer.tv.util

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

object LocaleHelper {

    private const val PREFS = "purple_locale"
    private const val KEY   = "language"

    fun onAttach(context: Context): Context {
        val lang = getSaved(context) ?: Locale.getDefault().language.let {
            if (it == "fr") "fr" else "en"
        }
        return apply(context, lang)
    }

    fun setLocale(context: Context, lang: String): Context {
        save(context, lang)
        return apply(context, lang)
    }

    fun getLanguage(context: Context): String =
        getSaved(context) ?: if (Locale.getDefault().language == "fr") "fr" else "en"

    private fun getSaved(context: Context): String? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)

    private fun save(context: Context, lang: String) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, lang).apply()

    private fun apply(context: Context, lang: String): Context {
        val locale = Locale(lang)
        Locale.setDefault(locale)
        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        return context.createConfigurationContext(config)
    }
}
