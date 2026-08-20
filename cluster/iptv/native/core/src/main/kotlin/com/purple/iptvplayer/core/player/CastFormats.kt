package com.purple.iptvplayer.core.player

/**
 * Ce que le récepteur Google Cast par défaut sait lire.
 *
 * Mesuré sur le catalogue réel le 2026-08-20 : **76 % des films sont en `.mkv`**
 * (20 104 sur 26 293), 19 % en `.mp4`, 4 % en `.avi`. Or le récepteur par défaut ne
 * décode **pas** le Matroska. C'est la cause du « rien ne se diffuse » : le média
 * n'arrivait jamais, et la télécommande n'avait rien à piloter.
 *
 * Ce n'est pas contournable côté client : ni un changement de type MIME ni un VPN n'y
 * changent quoi que ce soit. Seuls un transcodage ou une source HLS le permettraient.
 * L'application peut en revanche **le dire** au lieu de laisser l'utilisateur devant un
 * écran noir.
 */
object CastFormats {

    /** Conteneurs lus par le récepteur par défaut. */
    private val SUPPORTED = setOf("mp4", "m4v", "webm", "m3u8", "mpd")

    /** Conteneurs répandus chez les fournisseurs IPTV, mais non lus par Cast. */
    private val KNOWN_UNSUPPORTED = setOf("mkv", "avi", "ts", "flv", "wmv", "mov", "mpg", "mpeg")

    /**
     * Extension du conteneur, sans le point, en minuscules.
     *
     * Ignore la query string : les URL Xtream peuvent en porter une.
     */
    fun extensionOf(url: String?): String? {
        val clean = url?.substringBefore('?')?.substringBefore('#')?.trim() ?: return null
        val name = clean.substringAfterLast('/')
        if (!name.contains('.')) return null
        return name.substringAfterLast('.').lowercase().takeIf { it.isNotBlank() }
    }

    /**
     * Ce contenu peut-il être diffusé sur un Chromecast ?
     *
     * Une URL sans extension — cas d'une chaîne live servie en flux nu — est considérée
     * comme **non diffusable** : c'est du MPEG-TS brut, que le récepteur ne lit pas.
     */
    fun isCastable(url: String?): Boolean = extensionOf(url) in SUPPORTED

    /** Vrai seulement pour un format dont on sait qu'il n'est pas lu (et non « inconnu »). */
    fun isKnownUnsupported(url: String?): Boolean = extensionOf(url) in KNOWN_UNSUPPORTED

    /**
     * Type MIME à annoncer au récepteur.
     *
     * L'ancien code annonçait `video/mp2t` pour **tout** ce qui n'était ni HLS ni DASH —
     * un `.mkv` était donc présenté comme du MPEG-TS.
     */
    fun contentType(url: String?): String = when (extensionOf(url)) {
        "m3u8"       -> "application/x-mpegURL"
        "mpd"        -> "application/dash+xml"
        "mp4", "m4v" -> "video/mp4"
        "webm"       -> "video/webm"
        // ⚠️ **Repli délibéré sur l'ancienne valeur.** `video/mp2t` est faux pour un
        // `.mkv`, mais c'est ce que l'application envoyait, et un MKV se diffusait bien
        // chez l'utilisateur. Les récepteurs reniflent le contenu réel plutôt que de se
        // fier au type annoncé. Corriger cette valeur sans pouvoir le vérifier, c'est
        // exactement l'erreur du §5 P4 : ne pas durcir un comportement qui marche.
        else         -> "video/mp2t"
    }
}
