package com.purple.iptvplayer.core.player

/** Une piste audio ou de sous-titres, réduite à ce qui sert à choisir une version. */
data class TrackInfo(
    /** Identifiant opaque, rendu tel quel à l'UI pour retrouver la piste ExoPlayer. */
    val id: String,
    val language: String?,
    val label: String? = null,
    /**
     * Drapeau *forced* du conteneur. **Ne suffit pas** : beaucoup de fichiers ne le
     * posent pas et ne signalent la piste forcée que par son titre — voir
     * [VersionPolicy.isForcedTrack].
     */
    val isForced: Boolean = false,
)

/** Version de visionnage proposée à l'utilisateur. */
enum class VersionMode { VF, VOSTFR }

/** Pistes à appliquer pour une version. [subtitle] à `null` signifie « sous-titres coupés ». */
data class VersionChoice(
    val audio: TrackInfo?,
    val subtitle: TrackInfo?,
)

/**
 * Choix VF / VOSTFR à partir des pistes réellement présentes dans le média.
 *
 * Logique pure et testée (règle §4 du CLAUDE.md), et **partagée par les deux UI** :
 * la sélection de pistes était déjà dupliquée entre `PlayerScreen` et
 * `TvPlayerScreen`, ce qui a produit la divergence de §28.
 */
object VersionPolicy {

    private val FRENCH = setOf("fr", "fra", "fre", "french", "francais", "français")

    /**
     * « forced », « forcé », « forcés »… en **mot entier**.
     *
     * La limite de mot est ce qui empêche d'écarter à tort un titre comme
     * « Reinforced Edition », où la sous-chaîne apparaît sans que la piste soit forcée.
     */
    private val FORCED_LABEL = Regex("""\bforc(?:ed?|és?|ées?)\b""", RegexOption.IGNORE_CASE)

    /**
     * Le code de langue varie selon le conteneur et la normalisation d'ExoPlayer :
     * `fr`, `fra`, `fre`, et les variantes régionales `fr-FR` / `fr-CA`.
     */
    /**
     * Une piste ne portant que les passages en langue étrangère, donc inutilisable
     * comme sous-titrage complet.
     *
     * Deux sources, et il faut les deux : relevé à l'octet sur le catalogue réel, un
     * même fournisseur livre « FR Forced » avec `forced=1` sur un film et « Forced »
     * avec `forced=0` sur un autre. S'en tenir au drapeau du conteneur laissait donc
     * choisir la piste forcée — le symptôme même décrit dans `raf.md`.
     */
    fun isForcedTrack(track: TrackInfo): Boolean =
        track.isForced || (track.label?.let { FORCED_LABEL.containsMatchIn(it) } ?: false)

    fun isFrench(language: String?): Boolean {
        val l = language?.trim()?.lowercase() ?: return false
        if (l in FRENCH) return true
        val base = l.substringBefore('-').substringBefore('_')
        return base in FRENCH
    }

    fun availableModes(audio: List<TrackInfo>, text: List<TrackInfo>): Set<VersionMode> {
        val modes = linkedSetOf<VersionMode>()
        if (frenchAudio(audio) != null) modes += VersionMode.VF
        if (originalAudio(audio) != null && frenchSubtitle(text) != null) modes += VersionMode.VOSTFR
        return modes
    }

    fun resolve(mode: VersionMode, audio: List<TrackInfo>, text: List<TrackInfo>): VersionChoice? =
        when (mode) {
            // VF : piste française, et sous-titres coupés — on ne sous-titre pas un
            // doublage dans sa propre langue.
            VersionMode.VF -> frenchAudio(audio)?.let { VersionChoice(it, null) }
            VersionMode.VOSTFR -> {
                val a = originalAudio(audio)
                val s = frenchSubtitle(text)
                if (a != null && s != null) VersionChoice(a, s) else null
            }
        }

    /**
     * Version actuellement à l'écran, déduite des pistes réellement sélectionnées.
     *
     * Sert à marquer le bouton sans mémoriser d'état parallèle : la vérité est ce que
     * le lecteur joue, pas ce que l'on croit avoir demandé. Rend `null` quand la
     * combinaison ne correspond à aucune des deux versions (audio étranger sans
     * sous-titres français, par exemple).
     */
    fun detect(selectedAudio: TrackInfo?, selectedSubtitle: TrackInfo?): VersionMode? = when {
        selectedAudio == null -> null
        isFrench(selectedAudio.language) -> VersionMode.VF
        selectedSubtitle != null && isFrench(selectedSubtitle.language) -> VersionMode.VOSTFR
        else -> null
    }

    private fun frenchAudio(audio: List<TrackInfo>): TrackInfo? =
        audio.firstOrNull { isFrench(it.language) && !isForcedTrack(it) }
            ?: audio.firstOrNull { isFrench(it.language) }

    /** Version originale : la première piste qui n'est pas française. */
    private fun originalAudio(audio: List<TrackInfo>): TrackInfo? =
        audio.firstOrNull { !isFrench(it.language) && !isForcedTrack(it) }
            ?: audio.firstOrNull { !isFrench(it.language) }

    /**
     * Sous-titres français, **en évitant les pistes forcées**.
     *
     * C'est la cause du constat de `raf.md` : « la première piste de sous-titres ne
     * fonctionne quasi jamais, prendre la deuxième si elle existe ». Mesuré sur le
     * catalogue réel — la première piste FR est souvent marquée *forced*, et une
     * piste forcée ne contient que les passages en langue étrangère, pas les
     * dialogues. Elle paraît donc ne « rien afficher ».
     *
     * On corrige la cause plutôt que le symptôme : trier par index reviendrait à
     * espérer que l'ordre soit toujours le même, alors que le drapeau, lui, est porté
     * par le conteneur (`forced=1`, relevé à l'octet sur trois films du catalogue).
     */
    private fun frenchSubtitle(text: List<TrackInfo>): TrackInfo? =
        text.firstOrNull { isFrench(it.language) && !isForcedTrack(it) }
            ?: text.firstOrNull { isFrench(it.language) }
}
