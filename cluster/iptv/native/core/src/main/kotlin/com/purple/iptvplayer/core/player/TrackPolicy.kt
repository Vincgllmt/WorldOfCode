package com.purple.iptvplayer.core.player

/**
 * Ce que l'on a le droit de proposer dans le sélecteur de pistes, et sous quel nom.
 *
 * **Le défaut corrigé.** Les trois écrans de lecture — `PlayerScreen`, `TvPlayerScreen`,
 * et [PlayerService.selectVersion] — construisaient chacun leur propre liste de pistes
 * directement depuis `player.currentTracks`, et aucun ne consultait
 * `Tracks.Group.isTrackSupported`. Une piste que l'appareil ne sait pas décoder (E-AC3,
 * DTS, TrueHD sur un boîtier d'entrée de gamme) y figurait comme les autres ; la choisir
 * fait échouer l'initialisation du décodeur, ExoPlayer lève, et l'écran de lecture bascule
 * sur le bloc d'erreur du §45. Troisième écriture de la même décision, donc troisième
 * occurrence du motif §8.2 : elle remonte ici.
 *
 * Le second défaut est plus discret : le libellé était `langue ?: label ?: "Piste n"`,
 * **dans cet ordre**. Deux pistes françaises — un AC3 5.1 et un AAC stéréo — s'affichaient
 * donc toutes deux « français », sans rien pour les distinguer. On ne pouvait pas savoir
 * ce que l'on venait de sélectionner.
 */
object TrackPolicy {

    /**
     * Une piste non prise en charge reste **affichée** — la masquer ferait croire à un
     * média mono-piste, alors que le fichier la contient bel et bien (§8.6). Elle n'est
     * simplement pas choisissable.
     */
    fun isSelectable(track: TrackInfo): Boolean = track.isSupported

    /** La sélection demandée est-elle applicable ? `null` = « aucune piste », toujours valide. */
    fun canSelect(track: TrackInfo?): Boolean = track == null || isSelectable(track)

    /**
     * Nom affiché d'une piste.
     *
     * @param languageName nom de la langue déjà résolu par l'appelant (`Locale`), pour que
     *   cette décision reste testable sans dépendre de la locale de la machine.
     * @param fallback libellé de repli, numéroté, quand la piste ne porte ni langue ni titre.
     * @param forcedSuffix mention à accoler à une piste forcée ; `null` pour ne rien ajouter.
     * @param languageAliases autres écritures de la même langue — le code ISO, le nom
     *   anglais… Un titre qui n'est qu'une de ces écritures n'apporte rien et n'est pas
     *   accolé. **Égalité stricte, sans heuristique de sous-chaîne** : deviner qu'un titre
     *   « répète » la langue reviendrait à faire ce que fait `decodeIfNeeded` côté Flutter
     *   (cf. dette §7), et ferait disparaître un titre porteur d'information. Un libellé
     *   redondant est un moindre mal ; un libellé perdu, non.
     *
     * La langue **et** le titre quand les deux existent et n'apportent pas la même
     * information : c'est ce qui distingue deux pistes de même langue.
     */
    fun label(
        track: TrackInfo,
        languageName: String?,
        fallback: String,
        forcedSuffix: String? = null,
        languageAliases: Set<String> = emptySet(),
    ): String {
        val lang  = languageName?.trim()?.takeIf { it.isNotEmpty() }
        val title = track.label?.trim()?.takeIf { it.isNotEmpty() }

        val aliases = (languageAliases + setOfNotNull(lang, track.language)).map(::fold).toSet()

        val base = when {
            lang != null && title != null && fold(title) !in aliases -> "$lang — $title"
            lang  != null -> lang
            title != null -> title
            else          -> fallback
        }
        // Le suffixe « forcés » n'est ajouté que s'il n'est pas déjà dans le titre : les
        // fournisseurs écrivent souvent « FR Forced » eux-mêmes, et « FR Forced (forcés) »
        // serait du bruit.
        return if (forcedSuffix != null &&
                   VersionPolicy.isForcedTrack(track) &&
                   !base.contains(forcedSuffix, ignoreCase = true)) {
            "$base $forcedSuffix"
        } else {
            base
        }
    }

    /**
     * Autres écritures du même code de langue : le code tel quel, sa forme courte, et son
     * nom anglais — c'est presque toujours l'une des trois que les fournisseurs mettent
     * dans le titre de la piste (« fre », « fr », « French »).
     */
    fun languageAliases(code: String?): Set<String> {
        val c = code?.trim()?.takeIf { it.isNotEmpty() } ?: return emptySet()
        val locale = runCatching { java.util.Locale.forLanguageTag(c.replace('_', '-')) }.getOrNull()
        return setOfNotNull(
            c,
            locale?.language?.takeIf { it.isNotEmpty() },
            locale?.getDisplayLanguage(java.util.Locale.ENGLISH)?.takeIf { it.isNotEmpty() },
        )
    }

    private fun fold(s: String): String = s.lowercase()
        .replace('à', 'a').replace('â', 'a').replace('ä', 'a')
        .replace('é', 'e').replace('è', 'e').replace('ê', 'e').replace('ë', 'e')
        .replace('î', 'i').replace('ï', 'i')
        .replace('ô', 'o').replace('ö', 'o')
        .replace('ù', 'u').replace('û', 'u').replace('ü', 'u')
        .replace('ç', 'c')
        .filter { it.isLetterOrDigit() }
}
