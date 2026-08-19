package com.purple.iptvplayer.core.data

/**
 * Ce que l'utilisateur possède, du point de vue de l'interface.
 *
 * Les écrans ne raisonnaient que sur `isPro`, ce qui écrasait la différence entre
 * un achat définitif et un abonnement : un client à jour de paiement se voyait
 * annoncer « Essai gratuit : 30 jours restants ».
 *
 * La distinction qui compte est **permanent / temporaire** — elle seule décide
 * si un décompte a un sens à l'écran :
 *
 * | État | Nature | Décompte |
 * |---|---|---|
 * | [Pro] | permanent | non — l'afficher serait du bruit |
 * | [Subscribed] | temporaire, reconductible | oui — l'échéance concerne l'utilisateur |
 * | [Trial] | temporaire, expirant | oui, avec un appel à l'action |
 * | [Expired] | aucun accès | l'écran-barrière s'en charge |
 *
 * Calculé par [TrialPolicy.accessState], logique pure et testée : aucune UI ne
 * doit refaire cette déduction pour son compte (cf. §4 et la parité mobile/TV).
 */
sealed class AccessState {

    /** Achat définitif : premium sans échéance. */
    object Pro : AccessState()

    /** Abonnement en cours. [daysLeft] est arrondi au jour supérieur. */
    data class Subscribed(val daysLeft: Int) : AccessState()

    /** Essai gratuit en cours. */
    data class Trial(val daysLeft: Int) : AccessState()

    /** Ni essai ni droit payant : l'accès doit être refusé. */
    object Expired : AccessState()

    /** L'utilisateur a payé — vrai pour [Pro] comme pour [Subscribed]. */
    val isPremium: Boolean get() = this is Pro || this is Subscribed

    /** L'accès est ouvert. Équivaut à `!= Expired`. */
    val hasAccess: Boolean get() = this !is Expired
}
