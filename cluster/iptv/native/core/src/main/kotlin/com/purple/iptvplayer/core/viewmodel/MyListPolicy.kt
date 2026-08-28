package com.purple.iptvplayer.core.viewmodel

/** Ce que « Ma liste » doit montrer, une fois l'état du catalogue pris en compte. */
sealed interface MyListPanel {
    /** Le catalogue arrive encore : on ne peut rien affirmer sur les favoris. */
    data object Loading : MyListPanel
    /** Le catalogue est inaccessible : le dire, plutôt que d'inventer une liste vide. */
    data class Error(val reason: ContentFailure) : MyListPanel
    /** Catalogue connu, et l'utilisateur n'a effectivement rien mis de côté. */
    data object Empty : MyListPanel
    data object Content : MyListPanel
}

/**
 * Décide ce qu'affiche « Ma liste » — **et surtout quand elle a le droit de dire « vide »**.
 *
 * ⚠️ **Le défaut que cet objet supprime (#91).** Les deux écrans lisaient le catalogue par
 * `(state as? ContentState.Success)?.data ?: emptyList()`, ce qui écrase `Loading` **et**
 * `Error` en liste vide, puis déduisaient « vide » de cette lecture. L'écran annonçait donc
 * « Votre liste est vide » et invitait à ajouter des favoris :
 *
 * - **à chaque entrée dans l'onglet**, le temps du rechargement — l'onglet sort de la
 *   composition, son `LaunchedEffect(Unit)` relance les chargements, et `loadChannels()`
 *   repasse par `Loading` ;
 * - **définitivement** si le catalogue ne peut plus être chargé — cache périmé et
 *   fournisseur injoignable. L'utilisateur en conclut que ses favoris sont perdus.
 *
 * La règle tient en une phrase : **on ne dit « vide » que sur un catalogue connu.**
 *
 * L'ordre compte : `Loading` l'emporte sur `Error`. Une source encore en route peut très
 * bien aboutir, et annoncer une panne pendant que quelque chose charge serait prématuré.
 */
object MyListPolicy {

    /**
     * @param sources les états dont dépend le filtre affiché — un seul pour « Chaînes »,
     *   « Films » ou « Séries », les trois pour « Thèmes », qui les recoupe.
     * @param resolvedIsEmpty les favoris **résolus dans le catalogue** sont-ils vides ?
     *   N'est consulté que si tout est chargé.
     */
    fun panelFor(sources: List<ContentState<*>>, resolvedIsEmpty: Boolean): MyListPanel = when {
        sources.any { it is ContentState.Loading } -> MyListPanel.Loading
        else -> sources.filterIsInstance<ContentState.Error>().firstOrNull()
            ?.let { MyListPanel.Error(it.reason) }
            ?: if (resolvedIsEmpty) MyListPanel.Empty else MyListPanel.Content
    }
}
