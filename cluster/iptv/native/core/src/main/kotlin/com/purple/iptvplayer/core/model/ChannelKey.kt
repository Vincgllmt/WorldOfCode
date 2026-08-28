package com.purple.iptvplayer.core.model

/**
 * Clé d'une chaîne dans une liste paresseuse — **jamais l'URL seule**.
 *
 * ⚠️ **Le plantage que cet objet supprime (#109).** Compose exige des clés uniques dans
 * une `LazyColumn`/`LazyVerticalGrid` : chaque élément est enveloppé dans un
 * `SaveableStateProvider(key)`, et `SaveableStateHolderImpl` porte le `require`
 * « Key … was used multiple times ». Or l'URL n'est pas unique sur une source M3U : un
 * doublon exact, ou le même flux rangé dans deux `group-title`, produit deux `Channel`
 * identiques — `M3uParserService` n'impose aucune unicité, et `IptvRepository` les mappe
 * tels quels. L'onglet Direct TV plantait dès que les deux lignes étaient composées en
 * même temps.
 *
 * La voie Xtream n'était pas concernée — `streamUrl` dérive de `stream_id`, unique — mais
 * la clé ne doit dépendre d'**aucune** donnée du fournisseur : c'est lui qui décide de ce
 * qu'il envoie.
 *
 * ⚠️ Le nom ne sauve pas non plus : deux doublons exacts partagent aussi le nom.
 *
 * La règle vit ici et non dans les écrans parce qu'elle était appliquée en **cinq
 * endroits**, dans les deux UI (règle 1) — et qu'une seule de ces cinq copies était
 * relevée par l'audit.
 */
object ChannelKey {

    /**
     * @param scope préfixe distinguant deux listes affichées en même temps — les sections
     *   de thèmes de l'accueil mobile vivent dans **une seule** `LazyColumn`, donc deux
     *   thèmes différents ne doivent pas produire la même clé au même rang.
     * @param index rang dans la liste affichée : c'est lui qui rend la clé unique par
     *   construction, quoi que le fournisseur envoie.
     */
    fun of(scope: String, index: Int, channel: Channel): String =
        "${scope}_${index}_${channel.url}"

    /** Les clés d'une liste entière — la forme que les tests exercent. */
    fun forList(scope: String, channels: List<Channel>): List<String> =
        channels.mapIndexed { i, c -> of(scope, i, c) }
}
