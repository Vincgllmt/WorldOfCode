package com.purple.iptvplayer.core.network

import okio.ByteString.Companion.decodeBase64
import okio.ByteString.Companion.toByteString
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction

/**
 * Décodage des libellés EPG renvoyés par un panneau Xtream.
 *
 * Les panneaux encodent habituellement titres et descriptions en base64, mais pas
 * tous : certains les envoient en clair. Le décodage doit donc être *conditionnel*.
 *
 * Le piège est qu'un titre en clair courant est souvent du base64 syntaxiquement
 * valide — « Football », « News », « Documentaire » — et qu'un décodage inconditionnel
 * le remplace par des octets arbitraires. Quatre garde-fous cumulés l'évitent :
 *
 *  1. l'entrée doit être du base64 **canonique** (alphabet strict, longueur multiple de 4) ;
 *  2. le ré-encodage du résultat doit redonner l'entrée exacte — c'est le filtre décisif,
 *     un mot en clair ne survit quasiment jamais à cet aller-retour ;
 *  3. les octets obtenus doivent être de l'UTF-8 **strictement** valide (et non de
 *     l'UTF-8 « avec caractères de remplacement », que `ByteArray.toString(UTF_8)`
 *     produit sans jamais lever) ;
 *  4. le texte obtenu ne doit pas contenir de caractère de contrôle exotique.
 *
 * Passe par okio plutôt que par `android.util.Base64` : okio fonctionne aussi bien
 * sur la JVM que sur toutes les versions d'Android, ce qui rend cette décision
 * testable — `android.util.Base64` n'est qu'un stub dans un test JVM, et un test
 * écrit contre lui passerait sans rien vérifier.
 */
object EpgTextDecoder {

    private val canonicalBase64 = Regex("""^[A-Za-z0-9+/]+={0,2}$""")

    fun decodeBase64OrSelf(value: String): String {
        if (value.isEmpty() || value.length % 4 != 0) return value
        if (!canonicalBase64.matches(value)) return value

        val bytes = value.decodeBase64()?.toByteArray() ?: return value
        if (bytes.toByteString().base64() != value) return value

        val text = strictUtf8(bytes) ?: return value
        if (text.isEmpty() || text.any { it.isISOControl() && it !in ALLOWED_CONTROLS }) return value

        return text.trim()
    }

    private val ALLOWED_CONTROLS = charArrayOf('\n', '\r', '\t')

    /** Décodage UTF-8 qui **échoue** sur une séquence invalide au lieu d'y substituer `�`. */
    private fun strictUtf8(bytes: ByteArray): String? = runCatching {
        Charsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(bytes))
            .toString()
    }.getOrNull()
}
