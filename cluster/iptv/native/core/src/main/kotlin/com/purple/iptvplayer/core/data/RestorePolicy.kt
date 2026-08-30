package com.purple.iptvplayer.core.data

/**
 * Ce qu'il faut conclure d'une tentative de restauration d'achats (#70).
 *
 * Le défaut d'origine tenait en une ligne : `restorePurchases()` posait
 * `_state.value = … else -> Idle` au retour de l'appel. Or une restauration qui aboutit
 * fait émettre `PurchaseResult.Success` par `syncEntitlements()`, que le collecteur
 * traduit en `PurchaseSuccess` — le seul état qui referme la barrière. L'écriture de
 * `Idle` **écrasait ce succès**, et l'abonné restait devant la barrière sans aucune
 * sortie : il fallait tuer l'application.
 *
 * L'issue était en outre **intermittente**, selon que la recomposition tombait ou non
 * entre les deux écritures — c'est-à-dire le genre de défaut qu'un essai manuel déclare
 * corrigé une fois sur deux. D'où cette décision sortie en objet pur : elle se teste,
 * et elle nomme explicitement le cas où **il ne faut rien écrire du tout**.
 */
object RestorePolicy {

    enum class Decision {
        /** L'appel a levé : rien n'a pu être vérifié. */
        FAILED,
        /** Play a répondu, ce compte ne possède rien. */
        NOTHING_TO_RESTORE,
        /**
         * Un droit a été rendu. **Ne rien écrire** : le succès est déjà en route par le
         * collecteur, et toute écriture ici l'écraserait.
         */
        RESTORED,
    }

    fun decide(threw: Boolean, restoredCount: Int?): Decision = when {
        threw || restoredCount == null -> Decision.FAILED
        restoredCount <= 0             -> Decision.NOTHING_TO_RESTORE
        else                           -> Decision.RESTORED
    }
}
