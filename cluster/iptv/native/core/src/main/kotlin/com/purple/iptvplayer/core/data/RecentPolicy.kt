package com.purple.iptvplayer.core.data

/**
 * Ce que « Reprendre la lecture » a le droit de contenir.
 *
 * Le défaut corrigé : la déduplication se faisait sur l'identifiant **exact**, et
 * l'identifiant d'un épisode est `"<seriesId>_<episodeId>"` ([EpisodeTitle.progressId]).
 * Deux épisodes d'une même série sont donc deux identifiants différents : ils
 * s'accumulaient tous les deux, puis tous les suivants. Une série regardée sur une soirée
 * remplissait la rangée à elle seule et chassait les films.
 *
 * L'attente est qu'une série n'occupe **qu'une** place, celle du dernier épisode vu — la
 * reprise porte sur la série, pas sur chaque épisode pris isolément. La progression
 * elle-même reste enregistrée par épisode (clé `progress_<id>` de [ProgressRepository]) :
 * seule la vitrine est regroupée, reprendre un épisode plus ancien retrouve bien sa
 * position.
 *
 * Logique pure, testable sans Android — même règle que [RecentItemsCodec] (§4).
 */
object RecentPolicy {

    /**
     * Clé de regroupement : deux entrées qui la partagent ne peuvent pas coexister.
     *
     * Hors série, c'est l'identifiant lui-même — le comportement d'origine, inchangé. On
     * ne préfixe pas par le type : cela **séparerait** des entrées qui se dédoublonnaient
     * jusqu'ici, ce qui serait un changement de comportement non demandé.
     */
    fun groupKey(item: RecentItem): String =
        if (item.type == TYPE_SERIES) "$TYPE_SERIES:${item.id.substringBefore('_')}" else item.id

    /**
     * Insère [item] en tête et retire ce qu'il remplace.
     *
     * @param max nombre d'entrées conservées ; au-delà, les plus anciennes tombent.
     */
    fun upsert(
        existing: List<RecentItem>,
        item: RecentItem,
        max: Int = RecentItemsCodec.MAX_ITEMS,
    ): List<RecentItem> {
        val key = groupKey(item)
        val kept = existing.filterNot { groupKey(it) == key }
        return (listOf(item) + kept).take(max)
    }

    /**
     * Retire l'entrée que l'utilisateur désigne, **et tout ce qui partage sa place**.
     *
     * Sur une série, la carte affichée est celle du dernier épisode : la retirer doit
     * retirer la série, pas seulement cet épisode. Sans cela, une entrée d'un épisode
     * antérieur — écrite avant que le regroupement n'existe — reprendrait aussitôt la
     * place, et la suppression paraîtrait sans effet (§8.15).
     */
    fun remove(existing: List<RecentItem>, id: String): List<RecentItem> {
        val target = existing.firstOrNull { it.id == id }
            ?: return existing.filterNot { it.id == id }
        val key = groupKey(target)
        return existing.filterNot { groupKey(it) == key }
    }

    private const val TYPE_SERIES = "series"
}
