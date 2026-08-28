package com.purple.iptvplayer.core.viewmodel

import com.purple.iptvplayer.core.model.Credentials
import com.purple.iptvplayer.core.model.PlaylistType
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.IOException

/**
 * Le test que la vague-1 n'avait pas : en remplaçant les `String message` par
 * [SetupFailure], la branche « `validate` a renvoyé `null` » a disparu et est
 * retombée sur `Success`.
 *
 * Mesuré sur l'émulateur avant correction (§56) : serveur `http://10.255.255.1:8080`,
 * 10 s d'attente, puis ouverture du catalogue — sans qu'aucun
 * `purple_iptv_credentials.xml` ne soit écrit.
 */
class SetupOutcomePolicyTest {

    private val creds = Credentials(
        host = "http://exemple.test",
        user = "u",
        pass = "p",
        type = PlaylistType.XTREAM,
    )

    /** Le cas de la régression : `validate` **ne lève pas**, elle renvoie `null`. */
    @Test
    fun `un serveur injoignable arrive en success(null) et doit etre un refus`() {
        val verdict = SetupOutcomePolicy.decide(Result.success(null))
        assertEquals(SetupOutcome.Rejected(SetupFailure.NETWORK), verdict)
    }

    @Test
    fun `des identifiants valides sont acceptes`() {
        val verdict = SetupOutcomePolicy.decide(Result.success(creds))
        assertEquals(SetupOutcome.Accepted(creds), verdict)
    }

    @Test
    fun `une panne reseau reste une cause reseau`() {
        assertEquals(
            SetupOutcome.Rejected(SetupFailure.NETWORK),
            SetupOutcomePolicy.decide(Result.failure(IOException("coupure"))),
        )
        assertEquals(
            SetupOutcome.Rejected(SetupFailure.NETWORK),
            SetupOutcomePolicy.decide(Result.failure(java.net.UnknownHostException("dns"))),
        )
        assertEquals(
            SetupOutcome.Rejected(SetupFailure.NETWORK),
            SetupOutcomePolicy.decide(Result.failure(java.net.SocketTimeoutException("delai"))),
        )
    }

    @Test
    fun `toute autre exception reste inconnue`() {
        assertEquals(
            SetupOutcome.Rejected(SetupFailure.UNKNOWN),
            SetupOutcomePolicy.decide(Result.failure(IllegalStateException("autre"))),
        )
    }
}
