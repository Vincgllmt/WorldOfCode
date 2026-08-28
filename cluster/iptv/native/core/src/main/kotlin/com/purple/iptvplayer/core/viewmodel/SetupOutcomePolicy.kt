package com.purple.iptvplayer.core.viewmodel

import com.purple.iptvplayer.core.model.Credentials
import java.io.IOException

/** Verdict d'une tentative de configuration, avant tout effet de bord. */
sealed interface SetupOutcome {
    /** Le serveur a répondu : on peut enregistrer ces identifiants. */
    data class Accepted(val credentials: Credentials) : SetupOutcome
    /** Refus ou panne : rien à enregistrer, l'écran doit le dire. */
    data class Rejected(val reason: SetupFailure) : SetupOutcome
}

/**
 * Traduit le résultat de `IptvRepository.validate` en verdict.
 *
 * ⚠️ **`validate` ne lève pas.** `doValidate` enveloppe tout dans un `runCatching`
 * et renvoie `null` dès que le serveur refuse, ne répond pas, ou que le fichier
 * local est introuvable. Un serveur injoignable arrive donc ici en
 * `Result.success(null)`, jamais en `Result.failure`.
 *
 * C'est ce `null` qui a été perdu de vue en passant des `String message` aux
 * causes typées : il retombait sur `SetupState.Success`, l'application ouvrait le
 * catalogue **sans identifiants enregistrés**, et l'écran d'accueil échouait sur
 * « An unexpected error occurred » (§56). D'où l'objet pur : la décision se teste
 * ici, sans Android.
 */
object SetupOutcomePolicy {

    fun decide(result: Result<Credentials?>): SetupOutcome = result.fold(
        onSuccess = { validated ->
            if (validated == null) SetupOutcome.Rejected(SetupFailure.NETWORK)
            else SetupOutcome.Accepted(validated)
        },
        onFailure = { SetupOutcome.Rejected(it.toSetupFailure()) },
    )

    /** Mappe une exception vers une cause typée, sans libellé écrit en dur. */
    internal fun Throwable.toSetupFailure(): SetupFailure = when (this) {
        is java.net.UnknownHostException -> SetupFailure.NETWORK
        is java.net.SocketTimeoutException -> SetupFailure.NETWORK
        is IOException -> SetupFailure.NETWORK
        else -> SetupFailure.UNKNOWN
    }
}
