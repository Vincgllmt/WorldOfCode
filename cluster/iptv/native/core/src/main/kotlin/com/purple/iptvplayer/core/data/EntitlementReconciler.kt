package com.purple.iptvplayer.core.data

/** Réponse de Play pour un catalogue de produits. */
sealed interface QueryOutcome {
    /** Play a répondu ; [productIds] liste les produits **effectivement possédés**. */
    data class Answered(val productIds: List<String>) : QueryOutcome

    /**
     * Play n'a pas répondu de façon exploitable — service indisponible, réseau coupé,
     * code d'erreur. **Ne permet aucune conclusion**, surtout pas « l'utilisateur ne
     * possède rien ».
     */
    data object Failed : QueryOutcome
}

/** Ce qu'il faut faire des droits locaux. */
sealed interface EntitlementDecision {
    /** Play reconnaît ce produit : appliquer le droit correspondant. */
    data class Grant(val productId: String) : EntitlementDecision

    /** Play a répondu et ne reconnaît plus aucun produit : retirer l'accès. */
    data object Revoke : EntitlementDecision

    /** On ne sait pas : **ne toucher à rien**. */
    data object Unknown : EntitlementDecision
}

/**
 * Réconcilie les droits locaux avec ce que Play connaît réellement.
 *
 * Corrige B2 : `syncEntitlements()` n'ajoutait que des droits. Un achat remboursé,
 * révoqué ou rétrofacturé disparaissait de la réponse de Play sans que l'accès soit
 * jamais retiré — `is_pro_user` restait vrai indéfiniment, y compris dans les
 * `EncryptedSharedPreferences`, dont la vocation anti-fraude jouait alors **contre**
 * l'éditeur.
 *
 * ⚠️ **La correction évidente est un piège.** Retirer les droits dès que la liste des
 * achats est vide déconnecterait tous les abonnés légitimes à la première panne de
 * facturation. D'où la distinction que porte [QueryOutcome], et qui est toute la
 * raison d'être de cette classe : « Play dit que tu n'as rien » n'est pas « Play n'a
 * pas répondu ».
 *
 * Asymétrie assumée : **accorder** est sans risque et se fait dès qu'un droit est vu ;
 * **retirer** exige que les deux catalogues aient répondu.
 */
object EntitlementReconciler {

    /** Du plus fort au plus faible : l'achat définitif prime, puis l'annuel. */
    private val PRIORITY = listOf(
        BillingProducts.LIFETIME_ID,
        BillingProducts.YEARLY_ID,
        BillingProducts.MONTHLY_ID,
    )

    /**
     * @param playIsInstaller Play est-il la source d'installation de cette application ?
     *   Si non, sa liste d'achats **ne dit rien** de cet utilisateur — mesuré sur la
     *   variante `.debug`, dont l'`applicationId` suffixé fait répondre Play « OK, rien
     *   possédé » alors qu'il ne connaît simplement pas le paquet. Conclure à une
     *   révocation dans ce cas retire l'accès à un utilisateur premium (cf. §9).
     */
    fun decide(
        inapp: QueryOutcome,
        subs: QueryOutcome,
        playIsInstaller: Boolean = true,
    ): EntitlementDecision {
        val owned = buildSet {
            (inapp as? QueryOutcome.Answered)?.let { addAll(it.productIds) }
            (subs  as? QueryOutcome.Answered)?.let { addAll(it.productIds) }
        }

        PRIORITY.firstOrNull { it in owned }?.let { return EntitlementDecision.Grant(it) }

        // Aucun droit connu. On ne retire que si les deux catalogues ont répondu :
        // un seul silence suffit à rendre la conclusion invalide.
        val bothAnswered = inapp is QueryOutcome.Answered && subs is QueryOutcome.Answered
        return if (bothAnswered && playIsInstaller) {
            EntitlementDecision.Revoke
        } else {
            EntitlementDecision.Unknown
        }
    }
}

/** Identifiants Play, partagés entre le dépôt de facturation et la réconciliation. */
object BillingProducts {
    const val MONTHLY_ID  = "purple_monthly_099"
    const val YEARLY_ID   = "purple_yearly_499"
    const val LIFETIME_ID = "purple_lifetime_999"
}
