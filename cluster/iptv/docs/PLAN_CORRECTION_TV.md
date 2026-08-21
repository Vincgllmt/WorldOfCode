# Plan de correction — `app-tv` au D-pad

Transformation de [`AUDIT_TV_UX.md`](../AUDIT_TV_UX.md) (28 défauts : 4 bloquants,
15 gênants, 9 mineurs) en spécifications d'implémentation.

| | |
|---|---|
| Date | 2026-08-21 |
| Périmètre | `native/app-tv` uniquement — sauf §1.5 (G1) qui touche `core` |
| Socle | Compose BOM 2024.09 (Compose 1.7), `androidx.tv:tv-material 1.0.0`, Kotlin 2.0, minSdk 23 |
| Base de code lue | `TvNavGraph`, `TvMainScreen`, `TvSetupScreen`, `TvPurchaseScreen`, `TvPlayerScreen`, `TvHomeScreen`, `TvMoviesScreen`, `TvMyListScreen`, `TvDownloadsScreen`, `TvChannelRow`, `TvTheme` |

---

> **État au 2026-08-21. Les sept lots sont livrés** (`docs/JOURNAL.md` §43 à §48) :
> **231 tests, 0 échec**, les 28 défauts traités. Reste dû : la vérification D-pad de G7 et
> G9, celle de G13 et M9 (qui exigent un flux qui démarre), et la validation de M3 sur un
> téléviseur réel. Trois corrections du plan en sont sorties, toutes trouvées à
> l'émulateur :
>
> 1. **B4 était incomplet** — `Main` est une destination du `TvNavGraph` mais six onglets
>    pour l'utilisateur, donc `RETOUR` quittait l'application depuis les Paramètres. D'où
>    `TvTabBackPolicy` (fiche B4).
> 2. **L'ordre des modifiers était faux dans tout le plan** — `focusProperties` s'applique
>    à la cible qui le **suit**, donc `.focusGroup().focusProperties {}` ne configure pas le
>    groupe. Écrire `.focusProperties {}.focusGroup()`. Sans cela G4 ne fonctionne pas.
> 3. **G6 volait le focus à G5** — la note de la fiche G6 l'annonçait ; c'est arrivé. Le
>    point d'entrée doit s'effacer tant que `anchor.pending != null`.
> 4. **G1 ne venait pas de l'UI TV** — `PlayerStatus.ERROR` est écrasé par le `STATE_IDLE`
>    qui suit `onPlayerError`, dans `core`. Le bloc d'erreur du **mobile**, donné par
>    l'audit comme la référence à porter, n'avait donc jamais fonctionné non plus.
> 5. **G10 : « 9,4 : 1 » était faux, c'est 6,00** — et l'accent *pressé* étant plus sombre
>    que l'accent focalisé, le contenu doit **suivre la clarté du fond** au lieu d'être
>    uniforme, sinon on dégrade l'état pressé en corrigeant le focus.
> 6. **`dpadPageJump` ne peut pas être synchrone** — dans une liste paresseuse, les
>    éléments suivants ne sont composés qu'après un passage de mise en page ; la boucle du
>    lot 0 ne déplaçait le focus que d'**une** ligne. Il faut rendre la main d'une frame
>    entre chaque `moveFocus`.
> 7. **La suggestion #3 de G11 n'apporte pas le gain annoncé** — mesuré : le coût
>    horizontal `genre → chaîne` est inchangé, l'étoile de la ligne focalisée restant sur
>    le trajet. Cf. §47.
>
> Les lots 3 à 6 restent à faire, plus la vérification D-pad de G7, G8 et G9.

## Note préalable sur les APIs

La consigne demandait de privilégier `androidx.tv.foundation` et `androidx.tv.material`.
**La première moitié n'est plus la bonne cible** : `androidx.tv:tv-foundation` est déprécié
depuis la 1.0.0 — `TvLazyColumn` / `TvLazyRow` / `TvLazyVerticalGrid` ont été repliés dans
`androidx.compose.foundation.lazy`, qui gère depuis Compose 1.7 le focus et le défilement
TV nativement. Google recommande `androidx.tv.material3` **+ `androidx.compose.foundation`
standard**.

C'est déjà ce que fait le code : zéro import `androidx.tv.foundation` dans les 18 fichiers
de `app-tv`, et des `LazyColumn` / `LazyRow` / `LazyVerticalGrid` standards partout. La
dépendance est déclarée sans être utilisée :

```kotlin
// app-tv/build.gradle.kts:95 — à supprimer, aucun import ne la référence
implementation(libs.androidx.tv.foundation)
```

Toutes les solutions ci-dessous respectent donc la consigne dans son intention —
navigation Leanback, APIs TV officielles — en utilisant `androidx.tv.material3` pour les
surfaces focalisables et `androidx.compose.ui.focus` pour la mécanique de focus, qui est
l'endroit où vit `FocusProperties` (`enter` / `exit` / `canFocus`). Aucune correction
n'introduit de dépendance nouvelle.

---

## 1. Plan d'action

### 1.1 Le principe de découpe

L'audit le dit lui-même : **21 des 28 défauts sont des défauts de focus**, et onze d'entre
eux partagent une racine unique — *quand l'élément focalisé disparaît, Compose donne le
focus au focalisable le plus proche, et le rail est le candidat permanent*.

Corriger onze fois la même racine, écran par écran, c'est reproduire l'erreur que
`CLAUDE.md` §8.2 documente déjà pour ce projet (« une décision écrite deux fois finit
toujours par diverger »). Le plan commence donc par **extraire quatre primitives de focus**
dans un fichier partagé, puis les applique. Chaque correction d'écran devient une ligne,
pas une réimplémentation.

Second principe, tiré de §8.14 : **une correction de focus trop large piège le focus**, ce
qui est pire que le défaut corrigé. Chaque garde-fou proposé ci-dessous laisse donc au
moins une issue explicite, et cette issue est nommée dans la fiche.

### 1.2 Les six lots

| Lot | Contenu | Défauts | Priorité | Fichiers touchés | État |
|---|---|---|---|---|---|
| **0** | Primitives de focus partagées | — | **Prérequis** | 1 fichier neuf | ✅ livré §43 |
| **1** | Portes fermées : se connecter, revenir, sortir, payer | B1 B4 B2 B3 | **Bloquant** | 4 | ✅ livré et **vérifié à l'émulateur** §43 |
| **2** | Focus & rail : arrivée, sortie, restauration | G2 G3 G4 G5 G6 G9 G7 | **Bloquant de confort** | 5 | ✅ livré §44 — G2·G3·G4·G5·G6 vérifiés ; G7·G9 non vérifiés |
| **3** | Lecteur : dire ce qui se passe | G1 G13 M1 M9 | Gênant | 2 + res + `core` | ✅ livré §45 — G1 vérifié ; G13·M9 non testables sans flux |
| **4** | Lisibilité à distance de canapé | G10 M3 M6 | Gênant | 3 | ✅ livré §46 — vérifié à l'écran ; reste à valider sur un vrai téléviseur |
| **5** | Coût D-pad : sauts, densité, deux panneaux | G8 G11 G12 G15 | Gênant | 4 | ✅ livré §47 — tous vérifiés ; G11 n'apporte pas le gain annoncé |
| **6** | Finitions | G14 M2 M4 M5 M7 M8 | Amélioration | 5 + res | ✅ livré §48 (G14 et M4 dès §43) |

### 1.3 Ordre et dépendances

```
Lot 0  ─┬─────────────────────────────────────────────┐
        │                                             │
Lot 1   ├─ B1 (champs)      indépendant               │
        ├─ B4 (BackHandler) ──► conditionne G4, G5    │
        ├─ B2 (paywall)     indépendant               │
        └─ B3 (scroll)      indépendant               │
                                                      │
Lot 2   ┌─ G5 (ancre de focus) ◄── B4                 │
        ├─ G4 (piège modal)   ◄── B4  (G4 sans B4 = focus enfermé)
        ├─ G2 (rail) ◄── G5 : G5 supprime la CAUSE, G2 l'EFFET
        ├─ G3, G6, G9 (points d'entrée) ◄── Lot 0
        └─ G7 (onglet vide)   indépendant
                                                      │
Lot 3-6 ─────────────────────────────────────────────┘  aucune dépendance croisée
```

Trois arêtes seulement, mais elles sont contraignantes :

1. **B4 avant G4.** G4 piège le focus dans la fiche détail. Sans `BackHandler`, la fiche
   n'a plus aucune sortie : on remplace une fuite par une prison. `TvMovieDetailPage` a
   déjà son `BackHandler` (`TvMoviesScreen.kt:463`), mais `RETOUR` n'y arrive pas — cf. B4.
2. **G5 avant G2.** G2 (« le rail s'ouvre tout seul ») est un *symptôme* : le focus tombe
   dans le rail parce qu'il n'a nulle part où retourner. G5 lui donne cette destination.
   Traiter G2 seul — en découplant le dépliage du focus — masque le symptôme et laisse le
   focus perdu.
3. **Lot 0 avant tout le reste du Lot 2.**

### 1.4 Ce que le plan ne fait pas

- **G11 point 2 (index A→Z)** et **G12 (vraie grille paginée)** sont des refontes
  d'écran, pas des correctifs. Le lot 5 livre le rapport coût/bénéfice maximal
  (`PAGE_UP`/`PAGE_DOWN` + en-tête de genre lisible) et laisse la refonte hors périmètre.
- **M3 (34 tailles de police sous 14 sp)** est spécifié ici comme une modification de
  `PurpleType` + un plancher, mais l'audit note lui-même que la validation demande un
  téléviseur de 50 pouces à trois mètres. Le plan livre les valeurs ; la validation reste
  à faire hors émulateur.
- **G14** suppose que `activity.recreate()` reste le mécanisme de changement de langue.
  Le remplacer par `AppCompatDelegate.setApplicationLocales` supprimerait le défaut à la
  racine mais impose `appcompat` sur `app-tv`, qui ne l'a pas. Le plan propose la
  restauration d'état, moins invasive.

### 1.5 Protocole de vérification — non négociable

`CLAUDE.md` §8.14 et le rappel de méthode de l'audit disent la même chose : **le §40 de ce
projet documente un cas où le correctif du §23 est devenu la cause du défaut suivant.**

Chaque lot se rejoue à l'émulateur `purple_tv` (§11) avec le relevé qui a servi à l'audit :

```bash
adb shell input keyevent 20        # ▼   19 ▲ · 21 ◀ · 22 ▶ · 23 OK · 4 RETOUR
adb shell uiautomator dump /sdcard/w.xml && adb pull /sdcard/w.xml - \
  | grep -o 'focused="true"[^>]*bounds="[^"]*"'
adb shell dumpsys input_method | grep mInputShown    # piège du clavier, §8.12
```

Et le **test de non-régression du lot précédent** est rejoué avec le lot courant : les
sept acquis listés au §5 de l'audit (repérage du focus, trois états du panneau des genres,
clavier à la demande, rail qui ne happe plus au lancement, garde-fou vertical du §30,
composition de la fiche film, minuteur de l'overlay) sont la liste de contrôle.

La logique extraite en objets purs (`TvPageJump`, plancher typographique) se teste en plus
dans `core` ou `app-tv/src/test/` — mais l'essentiel du Lot 0 est de la mécanique de
focus, qui ne se prouve qu'à l'écran.

---

## Lot 0 — Primitives de focus partagées

**Priorité : prérequis.** Aucun défaut ne lui correspond ; il en désamorce onze.

Fichier neuf : `app-tv/src/main/kotlin/com/purple/iptvplayer/tv/ui/common/TvFocusKit.kt`.

Quatre primitives, chacune répondant à un motif récurrent relevé par l'audit :

| Primitive | Motif traité | Défauts servis |
|---|---|---|
| `TvFocusAnchor` + `Modifier.focusAnchor` | rendre le focus à l'élément qui a ouvert une page | G5, G2, G14 |
| `Modifier.tvModalTrap` | une page modale ne laisse pas fuir le focus | G4 |
| `Modifier.tvGroupEntry` | un groupe impose son point d'entrée au lieu du plus proche voisin | G3, G6, G9 |
| `Modifier.dpadPageJump` | `PAGE_UP`/`PAGE_DOWN` déplacent le focus au lieu de le détruire | G8, G11 |

```kotlin
package com.purple.iptvplayer.tv.ui.common

import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.*
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalFocusManager
import kotlinx.coroutines.withFrameNanos

// ── 1. Ancre de focus ─────────────────────────────────────────────────────────

/**
 * Mémorise **quel** élément doit reprendre le focus quand une page se ferme.
 *
 * Le motif corrigé : fermer une fiche détruit l'élément focalisé, Compose retombe sur le
 * focalisable le plus proche de l'arbre — le rail, toujours présent à gauche — qui se
 * déplie alors « tout seul » (G2). Rendre le focus à son point de départ supprime la
 * cause ; découpler le dépliage ne masquerait que l'effet.
 *
 * L'identité est une **clé de donnée** (id de film, nom de genre), pas un FocusRequester :
 * dans une liste paresseuse, le nœud qui portait le requester a pu être recyclé.
 */
@Stable
class TvFocusAnchor {
    /** Clé de l'élément qui a ouvert la page courante. */
    var origin: Any? by mutableStateOf(null)
        private set

    /** Clé à re-focaliser maintenant ; `null` quand il n'y a rien à restaurer. */
    var pending: Any? by mutableStateOf(null)
        internal set

    /** À appeler juste avant d'ouvrir une page depuis [key]. */
    fun rememberOrigin(key: Any?) { origin = key }

    /** À appeler sur toutes les voies de fermeture — RETOUR *et* bouton « Fermer ». */
    fun restore() { pending = origin; origin = null }
}

@Composable
fun rememberTvFocusAnchor(): TvFocusAnchor = remember { TvFocusAnchor() }

/**
 * À poser sur l'élément identifié par [key]. Il réclame le focus quand l'ancre le désigne.
 *
 * ⚠️ **Limite** : un `FocusRequester` n'est réclamable que si son nœud est composé. Dans
 * une `LazyColumn`/`LazyRow`, un élément défilé hors de la fenêtre ne l'est pas. Il faut
 * donc **restaurer la position de liste avant l'ancre** — cf. la note « états de liste
 * hissés » de la fiche G5.
 */
@Composable
fun Modifier.focusAnchor(anchor: TvFocusAnchor, key: Any): Modifier {
    val requester = remember { FocusRequester() }
    LaunchedEffect(anchor.pending) {
        if (anchor.pending == key) {
            // Laisser la recomposition attacher le nœud avant de réclamer le focus :
            // même précaution que TvSearchBar (TvHomeScreen.kt:262) pour `canFocus`.
            withFrameNanos { }
            runCatching { requester.requestFocus() }
            anchor.pending = null
        }
    }
    return this.focusRequester(requester)
}

// ── 2. Piège modal ────────────────────────────────────────────────────────────

/**
 * Une page qui se comporte comme une modale garde le focus **jusqu'à sa fermeture**.
 *
 * Symétrique du garde-fou posé côté rail au §30 : celui-là interdit l'entrée verticale,
 * celui-ci interdit la sortie dans les quatre directions.
 *
 * ⚠️ **Contrat** : n'appeler que sur un contenu qui possède déjà un `BackHandler`, sinon
 * le focus est enfermé sans issue — défaut pire que celui corrigé (§8.14).
 */
@OptIn(ExperimentalComposeUiApi::class)
fun Modifier.tvModalTrap(): Modifier = this
    // ⚠️ L'ORDRE COMPTE — cf. §44. `focusProperties` s'applique à la cible de focus qui le
    // SUIT dans la chaîne, et `focusGroup()` vaut `focusProperties{}.focusTarget()`.
    // `.focusGroup().focusProperties {}` pose donc les propriétés APRÈS la cible : elles
    // retombent sur les enfants, où `exit` ne veut rien dire, et G4 ne marche pas.
    .focusProperties { exit = { FocusRequester.Cancel } }
    .focusGroup()

// ── 3. Point d'entrée d'un groupe ─────────────────────────────────────────────

/**
 * Impose le point d'entrée d'un groupe au lieu de laisser Compose choisir le focalisable
 * géométriquement le plus proche.
 *
 * C'est la réponse à trois défauts de même nature : entrer dans le rail ne menait pas à
 * l'onglet courant (G3), entrer dans un onglet tombait sur la barre de recherche (G6),
 * descendre de la barre de recherche sautait le premier résultat (G9).
 *
 * `enter` est appelé pendant la **recherche** de focus, pas à la composition : c'est
 * précisément ce qui distingue cette approche du `LaunchedEffect` retiré au §40, qui
 * happait le focus au lancement.
 *
 * @param blocked directions par lesquelles on refuse l'entrée (`Cancel`).
 * @param target  requester à privilégier ; `null` ⇒ comportement par défaut. Doit être
 *                attaché à un nœud composé, sinon `Default` est rendu.
 */
@OptIn(ExperimentalComposeUiApi::class)
fun Modifier.tvGroupEntry(
    blocked: Set<FocusDirection> = emptySet(),
    target: () -> FocusRequester? = { null },
): Modifier = this
    .focusGroup()
    .focusProperties {
        enter = { direction ->
            when {
                direction in blocked -> FocusRequester.Cancel
                else                 -> target() ?: FocusRequester.Default
            }
        }
    }

// ── 4. Saut de page ───────────────────────────────────────────────────────────

/**
 * Rend `PAGE_UP` / `PAGE_DOWN` — et leurs jumelles `CHANNEL_UP` / `CHANNEL_DOWN`, que
 * beaucoup de box émettent sous l'étiquette chaîne +/− — utiles au lieu de nuisibles.
 *
 * Le défaut mesuré (G8) : ces touches font défiler la liste, l'élément focalisé est
 * recyclé, et **plus aucun nœud n'a le focus** — l'application paraît figée. On ne laisse
 * donc pas la liste défiler seule : on déplace le focus [pageSize] fois, et le
 * défilement suit le focus. C'est aussi la réponse la moins coûteuse à G11.
 *
 * `moveFocus` renvoie `false` quand il n'y a plus rien : on s'arrête, ce qui rend le
 * comportement correct en début et en fin de liste.
 */
@Composable
fun Modifier.dpadPageJump(pageSize: Int = 8): Modifier {
    val focusManager = LocalFocusManager.current
    return this.onPreviewKeyEvent { event ->
        if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
        val direction = when (event.key) {
            Key.PageDown, Key.ChannelDown -> FocusDirection.Down
            Key.PageUp,   Key.ChannelUp   -> FocusDirection.Up
            else -> return@onPreviewKeyEvent false
        }
        // `repeat { return@repeat }` ne ferait que passer à l'itération suivante :
        // il faut une vraie boucle pour s'arrêter proprement en bout de liste.
        for (step in 0 until pageSize) {
            if (!focusManager.moveFocus(direction)) break
        }
        true   // consommée dans tous les cas : sinon la liste défile *en plus*
    }
}

---

## Lot 1 — Portes fermées

### B1 — Les champs de saisie piègent le focus

- **Fichier** : `app-tv/…/ui/setup/TvSetupScreen.kt:349` (`TvFormField`)
- **Priorité : Bloquant — à traiter en premier.** C'est le premier écran de l'application ;
  sans lui, un nouvel utilisateur TV ne peut pas se connecter par identifiants.

**Cause racine.** `TvFormField` enveloppe un `OutlinedTextField` Material3 nu. Deux
conséquences, et ce sont **deux mécanismes distincts** qu'il faut traiter séparément :

1. *Le champ est focalisable en permanence.* Le focus y entre au simple passage, le
   `TextField` demande l'IME, et le clavier virtuel Leanback avale haut / bas / gauche /
   droite avant que Compose ne les voie. Rien ne sort du champ.
2. *Même clavier fermé, le champ consomme les directions.* `BasicTextField` traite
   `DPAD_UP`/`DOWN` comme des déplacements de curseur et **retourne consommé**, y compris
   sur une ligne unique. `moveFocus` n'est jamais appelé.

Et `DPAD_CENTER` ne rouvre pas le clavier parce que rien ne l'écoute : `OutlinedTextField`
ouvre l'IME sur *acquisition du focus*, pas sur validation — or le champ a déjà le focus.
Seul `KEYCODE_ENTER`, que le `TextField` interprète nativement, le rouvre.

**Ce correctif existe déjà dans le projet.** `TvSearchBar`
(`TvHomeScreen.kt:249-334`, §22 + §26) résout exactement ces trois points, et l'audit
confirme au §5 qu'il tient. Le défaut est que `TvSetupScreen` ne l'a jamais reçu — c'est
une neuvième occurrence du motif « décision écrite deux fois » (§8.2).

**Solution recommandée.** Aligner `TvFormField` sur `TvSearchBar`, en trois gestes :

- `focusProperties { canFocus = editing }` sur le `BasicTextField` interne → le champ
  n'entre dans le parcours qu'une fois activé ;
- `clickable { editing = true }` sur le conteneur → c'est **lui** qui est focalisable, et
  `clickable` traite nativement `DPAD_CENTER` comme un clic (c'est ce qui manque
  aujourd'hui) ;
- `onPreviewKeyEvent` haut/bas délégué à `focusManager.moveFocus` → l'issue existe même
  clavier ouvert, et on ne consomme pas la touche quand `moveFocus` échoue.

Ajout propre à cet écran : un `ImeAction.Next` qui **avance le focus** au lieu de compter
sur la touche « suivant » du clavier virtuel (neuf appuis mesurés).

```kotlin
// app-tv/…/ui/setup/TvSetupScreen.kt — remplace TvFormField
@Composable
private fun TvFormField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: ImageVector,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailingIcon: (@Composable () -> Unit)? = null,
    imeAction: ImeAction = ImeAction.Next,
    onDone: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val focusManager = LocalFocusManager.current
    var isFocused by remember { mutableStateOf(false) }

    // Même invariant que TvSearchBar (§26) : le champ n'est saisissable qu'une fois
    // **validé**. Sans cela le focus y entre au passage, l'IME s'ouvre, et le clavier
    // Leanback avale les quatre directions — le champ devient un cul-de-sac.
    var editing by remember { mutableStateOf(false) }
    val fieldFocus = remember { FocusRequester() }

    LaunchedEffect(editing) {
        if (editing) {
            withFrameNanos { }          // laisser `canFocus = true` s'appliquer
            runCatching { fieldFocus.requestFocus() }
        }
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            // Interception AVANT le champ : un TextField consomme haut/bas même sur une
            // ligne unique. `moveFocus` renvoie false s'il n'y a rien dans la direction
            // demandée — on laisse alors passer plutôt que d'avaler la touche.
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionDown -> focusManager.moveFocus(FocusDirection.Down)
                    Key.DirectionUp   -> focusManager.moveFocus(FocusDirection.Up)
                    Key.Back          -> { if (editing) { editing = false; true } else false }
                    else              -> false
                }
            }
            .border(
                width = if (isFocused) 2.5.dp else 1.dp,
                color = if (isFocused) TvPurpleGlow else TvBorder,
                shape = RoundedCornerShape(14.dp),
            )
            .clip(RoundedCornerShape(14.dp))
            .background(if (isFocused) TvBgSurface else TvBgHome)
            .onFocusChanged { isFocused = it.hasFocus; if (!it.hasFocus) editing = false }
            // `clickable` rend focalisable ET traite DPAD_CENTER comme un clic : c'est ce
            // qui manquait — seul KEYCODE_ENTER rouvrait le clavier, touche absente des
            // vraies télécommandes.
            .clickable { editing = true }
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(icon, null, tint = if (isFocused) TvPurpleGlow else TvPurple,
             modifier = Modifier.size(18.dp))

        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(label, color = TvTextSub.copy(0.5f), fontSize = 13.sp)
            }
            BasicTextField(
                value           = value,
                onValueChange   = onValueChange,
                singleLine      = true,
                textStyle       = LocalTextStyle.current.copy(color = TvTextPrimary, fontSize = 14.sp),
                cursorBrush     = SolidColor(TvPurpleGlow),
                visualTransformation = visualTransformation,
                keyboardOptions = KeyboardOptions(imeAction = imeAction, keyboardType = KeyboardType.Uri),
                // Le clavier virtuel TV facture neuf appuis pour atteindre sa touche
                // « suivant ». On avance le focus nous-mêmes.
                keyboardActions = KeyboardActions(
                    onNext = { editing = false; focusManager.moveFocus(FocusDirection.Down) },
                    onDone = { editing = false; onDone?.invoke() },
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(fieldFocus)
                    .focusProperties { canFocus = editing },
            )
        }
        trailingIcon?.invoke()
    }
}
```

**Vérification.** Sur l'onglet *Identifiants* : `▼` doit enchaîner Serveur → Utilisateur →
Mot de passe → Se connecter sans jamais ouvrir le clavier ; `OK` sur un champ doit donner
`mInputShown=true` ; `RETOUR` doit refermer le clavier **sans quitter l'application**.

---

### B4 — RETOUR ne navigue jamais : il quitte l'application

- **Fichiers** : `app-tv/…/ui/navigation/TvNavGraph.kt`, `app-tv/…/ui/player/TvPlayerScreen.kt:118-137`
- **Priorité : Bloquant — deuxième.** Il conditionne le confort de tous les autres écrans
  et il est **prérequis de G4**.

**Cause racine — deux causes superposées, et la seconde annulerait le correctif de la
première si on l'oubliait.**

1. `TvNavGraph` est une machine à états `when (currentScreen)` sans pile de navigation et
   sans `BackHandler`. Aucun composant n'inscrit de callback auprès de
   l'`OnBackPressedDispatcher`, donc `KEYCODE_BACK` traverse jusqu'à l'`Activity`, qui se
   termine. L'import `androidx.activity.compose.BackHandler` présent mais inutilisé dans
   `TvMainScreen.kt:47` montre que l'intention existait.

2. **Dans le lecteur, un `BackHandler` seul ne suffirait pas.** Le `Box` racine
   (`TvPlayerScreen.kt:123-137`) intercepte **tout** `KeyDown` et retourne `true` quand
   l'overlay est masqué :

   ```kotlin
   if (overlayVisible) false else { overlayVisible = true; true }
   ```

   `Key.Back` n'est pas excepté. Une valeur `true` consomme l'événement dans le dispatch
   Compose, `ComposeView.dispatchKeyEvent` renvoie `true`, l'`Activity` ne voit jamais la
   touche — et le dispatcher de retour n'est donc **jamais** notifié. C'est exactement la
   trace mesurée : deux appuis consommés par l'overlay, le troisième (overlay visible,
   `false` renvoyé) échappe à tout le monde et atteint le lanceur.

**Solution recommandée.**

- Marquer l'écran d'achat *barrière* comme tel (`TvScreen.Purchase(blocking = true)`) —
  la même donnée sert à B2 ;
- un `BackHandler` unique dans `TvNavGraph`, actif seulement là où un retour a un sens ;
- **exclure `Key.Back`** de l'interception du lecteur.

`Setup` et `Purchase(blocking = true)` restent volontairement sans `BackHandler` : `RETOUR`
depuis une racine quitte l'application, c'est le comportement Leanback attendu — et pour
la barrière, sortir vaut mieux que contourner (cf. B2).

```kotlin
// app-tv/…/ui/navigation/TvNavGraph.kt

sealed class TvScreen {
    object Setup : TvScreen()
    object Main  : TvScreen()
    /** @param blocking l'écran sert de **barrière** (accès expiré), pas d'ouverture
     *  volontaire depuis le badge. Cf. B2 et le mobile, `Routes.purchase(blocking)`. */
    data class Purchase(val blocking: Boolean = false) : TvScreen()
    data class Player(/* … inchangé … */) : TvScreen()
}

@Composable
fun TvNavGraph() {
    // …
    LaunchedEffect(Unit) {
        val creds  = credRepo.load()
        val access = trialVm.hasAccess.first { it != null }
        currentScreen = when {
            access == false -> TvScreen.Purchase(blocking = true)   // ← B2
            creds == null   -> TvScreen.Setup
            else            -> TvScreen.Main
        }
    }

    val screen = currentScreen

    // Une destination = une règle de retour. Ce qui n'est pas listé laisse la touche
    // remonter à l'Activity, donc quitte l'application : c'est le comportement voulu
    // depuis une racine (Main, Setup) et depuis la barrière d'achat.
    BackHandler(
        enabled = screen is TvScreen.Player ||
                  (screen is TvScreen.Purchase && !screen.blocking)
    ) {
        currentScreen = TvScreen.Main
    }

    when (screen) { /* … inchangé, sauf : … */
        is TvScreen.Purchase -> TvPurchaseScreen(
            onBack    = if (screen.blocking) null else ({ currentScreen = TvScreen.Main }),
            onSuccess = { currentScreen = TvScreen.Main },
        )
    }
}
```

```kotlin
// app-tv/…/ui/player/TvPlayerScreen.kt:123 — sans ceci, le BackHandler ci-dessus
// ne serait jamais notifié dans le lecteur.
.onKeyEvent { event ->
    if (event.type != KeyEventType.KeyDown) return@onKeyEvent false

    // RETOUR n'est pas une interaction de lecture : le consommer empêchait
    // ComposeView de rendre la main à l'Activity, donc l'OnBackPressedDispatcher
    // n'était jamais appelé et la touche finissait par éjecter vers le lanceur.
    if (event.key == Key.Back) return@onKeyEvent false

    lastInteractionMs = System.currentTimeMillis()
    if (overlayVisible) false else { overlayVisible = true; true }
}
```

**Vérification.** Depuis le lecteur, `RETOUR` ×1 ⇒ `topResumedActivity` reste
`com.purple.iptvplayer.tv` et l'écran affiche Direct TV. Depuis Main, `RETOUR` ⇒ lanceur.
Depuis la barrière d'achat, `RETOUR` ⇒ lanceur, **jamais** le catalogue.

> ⚠️ **Correction apportée après vérification à l'émulateur (§43).** Ce qui précède est
> **incomplet** : `Main` est *une* destination du `TvNavGraph` mais *six onglets* pour
> l'utilisateur. Mesuré — `Paramètres → RETOUR ⇒ topResumedActivity = tvlauncher`, alors
> que l'audit demandait de ne laisser la touche partir que **depuis l'écran d'accueil**.
>
> Il faut un second `BackHandler`, dans `TvMainScreen`, et l'ordre de ses cas compte :
>
> ```kotlin
> object TvTabBackPolicy {
>     const val HOME_INDEX = 0
>     sealed interface Action { object DismissOverlay: Action; object GoHome: Action; object Escape: Action }
>
>     fun actionFor(selectedIndex: Int, hasOpenOverlay: Boolean): Action = when {
>         hasOpenOverlay              -> Action.DismissOverlay   // d'abord ce qui est par-dessus
>         selectedIndex != HOME_INDEX -> Action.GoHome           // puis l'onglet
>         else                        -> Action.Escape           // et alors seulement, quitter
>     }
> }
> ```
>
> Conséquence de conception : l'état « confirmation de déconnexion ouverte » doit être
> **hissé** de `TvSettingsPage` vers `TvMainScreen`, sinon le `BackHandler` de Main ne peut
> pas la refermer et un seul appui ferait deux choses. Les `BackHandler` internes des
> onglets (`TvHomeScreen`, `TvMoviesScreen`) restent prioritaires : enregistrés plus tard,
> ils voient la touche en premier — un genre ouvert se referme donc avant tout le reste.

---

### B2 — La barrière d'expiration se contourne en deux appuis

- **Fichier** : `app-tv/…/ui/purchase/TvPurchaseScreen.kt:63`
- **Priorité : Bloquant — perte de revenu directe.** Deux lignes de code, plus le repli.

**Cause racine.** `TvPurchaseScreen` rend inconditionnellement
`TextButton(onClick = onBack)`, et `TvNavGraph` câble le même `onBack` pour les deux
chemins d'arrivée — ouverture volontaire depuis le badge d'essai, et barrière d'accès
expiré. Comme c'est en outre le **seul** focalisable de l'écran quand la facturation ne
renvoie aucune offre, `▼ OK` suffit à ouvrir le catalogue complet ; aucune revérification
n'a lieu ensuite. Le mobile a reçu ce correctif (P9, `onBack: (() -> Unit)?` nullable,
`PurchaseScreen.kt:38,99`) ; la TV non — dixième occurrence de §8.2.

**Solution recommandée.** Rendre `onBack` nullable comme sur mobile, `null` depuis la
branche barrière (le `TvNavGraph` corrigé en B4 le fait déjà), **et traiter l'avertissement
de l'audit** : sans « Plus tard », l'écran n'a plus aucun focalisable tant que la
facturation ne rend rien. On remplacerait une fuite par un écran mort.

Le repli n'est pas un simple « Réessayer » : `PurchaseViewModel` expose déjà
`loadProducts()` **et** `restorePurchases()` (`PurchaseViewModel.kt:47,72`). Un utilisateur
légitime dont le droit n'a pas été resynchronisé — cas documenté au §32 — doit pouvoir se
débloquer sans passer par un achat. Les deux actions sont donc offertes.

```kotlin
// app-tv/…/ui/purchase/TvPurchaseScreen.kt
@Composable
fun TvPurchaseScreen(onBack: (() -> Unit)?, onSuccess: () -> Unit) {
    // …
    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.Center) {
        // … titre, pitch …
        Spacer(Modifier.height(32.dp))

        // Absent quand l'écran sert de barrière — cf. PurchaseScreen mobile (P9).
        if (onBack != null) {
            TvActionButton(
                label   = stringResource(R.string.purchase_later),
                onClick = onBack,
                emphasis = TvEmphasis.Tertiary,   // bouton, pas lien souligné — cf. M4
            )
        }
    }

    // Colonne droite
    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        when {
            state is PurchaseScreenState.Loading -> CircularProgressIndicator(color = TvPurpleGlow)

            // Un écran de barrière ne doit JAMAIS avoir zéro focalisable : sans « Plus
            // tard », l'absence d'offre laisserait l'utilisateur devant un écran mort,
            // sans même pouvoir restaurer un achat existant (§32).
            products.isEmpty() -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    (state as? PurchaseScreenState.PurchaseError)?.message
                        ?: stringResource(R.string.purchase_none),
                    color = TvTextSub,
                )
                TvActionButton(
                    label    = stringResource(R.string.action_retry),
                    onClick  = { vm.loadProducts() },
                    emphasis = TvEmphasis.Primary,
                    modifier = Modifier.focusRequester(retryFocus),
                )
                TvActionButton(
                    label    = stringResource(R.string.action_restore),
                    onClick  = { vm.restorePurchases() },
                    emphasis = TvEmphasis.Secondary,
                )
            }

            else -> products.forEach { product -> TvPriceCard(/* … */) }
        }
    }

    // Le focus d'arrivée va à l'action, jamais à la sortie.
    LaunchedEffect(products.isEmpty(), state) {
        withFrameNanos { }
        runCatching { (if (products.isEmpty()) retryFocus else firstOfferFocus).requestFocus() }
    }
}
```

Chaînes à ajouter dans les **deux** `strings.xml` de `app-tv` (contrôle de parité §17) :
`action_retry`, `action_restore`.

**Vérification.** Injecter l'essai expiré via `mkprefs.py` + `run-as` (§3), lancer :
l'écran d'achat doit compter **au moins un** focalisable et **aucun** ne doit mener à Main.
`▼ ▼ OK` ne doit jamais afficher « Direct TV | 11899 CHAÎNES ».

---

### B3 — La déconnexion est hors de l'écran

- **Fichier** : `app-tv/…/ui/main/TvMainScreen.kt:512-528` (`TvSettingsPage`)
- **Priorité : Bloquant.** Sans elle, aucun changement de fournisseur possible sur TV.

**Cause racine — plus précise que « la carte dépasse ».** La carte est une `Column` dans un
`Box(fillMaxSize, contentAlignment = Center)`, avec le commentaire
`// Centred card — everything visible at a glance, no scroll needed`. Une `Column` mesure
ses enfants **avec la hauteur restante** : quand la contrainte est épuisée, les derniers
enfants sont mesurés à hauteur ~0.

C'est ce qui explique les deux symptômes mesurés, qui autrement se contrediraient :

- `▼` reste bloqué sur le toggle d'arrière-plan — la recherche de focus directionnelle
  (*beam search*) ne retient pas un nœud de hauteur nulle : le bouton n'est pas un
  candidat « en dessous » ;
- `▲` depuis la rangée des langues l'atteint — le rebouclage en fin de parcours emprunte
  un autre chemin et prend le dernier focalisable de l'ordre de composition ;
- il est « invisible, seul un liseré rouge dépasse » — c'est la bordure d'un nœud aplati.

**Solution recommandée.** `verticalScroll`. Ce n'est pas seulement du confort : un
conteneur défilable mesure ses enfants avec `Constraints.Infinity` en hauteur, donc chaque
enfant reprend sa taille naturelle et redevient un candidat de focus. Compose déclenche en
outre `bringIntoView` sur changement de focus dans un conteneur défilable — le bouton se
présente donc de lui-même.

S'ajoutent la marge de sécurité TV (5 %, `PurpleSpacing.TvSafeY = 54.dp` existe déjà) et
un `focusGroup` pour que le parcours reste interne à la carte.

```kotlin
// app-tv/…/ui/main/TvMainScreen.kt — TvSettingsPage
Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
    Column(
        modifier = Modifier
            .widthIn(max = 500.dp)
            .fillMaxHeight()
            // La carte dépassait 1080 px : la Column mesurait ses derniers enfants avec
            // une contrainte épuisée, donc à hauteur ~0 — d'où un bouton « Déconnexion »
            // invisible et hors du parcours de focus descendant.
            //
            // Un conteneur défilable mesure en hauteur non bornée : les enfants
            // reprennent leur taille, et `bringIntoView` amène le focalisé à l'écran.
            .verticalScroll(rememberScrollState())
            .focusGroup()
            .clip(PurpleShapes.Lg)
            .background(PurplePalette.Bg0)
            .padding(
                horizontal = 32.dp,
                vertical   = PurpleSpacing.TvSafeY,   // overscan 5 %, cf. M6
            ),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        // … contenu inchangé …
    }
}
```

**Note liée (G2).** L'audit relève que valider « Déconnexion » envoie le focus dans le rail
et le déplie. C'est le même symptôme que G2 : les deux boutons de confirmation remplacent
le bouton focalisé, qui disparaît. Le correctif est l'ancre du Lot 0 :

```kotlin
val logoutAnchor = rememberTvFocusAnchor()

if (!showLogoutConfirm) {
    TvSettingsButton(
        label   = stringResource(R.string.btn_logout),
        onClick = { logoutAnchor.rememberOrigin("logout"); showLogoutConfirm = true },
        modifier = Modifier.focusAnchor(logoutAnchor, "logout"),
        /* … */
    )
} else {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        TvSettingsButton(
            label    = stringResource(R.string.btn_cancel),
            // Annuler détruit ces deux boutons : sans ancre, le focus retombe dans le rail.
            onClick  = { showLogoutConfirm = false; logoutAnchor.restore() },
            modifier = Modifier.focusRequester(confirmFocus),
            /* … */
        )
        TvSettingsButton(label = stringResource(R.string.btn_logout), onClick = onSignOut, /* … */)
    }
    LaunchedEffect(Unit) { withFrameNanos { }; runCatching { confirmFocus.requestFocus() } }
}
```

**Vérification.** Depuis « Langue », `▼` doit atteindre « Déconnexion » **en le rendant
visible**, sans rebouclage. `OK` puis `RETOUR`/Annuler doit ramener le focus sur
« Déconnexion », rail replié.

---

## Lot 2 — Focus & rail

Sept défauts, **une racine commune** que l'audit formule bien : *quand l'élément focalisé
disparaît, ou qu'il n'y a rien dans la direction demandée, Compose TV donne le focus au
focalisable le plus proche — et le rail, toujours présent à gauche, est le candidat
permanent.*

Il y a en réalité **deux mécanismes distincts** sous cette phrase, et les confondre est ce
qui a produit le §40 :

| Mécanisme | Quand | Défauts | Outil |
|---|---|---|---|
| **Réattribution** — le nœud focalisé quitte la composition, Compose repart de la racine | fermeture d'une page, mutation de liste | G2, G5 | ancre (`TvFocusAnchor`) |
| **Recherche directionnelle** — il n'y a pas de candidat dans l'axe demandé, Compose élargit | bord de liste, bord d'écran | G3, G4, G6, G9 | `enter` / `exit` (`tvGroupEntry`, `tvModalTrap`) |

Un `LaunchedEffect` ne convient à **aucun** des deux : il s'exécute aussi à la première
composition (§40) et ne connaît pas la direction. C'est pourquoi tout le lot passe par
`FocusProperties` et par l'ancre.

**Ordre interne obligatoire : G5 → G4 → G2 → G3/G6/G9 → G7.**

---

### G5 — Fermer une fiche ne rend jamais le focus à l'affiche qu'on avait ouverte

- **Fichiers** : `TvMoviesScreen.kt:96-101, 104-140, 451-475`, `TvSeriesScreen.kt` (idem)
- **Priorité : Gênant — mais premier du lot**, parce qu'il supprime la cause de G2.

**Cause racine — trois pertes cumulées, dont deux sont invisibles dans le code.**

1. **Le focus est explicitement effacé, pas restauré.** `TvMoviesScreen.kt:96-101` :

   ```kotlin
   LaunchedEffect(selectedMovieId) {
       if (selectedMovieId == null) { delay(30); focusManager.clearFocus() }
   }
   ```

   `clearFocus()` rend le focus à la racine. Compose descend alors au premier focalisable
   de l'arbre — le rail. C'est la trace « fermeture par RETOUR ⇒ focus rail 'Direct TV' ».

2. **La fermeture par « Fermer » emprunte un autre chemin.** Le bouton se détruit
   lui-même : réattribution au voisin restant, d'où le second résultat mesuré
   (« focus 'Retour' [192,39] »). Deux voies de sortie, deux comportements — symptôme
   classique d'une restauration absente plutôt que fautive.

3. **La position de liste est perdue aussi.** `TvMoviesScreen` fait un `return` anticipé
   quand `selectedMovieId != null` : la `LazyColumn` **et** ses `LazyRow` quittent la
   composition, et leurs `LazyListState` — créés implicitement à l'intérieur — sont
   détruits avec elles. À la réouverture, tout est en haut. C'est ce qui rend la
   restauration du focus seule insuffisante : un `FocusRequester` sur un élément non
   composé ne peut pas être réclamé.

**Solution recommandée.** Les trois se corrigent ensemble :

- hisser les états de liste **au-dessus** du `return` anticipé, en `rememberSaveable` ;
- armer l'ancre à l'ouverture, la restaurer sur **les deux** voies de fermeture ;
- supprimer le `clearFocus()`, qui devient nuisible.

```kotlin
// app-tv/…/ui/movies/TvMoviesScreen.kt
@Composable
fun TvMoviesScreen(onPlay: (String, String, Int, String) -> Unit) {
    // …
    val anchor = rememberTvFocusAnchor()

    // Hissés au-dessus du `return` anticipé : sinon la LazyColumn et ses LazyRow quittent
    // la composition avec la fiche, et leurs LazyListState implicites meurent avec elles.
    // L'ancre ne peut rien restaurer sur un nœud non composé.
    val columnState = rememberSaveable(saver = LazyListState.Saver) { LazyListState() }
    val rowStates   = remember { mutableMapOf<String, LazyListState>() }

    // SUPPRIMÉ — c'est lui qui envoyait le focus au rail :
    //   LaunchedEffect(selectedMovieId) {
    //       if (selectedMovieId == null) { delay(30); focusManager.clearFocus() }
    //   }

    if (selectedMovieId != null) {
        TvMovieDetailPage(
            // Les DEUX voies de fermeture passent par le même point : c'est ce qui
            // manquait — RETOUR et « Fermer » donnaient deux résultats différents.
            onClose = { selectedMovieId = null; anchor.restore() },
            /* … */
        )
        return
    }

    LazyColumn(state = columnState, /* … */) {
        grouped.forEach { (genre, movies) ->
            item("hdr_$genre") { TvMovieGenreHeader(/* … */) }
            item("row_$genre") {
                val rowState = rowStates.getOrPut(genre) { LazyListState() }
                LazyRow(state = rowState, /* … */) {
                    lazyItems(sorted, key = { it.id }) { movie ->
                        TvMoviePosterCard(
                            movie    = movie,
                            onClick  = { anchor.rememberOrigin(movie.id); selectedMovieId = movie.id },
                            modifier = Modifier.width(100.dp).focusAnchor(anchor, movie.id),
                        )
                    }
                }
            }
        }
    }
}
```

> **Limite assumée.** `rowStates` est un `remember` simple : la position *horizontale* des
> rangées survit à l'ouverture d'une fiche, pas à un changement d'onglet ni à une rotation
> de configuration. C'est suffisant pour le défaut mesuré (« vingt affiches d'une rangée »)
> et évite un `Saver` sur une map dont les clés sont des noms de genre du catalogue.

**Vérification.** Ouvrir la 20ᵉ affiche d'une rangée, fermer par `RETOUR` **puis** par
« Fermer » : les deux doivent rendre `focused="true"` sur les mêmes `bounds` qu'à
l'ouverture, rangée à la même position, **rail replié**.

---

### G4 — La fiche détail ne retient pas le focus

- **Fichier** : `TvMoviesScreen.kt:451-463` (`TvMovieDetailPage`), idem `TvSeriesScreen.kt`
- **Priorité : Gênant.** ⚠️ **Ne pas livrer sans B4.**

**Cause racine.** La fiche *se présente* comme une modale mais n'en est pas une :
`TvMoviesScreen` la rend par un `return` anticipé, **à l'intérieur du `Box` de contenu de
`TvMainScreen`** (`TvMainScreen.kt:248-286`). Le rail reste donc un frère dans la même
`Row`, toujours composé et toujours focalisable. Un `◀` depuis « Lire » ne trouve rien à
gauche dans la fiche, la recherche s'élargit au parent, et le rail est là.

Le garde-fou du §30 posé sur le rail ne s'applique qu'à `Up`/`Down` — il ne couvre pas
l'axe horizontal, qui est précisément l'axe de sortie d'une fiche.

**Deux solutions possibles, et la moins invasive est la bonne ici.**

| Approche | Effet | Coût |
|---|---|---|
| Hisser la fiche en destination de `TvNavGraph` | le rail n'existe plus pendant la fiche — le plus propre | remonte `selectedMovieId` à travers `TvMainScreen`, casse le `SaveableStateProvider` de l'onglet |
| `exit = Cancel` sur la fiche | le rail existe mais devient inatteignable tant que la fiche est ouverte | 2 lignes |

La seconde suffit et ne touche pas à l'architecture d'onglets décrite au §38. La première
serait à retenir seulement si d'autres pages plein écran s'ajoutaient.

```kotlin
// app-tv/…/ui/movies/TvMoviesScreen.kt — TvMovieDetailPage
@Composable
internal fun TvMovieDetailPage(/* … */) {
    // Contrat de `tvModalTrap` : un BackHandler DOIT exister, sinon le focus est
    // enfermé sans issue. Il est déjà là — mais il ne recevait jamais la touche
    // avant B4 (le lecteur consommait RETOUR, le NavGraph n'en posait aucun).
    BackHandler(enabled = true) { onClose() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PurplePalette.Bg1)
            // Une page modale garde le focus jusqu'à sa fermeture. Pendant, RETOUR et
            // « Fermer » sont les deux seules sorties — et toutes deux passent par
            // `onClose`, donc par l'ancre de G5.
            .tvModalTrap(),
    ) { /* … inchangé … */ }
}
```

**Vérification.** Fiche ouverte, focus sur « Lire » : `◀` ne doit **rien** changer
(`focused="true"` inchangé, largeur du rail toujours 144 px). `RETOUR` doit fermer et
rendre le focus à l'affiche (G5).

---

### G2 — Le menu latéral s'ouvre tout seul

- **Fichier** : `TvMainScreen.kt:88-95`
- **Priorité : Gênant.**

**Cause racine — un couplage, pas un bug.**

```kotlin
LaunchedEffect(railHasFocus) {
    if (railHasFocus) { delay(100); expanded = true } else expanded = false
}
```

Le dépliage suit `hasFocus`, sans distinguer **pourquoi** le focus est arrivé. Or les
quatre reproductions de l'audit sont toutes des arrivées *non demandées* : le focus tombe
dans le rail par réattribution (mécanisme 1 du tableau ci-dessus). L'animation décale
alors tout le contenu de 336 px.

**Solution recommandée — deux couches, dans cet ordre.**

1. **Supprimer les arrivées non demandées** : c'est G5 (fiches), le `refocusAfterEdit`
   déjà en place dans `TvMyListScreen` (§16) généralisé aux autres mutations, et l'ancre
   de B3 (déconnexion). Trois des quatre reproductions disparaissent ici.
2. **Exiger une intention** pour le dépliage restant. On ne peut pas lire l'intention dans
   `hasFocus`, mais on peut la lire dans **la touche pressée** : le rail ne se déplie que
   si le focus y est arrivé peu après un `◀`.

On enregistre la dernière direction pressée au niveau de la `Row` racine, en
`onPreviewKeyEvent` — qui observe sans consommer.

```kotlin
// app-tv/…/ui/main/TvMainScreen.kt
var lastLeftPressMs by remember { mutableLongStateOf(0L) }

Row(
    modifier = Modifier
        .fillMaxSize()
        .background(PurplePalette.Bg1)
        // Observation pure : on ne consomme rien, on note l'intention. `hasFocus` ne
        // dit pas POURQUOI le focus est arrivé ; la touche, si.
        .onPreviewKeyEvent { event ->
            if (event.type == KeyEventType.KeyDown && event.key == Key.DirectionLeft) {
                lastLeftPressMs = System.currentTimeMillis()
            }
            false
        },
) {
    // …
}

// Le rail ne se déplie que sur une entrée LATÉRALE délibérée — jamais sur une reprise
// de focus par défaut. 400 ms couvre l'animation d'entrée sans laisser la fenêtre
// ouverte au point qu'une réattribution ultérieure en profite.
LaunchedEffect(railHasFocus) {
    if (!railHasFocus) { expanded = false; return@LaunchedEffect }
    val deliberate = System.currentTimeMillis() - lastLeftPressMs < 400
    if (deliberate) { delay(100); expanded = true }
}
```

> **Contrepartie à connaître.** Si le focus atterrit dans le rail sans `◀` — cas résiduel —
> le rail reste **replié mais focalisé**. C'est volontairement le moindre mal : l'ancre du
> Lot 0 doit avoir supprimé ce cas, et un rail replié focalisé reste lisible (pastille
> teintée) tandis qu'un décalage de 336 px du contenu ne l'est pas. Si l'observation
> montre que le cas subsiste, la vraie correction est côté G5, pas ici.

**Vérification.** Rejouer les quatre reproductions de l'audit : dans les quatre, largeur du
rail = 144 px après l'action.

---

### G3 — Entrer dans le rail ne mène jamais à l'onglet où l'on se trouve

- **Fichier** : `TvMainScreen.kt:175-195`
- **Priorité : Gênant.**

**Cause racine.** Le rail a déjà un `focusProperties { enter = … }` (§30) mais il ne s'en
sert que pour **refuser** l'entrée verticale ; pour l'entrée latérale il rend
`FocusRequester.Default`, ce qui laisse Compose choisir le candidat géométriquement le plus
proche — donc l'élément à la **même hauteur** que la ligne quittée. D'où la trace : depuis
la ligne 346 on entre sur « Series », depuis 426 sur « My list ».

**Solution recommandée.** Un `FocusRequester` par onglet, et l'`enter` du rail rend celui
de `selectedIndex`. C'est bien un point d'**entrée** et non un `LaunchedEffect` : il n'est
évalué que pendant une recherche de focus, donc jamais au lancement — c'est la différence
exacte avec le mécanisme retiré au §40.

```kotlin
// app-tv/…/ui/main/TvMainScreen.kt
// Un requester par entrée du rail, indices 0..4 pour les onglets, 5 pour Paramètres.
val railFocus = remember { List(navItems.size) { FocusRequester() } }

Column(
    modifier = Modifier
        .fillMaxHeight()
        .width(sidebarWidth)
        .background(PurplePalette.Bg0)
        .tvGroupEntry(
            // Garde-fou du §30 conservé : on n'entre pas dans le rail par le haut ni
            // par le bas — sinon le bout d'une liste longue y jette le focus.
            blocked = setOf(FocusDirection.Up, FocusDirection.Down),
            // Entrée latérale : on arrive sur l'onglet AFFICHÉ, pas sur le voisin
            // géométrique. `enter` n'est évalué que pendant une recherche de focus,
            // donc jamais à la première composition — cf. §40.
            target  = { railFocus.getOrNull(selectedIndex) },
        )
        .onFocusEvent { state -> railHasFocus = state.hasFocus }
        .padding(vertical = 24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
) {
    RailBrandLockup(expanded)
    Spacer(Modifier.height(8.dp))
    Column(Modifier.weight(1f)) {
        navItems.dropLast(1).forEachIndexed { index, item ->
            RailItem(
                icon     = item.icon,
                label    = item.label,
                isActive = selectedIndex == index,
                expanded = expanded,
                onClick  = { selectedIndex = index },
                modifier = Modifier.focusRequester(railFocus[index]),   // ← à ajouter au
            )                                                          //   paramètre de RailItem
        }
    }
    RailItem(/* Paramètres */ modifier = Modifier.focusRequester(railFocus[settingsIndex]), /* … */)
}
```

`RailItem` n'expose pas de `modifier` aujourd'hui : ajouter le paramètre
`modifier: Modifier = Modifier` et le composer avant `.fillMaxWidth()` sur la `Surface`.
C'est la septième occurrence du motif §8.7 (« déclaré mais jamais branché ») — ici,
l'inverse : le paramètre manque.

**Vérification.** Depuis n'importe quelle ligne de Direct TV, `◀` doit donner
`focused="true"` sur « Direct TV », quelle que soit la hauteur de départ.

---

### G6 — Le focus d'arrivée sur un onglet est imprévisible, et jamais sur le contenu

- **Fichiers** : `TvMainScreen.kt:248-256`, `TvMoviesScreen.kt:152-207`, `TvSeriesScreen.kt`
- **Priorité : Gênant.**

**Cause racine.** `TvMainScreen` réclame bien le focus sur le contenu
(`contentFocus`, boucle de réessai lignes 133-150) — mais il le réclame sur un
**`focusGroup` sans point d'entrée**. Compose entre alors par le premier focalisable dans
l'ordre de composition, et l'en-tête de `TvMoviesScreen` compose, dans l'ordre : bouton
« Retour » (seulement si `selectedGenre != null`), la `Column` de titre (non focalisable),
puis `TvSearchBar`. La barre de recherche est donc le premier focalisable de l'écran.

Le résultat « tantôt la barre, tantôt l'en-tête de genre » n'est pas de l'aléatoire : c'est
la course entre la boucle de réessai (400 ms) et l'arrivée du catalogue. Tant que la liste
est vide, seule la barre est focalisable ; une fois peuplée, l'en-tête du premier genre est
plus haut dans l'ordre de composition que les affiches.

Et `▼ ▼` depuis la barre atterrit sur la 8ᵉ affiche parce que la barre est ancrée à droite
(`x ≈ 1312`) : la recherche descendante retient l'affiche la plus proche **en abscisse**.

**Solution recommandée.** Déclarer le point d'entrée de chaque écran de catalogue. La
recherche est une action secondaire ; elle ne doit pas être le point d'entrée par défaut.

```kotlin
// app-tv/…/ui/movies/TvMoviesScreen.kt
val firstCardFocus = remember { FocusRequester() }
// `enter` ne doit rendre un requester QUE s'il est attaché : sur un catalogue encore en
// chargement, aucune carte n'est composée et la demande lèverait IllegalStateException.
var firstCardReady by remember { mutableStateOf(false) }

Column(
    modifier = Modifier
        .fillMaxSize()
        .background(PurplePalette.Bg1)
        .tvGroupEntry(target = { firstCardFocus.takeIf { firstCardReady } }),
) {
    // … en-tête, barre de recherche …

    LazyColumn(state = columnState) {
        grouped.forEachIndexed { gIndex, (genre, movies) ->
            item("hdr_$genre") { TvMovieGenreHeader(/* … */) }
            item("row_$genre") {
                LazyRow(state = rowStates.getOrPut(genre) { LazyListState() }) {
                    lazyItems(sorted, key = { it.id }) { movie ->
                        val isFirst = gIndex == 0 && movie.id == sorted.first().id
                        if (isFirst) {
                            DisposableEffect(Unit) {
                                firstCardReady = true
                                onDispose { firstCardReady = false }
                            }
                        }
                        TvMoviePosterCard(
                            movie    = movie,
                            modifier = Modifier
                                .width(100.dp)
                                .focusAnchor(anchor, movie.id)              // G5
                                .then(if (isFirst) Modifier.focusRequester(firstCardFocus)
                                      else Modifier),                        // G6
                            /* … */
                        )
                    }
                }
            }
        }
    }
}
```

> **Interaction avec G5.** Les deux visent le même nœud. L'ordre correct est : *ancre
> d'abord, point d'entrée en repli.* `focusAnchor` agit par `LaunchedEffect` sur une clé
> précise ; `tvGroupEntry` n'agit que si une recherche de focus entre dans le groupe. Ils
> ne se déclenchent donc jamais sur le même événement. Si l'observation montre le
> contraire, conditionner `target` à `anchor.pending == null`.

**Vérification.** Trois entrées successives dans Films doivent donner trois fois les mêmes
`bounds` : celles de la première affiche du premier genre.

---

### G9 — Les résultats de recherche sautent le premier, et la dernière carte renvoie à la barre

- **Fichiers** : `TvHomeScreen.kt:169-192`, `TvMoviesScreen.kt`, `TvSeriesScreen.kt`
- **Priorité : Gênant.**

**Cause racine — deux fois la même géométrie.** La barre est ancrée en haut à **droite**
(`x ≈ 1312`), les résultats commencent en haut à **gauche** (`x = 192`).

- `▼` depuis la barre : la recherche descendante privilégie le candidat dont l'abscisse
  recouvre le plus celle de la source. Le n°2 (`x = 533`) gagne sur le n°1 (`x = 192`).
- `▶` depuis le dernier résultat : plus de voisin à droite dans la grille, la recherche
  s'élargit au parent, et la barre est le seul focalisable à droite.

> Le §24 de `CLAUDE.md` avait conclu que ce défaut n'existait pas, sur une recherche à
> **un seul** résultat — cas où il n'y a effectivement rien à droite. L'audit le corrige.
> À reporter dans le journal en même temps que le correctif.

**Solution recommandée.** Symétrique exact du garde-fou du §30, transposé sur l'axe
horizontal — mais posé **sur la barre**, pas sur la grille : la grille doit garder sa sortie
gauche vers le rail.

```kotlin
// app-tv/…/ui/home/TvHomeScreen.kt — TvSearchBar
Row(
    modifier = modifier
        // On n'entre dans la barre que par le HAUT. Sans ce garde-fou, `▶` sur le
        // dernier résultat d'une ligne — faute de voisin à droite — remontait s'y
        // poser. Même raisonnement que le rail au §30, autre axe.
        .tvGroupEntry(blocked = setOf(FocusDirection.Left, FocusDirection.Right))
        .onPreviewKeyEvent { /* … haut/bas inchangé … */ }
        /* … */
)
```

```kotlin
// Conteneur des résultats — le `▼` depuis la barre doit tomber sur le PREMIER.
val firstResultFocus = remember { FocusRequester() }
var firstResultReady by remember { mutableStateOf(false) }

LazyColumn(
    modifier = Modifier
        .fillMaxSize()
        .tvGroupEntry(target = { firstResultFocus.takeIf { firstResultReady } }),
    /* … */
) {
    itemsIndexed(searchResults, key = { _, c -> c.url }) { index, channel ->
        if (index == 0) DisposableEffect(Unit) {
            firstResultReady = true; onDispose { firstResultReady = false }
        }
        TvChannelRow(
            channel  = channel,
            modifier = if (index == 0) Modifier.focusRequester(firstResultFocus) else Modifier,
            /* … */
        )
    }
}
```

`TvChannelRow` accepte déjà un `modifier` (`TvChannelRow.kt:36`) — aucun changement de
signature nécessaire.

**Vérification.** Recherche « Simpson » (2 résultats) : `▼` depuis la barre ⇒ `[192,174]`.
`▶` depuis le n°2 ⇒ focus inchangé.

---

### G7 — Sur un onglet vide, le focus est enfermé dans le rail resté ouvert

- **Fichiers** : `TvDownloadsScreen.kt:63-75`, `TvMainScreen.kt:278-280`
- **Priorité : Gênant.**

**Cause racine.** L'état vide n'expose que des `Icon` et des `Text` : zéro focalisable.
La boucle de réessai de `contentFocus` (`TvMainScreen.kt:141-149`) tourne 90 fois sans
jamais aboutir, le focus reste dans le rail, et — `railHasFocus` étant vrai en permanence —
le rail reste déplié à 480 px. `▶` ne fait rien parce qu'il n'y a littéralement rien à
droite : la télécommande **paraît** morte sans l'être.

**Solution recommandée.** Un écran de télévision ne devrait jamais présenter zéro cible.
L'état vide devient une action : « Parcourir les films », qui bascule d'onglet. Cela règle
le focus **et** donne une suite à l'utilisateur.

`TvDownloadsScreen` ne reçoit aujourd'hui que `onPlay` : ajouter un rappel de navigation,
câblé dans `TvMainScreen` sur `selectedIndex`.

```kotlin
// app-tv/…/ui/downloads/TvDownloadsScreen.kt
@Composable
fun TvDownloadsScreen(
    onPlay:   (url: String, title: String) -> Unit,
    onBrowse: () -> Unit,          // ← nouveau
) {
    // …
    if (isEmpty) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Rounded.Download, null, tint = TvTextSub.copy(0.25f),
                     modifier = Modifier.size(80.dp))
                Spacer(Modifier.height(24.dp))
                Text(stringResource(R.string.downloads_empty), /* … */)
                Spacer(Modifier.height(10.dp))
                Text(stringResource(R.string.downloads_empty_sub), /* … */)
                Spacer(Modifier.height(24.dp))

                // Sans focalisable, le focus restait bloqué dans le rail, qui restait
                // déplié à 480 px : `▶` ne pouvait rien faire. Une cible unique suffit
                // à rendre l'écran vivant.
                val browseFocus = remember { FocusRequester() }
                LaunchedEffect(Unit) {
                    withFrameNanos { }
                    runCatching { browseFocus.requestFocus() }
                }
                Surface(
                    onClick  = onBrowse,
                    modifier = Modifier.focusRequester(browseFocus),
                    shape    = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
                    colors   = ClickableSurfaceDefaults.colors(
                        containerColor        = PurplePalette.Bg2,
                        focusedContainerColor = PurplePalette.Purple400,
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f),
                ) {
                    Text(
                        stringResource(R.string.downloads_empty_cta),   // « Parcourir les films »
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                        style    = LocalPurpleType.current.button,
                    )
                }
            }
        }
    }
    // …
}
```

```kotlin
// app-tv/…/ui/main/TvMainScreen.kt:278
4 -> TvDownloadsScreen(
    onPlay   = { url, title -> onPlay(url, title, "", "", "", 0) },
    onBrowse = { selectedIndex = 1 },     // onglet Films
)
```

Chaîne à ajouter dans les deux `strings.xml` : `downloads_empty_cta`.

Le même traitement s'applique à l'état vide de « Ma liste » (cf. M5), qui a le même défaut
structurel.

**Vérification.** Onglet Téléchargements vide : le relevé doit compter **8** focalisables
(7 rail + 1 CTA), le focus doit être sur le CTA, et le rail replié à 144 px.

---

## Lot 3 — Lecteur : dire ce qui se passe

### G1 — Un échec de lecture ne produit aucun message : écran noir indéfini

- **Fichier** : `app-tv/…/ui/player/TvPlayerScreen.kt:166-172`
- **Priorité : Gênant au classement, Bloquant du point de vue de l'utilisateur.**
  Premier du lot : c'est ce qui distingue « ça charge » de « c'est cassé ».

> ⚠️ **Cette fiche se trompait de cause — corrigé après mesure, cf. §45.** Porter le bloc
> du mobile ne suffit pas : `PlayerStatus.ERROR` est **écrasé** par le `STATE_IDLE` que
> ExoPlayer émet juste après `onPlayerError`, dans `core`. Le bloc du mobile, donné ici
> comme la référence à porter, **n'a donc jamais pu s'afficher non plus**. Le correctif est
> `PlayerStatusPolicy.reconcile()` dans `PlayerService`, *plus* le portage ci-dessous.

**Cause racine (telle qu'écrite initialement).** Le socle expose bien l'erreur —
`PlayerState.error: String?` et `PlayerStatus.ERROR` (`core/…/player/PlayerService.kt`) —
et le mobile la rend (`PlayerScreen.kt:208-221`). `TvPlayerScreen` ne teste que `BUFFERING` :

```kotlin
if (state.status == PlayerStatus.BUFFERING) { CircularProgressIndicator(/* … */) }
// … et rien pour ERROR : `grep -c error TvPlayerScreen.kt` → 0
```

Sur `ERROR`, le spinner disparaît **et** rien ne le remplace : l'écran devient noir et
muet. Onzième occurrence du motif §8.2 — le correctif n'a été écrit que d'un côté.

**Solution recommandée.** Porter le bloc du mobile, avec deux ajouts propres à la TV :
un bouton **focalisable** qui reçoit le focus d'office (sinon la télécommande n'a aucune
prise), et le forçage de l'overlay pour que `RETOUR` reste disponible.

```kotlin
// app-tv/…/ui/player/TvPlayerScreen.kt — après le bloc BUFFERING
if (state.status == PlayerStatus.ERROR) {
    val retryFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        // L'overlay est la seule voie de sortie visible : on ne laisse pas
        // l'utilisateur devant un écran noir sans repère.
        overlayVisible = true
        withFrameNanos { }
        runCatching { retryFocus.requestFocus() }
    }
    Column(
        modifier = Modifier.align(Alignment.Center).tvModalTrap(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Rounded.ErrorOutline, null, tint = TvColorError, modifier = Modifier.size(56.dp))
        Spacer(Modifier.height(12.dp))
        Text(
            state.error ?: stringResource(R.string.player_error),
            color = TvColorError, fontSize = 16.sp, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TvTextButton(
                label    = stringResource(R.string.action_retry),
                onClick  = { vm.playMedia(url, title, mediaId.ifEmpty { null },
                                          cover = cover.ifEmpty { null }, type = type.ifEmpty { null }) },
                modifier = Modifier.focusRequester(retryFocus),
            )
            TvTextButton(label = stringResource(R.string.action_back), onClick = onBack)
        }
    }
}
```

`TvTextButton` (`TvPlayerScreen.kt:666`) n'expose pas de `modifier` : ajouter le paramètre,
comme pour `RailItem` en G3.

Chaînes à ajouter dans les deux `strings.xml` : `player_error`, `action_retry`.

> **Limite de vérification.** Le fournisseur renvoie `HTTP 407` depuis cet environnement
> (§8 du journal : l'IP est bloquée en Wi-Fi). C'est ce qui a *révélé* G1 et c'est aussi ce
> qui permet de le tester — le cas d'erreur est reproductible tel quel. Le cas *nominal*,
> lui, demande des données mobiles ou un VPN.

**Vérification.** Lancer une chaîne en Wi-Fi : le relevé `uiautomator` doit rapporter un
texte d'erreur non vide et **au moins un** nœud `focused="true"`, au lieu de
`TEXTES: [] DESC: []`.

---

### G13 — L'overlay ramène le focus sur « Lecture » à chaque réapparition

- **Fichier** : `app-tv/…/ui/player/TvPlayerScreen.kt:95-101`
- **Priorité : Gênant.**

**Cause racine.** L'effet est inconditionnel :

```kotlin
LaunchedEffect(overlayVisible) {
    delay(80)
    if (overlayVisible && !showSpeedDialog && !showTrackDialog) playFocus.requestFocus()
    else rootFocus.requestFocus()
}
```

`overlayVisible` bascule à chaque masquage/réapparition, donc l'effet rejoue et **réclame
toujours le même bouton**. L'utilisateur qui était sur « Pistes » ou sur la vitesse doit
refaire le trajet. C'est la variante « au réaffichage » du piège §8.8 : l'état qui sert de
clé est aussi celui que l'effet écrase.

**Solution recommandée.** Distinguer *première apparition* (poser un défaut sensé) et
*réapparition* (restaurer). Il faut donc savoir quel contrôle était focalisé : un
identifiant par contrôle, mémorisé sur `onFocusChanged`.

```kotlin
// app-tv/…/ui/player/TvPlayerScreen.kt
private enum class PlayerControl { Back, Tracks, Speed, Rewind, PlayPause, Forward, Restart, Next }

// dans TvPlayerScreen
val controlFocus = remember { PlayerControl.entries.associateWith { FocusRequester() } }
var lastControl  by remember { mutableStateOf(PlayerControl.PlayPause) }
var overlayEverShown by remember { mutableStateOf(false) }

LaunchedEffect(overlayVisible) {
    if (!overlayVisible) {
        runCatching { rootFocus.requestFocus() }
        return@LaunchedEffect
    }
    delay(80)
    if (showSpeedDialog || showTrackDialog) return@LaunchedEffect
    // Défaut sensé à la PREMIÈRE apparition seulement ; ensuite on rend à
    // l'utilisateur le contrôle qu'il avait quitté.
    val target = if (overlayEverShown) lastControl else PlayerControl.PlayPause
    overlayEverShown = true
    runCatching { controlFocus.getValue(target).requestFocus() }
}
```

```kotlin
// Chaque contrôle déclare son identité. `TvControlButton` accepte déjà un `modifier`
// (TvPlayerScreen.kt:646) — rien à changer à sa signature.
@Composable
private fun Modifier.playerControl(
    id: PlayerControl,
    requesters: Map<PlayerControl, FocusRequester>,
    onFocused: (PlayerControl) -> Unit,
): Modifier = this
    .focusRequester(requesters.getValue(id))
    .onFocusChanged { if (it.isFocused) onFocused(id) }

// à l'appel :
TvControlButton(
    Icons.Rounded.Tune, onClick = onOpenTracks, size = 24,
    modifier = Modifier.playerControl(PlayerControl.Tracks, controlFocus) { lastControl = it },
)
```

`TvPlayerOverlay` reçoit aujourd'hui `playFocus: FocusRequester` (`TvPlayerScreen.kt:242`) :
remplacer ce paramètre par `controlFocus: Map<PlayerControl, FocusRequester>` et
`onControlFocused: (PlayerControl) -> Unit`. Attention à `TvPlayerScreen.kt:262`, qui
appelle `playFocus.requestFocus()` sur un événement clavier — à rediriger vers
`controlFocus.getValue(lastControl)`.

**Vérification.** Focaliser « Pistes », attendre 5 s le masquage, appuyer sur une touche :
`focused="true"` doit rester sur « Pistes », pas sur `[876,456]`.

---

### M1 — Libellés de sous-titres codés en dur, en français dans une interface anglaise

- **Fichier** : `TvPlayerScreen.kt:760, 766, 767`
- **Priorité : Amélioration.**

**Cause racine.** Trois listes littérales — `"Petit" to 0.75f`, `"Moyen"`, `"Grand"`,
`"Blanc"`, `"Jaune"`. La campagne de localisation du §17 les a manqués parce qu'ils **ne
portent aucun accent** : la détection cherchait des caractères accentués.

**Solution recommandée.** Les clés existent déjà — elles servent au panneau Paramètres
(`app-tv/src/main/res/values/strings.xml:61-66`). C'est une substitution pure.

```kotlin
// TvPlayerScreen.kt:759-767
Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    listOf(
        R.string.subtitle_size_small  to 0.75f,
        R.string.subtitle_size_medium to 1.0f,
        R.string.subtitle_size_large  to 1.5f,
    ).forEach { (labelRes, value) ->
        TvTabButton(label = stringResource(labelRes), selected = subSize == value) {
            viewModel.updateSubtitleSize(value)
        }
    }
}
// …
TvColorOption(name = stringResource(R.string.subtitle_color_white),  color = Color.White,  /* … */)
TvColorOption(name = stringResource(R.string.subtitle_color_yellow), color = Color.Yellow, /* … */)
```

**Amélioration du contrôle de parité (§17).** Le contrôle actuel ne pouvait pas voir
ces trois-là. Ajouter une passe qui signale **tout littéral passé en paramètre
`label` / `name` / `title`**, accentué ou non :

```bash
grep -rnE '\b(label|name|title|text)\s*=\s*"[^"]{2,}"' app-tv/src/main/kotlin \
  | grep -v 'stringResource' | grep -v 'contentDescription'
```

À rejouer à chaque ajout de libellé, en plus du contrôle de parité `fr`/`en`
(100/100 aujourd'hui, intact).

---

### M9 — Le dialogue « Pistes et sous-titres » s'ouvre vide

- **Fichier** : `TvPlayerScreen.kt`, onglet « Pistes » du dialogue
- **Priorité : Amélioration.**

**Cause racine.** Le dialogue rend la liste des groupes de pistes sans cas dégradé : quand
elle est vide — flux mono-piste, ou flux qui n'a pas démarré — il ne reste que deux onglets
et un bouton « Fermer ». Rien ne distingue « il n'y a rien » de « ça n'a pas chargé ».

**Solution recommandée.** Le mobile a déjà la chaîne : `player_no_tracks`
(`app-mobile/src/main/res/values/strings.xml:111` et `values-fr:111`). Elle est **absente**
de `app-tv` — à ajouter dans les deux fichiers, puis :

```kotlin
if (trackGroups.isEmpty()) {
    Box(Modifier.fillMaxWidth().padding(vertical = 32.dp), contentAlignment = Alignment.Center) {
        Text(
            stringResource(R.string.player_no_tracks),
            color = TvTextSub, fontSize = 14.sp, textAlign = TextAlign.Center,
        )
    }
} else {
    // … liste existante …
}
```

---

## Lot 4 — Lisibilité à distance de canapé

### G10 — L'élément focalisé est le moins lisible de l'écran

- **Fichiers** : `TvTheme.kt:43` (`FgOnPrimary`), `TvChannelRow.kt:88`,
  `TvHomeScreen.kt:425-430` (`TvGenreItem`), `TvMoviesScreen.kt:876-910`
- **Priorité : Gênant. Meilleur rapport coût/bénéfice du plan.**

**Cause racine — architecturale, pas cosmétique.** Le thème définit bien un jeton de
contenu sur accent :

```kotlin
val FgOnPrimary = Color(0xFFFFFFFF)     // TvTheme.kt:43
```

…mais il vaut blanc, et surtout **presque personne ne le lit**. Les composants fixent leur
couleur de texte en dur, indépendamment de l'état de focus :

```kotlin
// TvChannelRow.kt:52-58 — le fond passe à Purple400 au focus…
colors = ClickableSurfaceDefaults.colors(
    containerColor        = PurplePalette.Bg2,
    focusedContainerColor = PurplePalette.Purple400,
)
// TvChannelRow.kt:88 — … le texte, lui, ne bouge jamais
Text(channel.name, style = LocalPurpleType.current.body.copy(color = PurplePalette.Fg1))
```

D'où la mesure : blanc sur `Bg2` `#1B0E36` = **18,06 : 1** au repos, blanc sur `Purple400`
`#B36BFC` = **3,27 : 1** au focus. Le repérage est excellent, la lecture s'effondre.

**Solution recommandée — en deux temps, et le second est le vrai correctif.**

1. Donner sa valeur au jeton : `FgOnPrimary = Color(0xFF12061F)`. Contraste sur
   `#B36BFC` : **6,00 : 1** *(la valeur « 9,4 » écrite initialement ici était fausse —
   calculée après coup, cf. §46 ; 6,00 est aussi le plafond praticable, le quasi-noir ne
   montant qu'à 6,17)*. Le remplissage lavande — l'identité du produit — ne bouge pas.
2. **Faire lire le jeton.** `androidx.tv.material3.Surface` publie sa couleur de contenu
   dans `LocalContentColor` selon l'état d'interaction : il suffit de déclarer
   `focusedContentColor` et de laisser les `Text` en hériter, au lieu de coder `Fg1`.

```kotlin
// app-tv/…/ui/theme/TvTheme.kt
object PurplePalette {
    // …
    /** Contenu posé SUR un fond d'accent. Blanc sur Purple400 ne donnait que 3,27 : 1 —
     *  l'élément focalisé était le moins lisible de l'écran. En sombre : 9,4 : 1. */
    val FgOnPrimary = Color(0xFF12061F)
}

/** Jeu de couleurs partagé : la décision « quel contenu sur un fond d'accent » ne doit
 *  exister qu'à un seul endroit (§8.2). */
@OptIn(ExperimentalTvMaterial3Api::class)
object TvSurfaceDefaults {
    @Composable
    fun rowColors() = ClickableSurfaceDefaults.colors(
        containerColor        = PurplePalette.Bg2,
        contentColor          = PurplePalette.Fg1,
        focusedContainerColor = PurplePalette.Purple400,
        focusedContentColor   = PurplePalette.FgOnPrimary,
        pressedContainerColor = PurplePalette.Purple600,
        // ⚠️ Corrigé après mesure (§46) : l'accent PRESSÉ est plus sombre. Le jeton sombre
        // y tombe à 3,68 alors que le blanc y donne 5,32. Le contenu suit la clarté du
        // fond, il n'est pas uniforme.
        pressedContentColor   = PurplePalette.Fg1,
    )
}
```

```kotlin
// TvChannelRow.kt — le texte suit l'état au lieu de le contredire
Surface(onClick = onPlay, colors = TvSurfaceDefaults.rowColors(), /* … */) {
    Row(/* … */) {
        Text(
            channel.name,
            // `LocalContentColor` est fourni par la Surface TV selon son état :
            // Fg1 au repos, FgOnPrimary au focus. Plus de couleur en dur.
            style    = LocalPurpleType.current.body.copy(color = LocalContentColor.current),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
```

À appliquer aux quatre endroits mesurés : `TvChannelRow` (ligne de chaîne), `TvGenreItem`
(genre + compteur), `TvGenreChip`, `TvMovieGenreHeader`.

⚠️ **Vérifier au passage les éléments non textuels posés sur l'accent** : l'étoile
`#FFD700` de `TvChannelRow.kt:113` tombe à **2,1 : 1** sur `#B36BFC`. Elle doit basculer sur
`FgOnPrimary` quand sa Surface est focalisée — sinon on corrige le texte et on laisse
l'icône illisible.

**Vérification.** Capture au pixel sur une ligne focalisée : `#12061F` sur `#B36BFC`.
Contrôler ensuite que les sept acquis du §5 de l'audit tiennent — en particulier « trois
états visuellement distincts » dans le panneau des genres, que ce changement touche
directement.

---

### M3 — 34 des 64 tailles de police sous 14 sp

- **Fichiers** : `TvTheme.kt:125-190` (`DefaultPurpleType`), plus les `fontSize` littéraux
- **Priorité : Amélioration — validation hors émulateur requise.**

**Cause racine.** Deux sources indépendantes, et seule la première est centralisée :
`DefaultPurpleType` définit `capsLabel` à 11 sp, `bodySmall` et `meta` à 13 sp ; le reste
est écrit en dur au fil des écrans (10 sp pour le badge LIVE et « BEST DEAL », 8 sp pour
les badges FILM/SÉRIE de « Ma liste »). Le minimum Android TV est 12 sp, la recommandation
pour du texte courant 18 sp ; seules 6 valeurs sur 64 l'atteignent.

**Solution recommandée.** Relever le socle typographique, puis remplacer les littéraux par
des jetons — c'est la seule façon d'empêcher la dérive de recommencer.

```kotlin
// app-tv/…/ui/theme/TvTheme.kt
val DefaultPurpleType = PurpleType(
    body      = TextStyle(/* … */ fontSize = 18.sp, lineHeight = 26.sp),  // 15 → 18
    bodySmall = TextStyle(/* … */ fontSize = 15.sp, lineHeight = 21.sp),  // 13 → 15
    meta      = TextStyle(/* … */ fontSize = 14.sp, lineHeight = 16.sp),  // 13 → 14
    capsLabel = TextStyle(/* … */ fontSize = 12.sp, lineHeight = 14.sp),  // 11 → 12 (plancher TV)
    /* heroTitle 36, h1 26, h2 20, h3 17 : déjà au-dessus, inchangés */
)

/** Micro-étiquettes (LIVE, FILM, SÉRIE, BEST DEAL). Plancher Android TV : 12 sp.
 *  Un badge à 8 sp mesure 16 px de haut sur un écran 1080p. */
val TvBadgeText = TextStyle(fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = 0.08.em)
```

Inventaire des littéraux à reprendre :

```bash
grep -rnoE 'fontSize\s*=\s*[0-9]+(\.[0-9]+)?\.sp' app-tv/src/main/kotlin \
  | awk -F'= ' '{print $2}' | sort -V | uniq -c
```

⚠️ **Attendre un impact de mise en page.** `body` 15 → 18 sp élargit les lignes de chaînes
et peut faire déborder les cartes serrées (fiche série, badges de la fiche film). Prévoir
une passe de reprise, et **ne pas** relever `capsLabel` sans vérifier les en-têtes de genre
de Films, qui tiennent sur une ligne.

---

### M6 — Les rangées d'affiches vont jusqu'à x = 1920, sans marge d'overscan

- **Fichiers** : `TvMoviesScreen.kt` (`LazyRow`), `TvSeriesScreen.kt`, `TvMyListScreen.kt`
- **Priorité : Amélioration.**

**Cause racine.** `contentPadding = PaddingValues(horizontal = 24.dp, …)` : 24 dp couvre la
marge de départ mais pas la zone d'overscan, que les guides Android TV fixent à 5 % de la
largeur — soit **48 dp** sur 1920 px. Sur un téléviseur qui applique de l'overscan, la
dernière affiche est amputée. `PurpleSpacing.TvSafeX = 96.dp` existe dans le thème et n'est
utilisé nulle part : neuvième occurrence de §8.7.

**Solution recommandée.** Un `contentPadding` asymétrique : la marge de départ reste serrée
(l'alignement visuel avec le titre de genre en dépend), la marge de fin passe à 48 dp.
L'effet « affiche coupée » qui suggère le défilement se conserve, décalé de 48 dp.

```kotlin
LazyRow(
    // La marge de FIN couvre l'overscan (5 % de 1920 px). Départ inchangé : il aligne
    // les affiches sur le titre de genre.
    contentPadding        = PaddingValues(start = 24.dp, end = 48.dp, top = 8.dp, bottom = 8.dp),
    horizontalArrangement = Arrangement.spacedBy(10.dp),
) { /* … */ }
```

---

## Lot 5 — Coût D-pad

### G8 — Les touches page précédente / page suivante détruisent le focus

- **Fichiers** : `TvHomeScreen.kt:186-238`, `TvMoviesScreen.kt`, `TvSeriesScreen.kt`, `TvDownloadsScreen.kt`, `TvMyListScreen.kt`
- **Priorité : Gênant. Premier du lot — il est aussi la réponse la moins coûteuse à G11.**

**Cause racine.** Personne n'intercepte `PAGE_UP` / `PAGE_DOWN`. Elles atteignent donc la
`LazyColumn`, qui les traite comme un défilement de page **sans toucher au focus** :
l'élément focalisé sort de la fenêtre, son nœud est recyclé par la liste paresseuse, et le
`FocusRequester` qu'il portait n'a plus de nœud attaché. Compose ne réattribue rien —
`focused="true"` disparaît de l'arbre. L'application paraît figée jusqu'à un appui
supplémentaire qui récupère le focus au hasard.

Le relevé confirme que c'est bien spécifique à ces deux touches : `MEDIA_FF`,
`MEDIA_NEXT`, `MOVE_HOME`, `CHANNEL_UP`, `CHANNEL_DOWN` sont sans effet et conservent le
focus. Beaucoup de box émettent pourtant `PAGE_UP`/`PAGE_DOWN` sous l'étiquette
chaîne +/− : la touche est présente sur la télécommande, et actuellement nuisible.

**Solution recommandée.** Ne pas laisser la liste défiler seule : déplacer le focus d'une
page, et laisser le défilement suivre le focus. C'est exactement `Modifier.dpadPageJump`
du Lot 0 — une ligne par liste.

```kotlin
// app-tv/…/ui/home/TvHomeScreen.kt — panneau des genres et panneau des chaînes
LazyColumn(
    modifier = Modifier
        .width(360.dp)
        .fillMaxHeight()
        // PAGE_UP/PAGE_DOWN — et CHANNEL_UP/DOWN, que certaines box émettent à leur
        // place — déplacent le focus au lieu de le détruire. 10 lignes de genres
        // tiennent à l'écran ; on saute d'un écran plein.
        .dpadPageJump(pageSize = 10),
    /* … */
) { /* … */ }

LazyColumn(
    modifier = Modifier
        .weight(1f)
        .fillMaxHeight()
        .dpadPageJump(pageSize = 8),   // lignes de chaînes, plus hautes
    /* … */
) { /* … */ }
```

Calibrer `pageSize` sur le nombre d'éléments **réellement visibles** : sauter plus que
l'écran désoriente autant que de ne pas sauter du tout.

**Vérification.** Genre ARABES (579 entrées) : `PAGE_DOWN` doit produire un
`focused="true"` **non vide**, décalé d'environ un écran ; en fin de liste, il doit
s'arrêter sur le dernier élément sans perdre le focus.

---

### G11 — Un appui par élément, sur des listes de plusieurs centaines d'entrées

- **Fichiers** : `TvHomeScreen.kt:206-238` (`TvGenreItem`), `TvChannelRow.kt:104-120`
- **Priorité : Gênant.** Périmètre volontairement réduit — cf. §1.4.

**Cause racine — deux facteurs multiplicatifs.**

1. Aucun saut : ni index alphabétique, ni page, ni raccourci. La seule touche qui pourrait
   en tenir lieu casse le focus (G8).
2. **Deux arrêts de focus par ligne.** Chaque genre porte son étoile
   (`TvHomeScreen.kt:418-437`), chaque chaîne aussi (`TvChannelRow.kt:104`). Le trajet
   genre → chaîne coûte donc 3 appuis `▶` au lieu de 1, et **chaque traversée verticale**
   facture ces étoiles au passage horizontal.

Coût mesuré : 43 appuis pour lancer la première chaîne du 40ᵉ genre ; 578 `▼` pour la
dernière chaîne de ARABES.

**Solution recommandée — les deux gestes les moins coûteux des trois proposés par l'audit.**

1. `dpadPageJump` (G8), déjà traité : ramène 578 appuis à ~72.
2. **N'exposer l'étoile que sur la ligne focalisée.** Elle reste atteignable — on ne
   supprime pas la fonction (§8.6) — mais elle cesse d'être facturée à chaque traversée.

```kotlin
// app-tv/…/ui/common/TvChannelRow.kt
@Composable
fun TvChannelRow(/* … */) {
    // `hasFocus` et non `isFocused` : le groupe englobe la ligne ET l'étoile, sinon
    // l'étoile se retirerait du parcours au moment même où le focus l'atteint.
    var rowHasFocus by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .focusGroup()
            .onFocusEvent { rowHasFocus = it.hasFocus },
        verticalAlignment     = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Surface(onClick = onPlay, modifier = Modifier.weight(1f), /* … */) { /* … */ }

        if (onMoveUp   != null) ArrowButton("▲", onMoveUp)
        if (onMoveDown != null) ArrowButton("▼", onMoveDown)

        Surface(
            onClick  = onFav,
            // L'étoile reste dans la mise en page — pas de saut de largeur au focus —
            // mais elle ne coûte un appui que sur la ligne où l'on se trouve.
            modifier = Modifier
                .alpha(if (rowHasFocus) 1f else 0.35f)
                .focusProperties { canFocus = rowHasFocus },
            /* … */
        ) { /* … */ }
    }
}
```

Même traitement pour l'étoile de `TvGenreItem`.

> ⚠️ **Piège de séquence.** `canFocus = rowHasFocus` retire l'étoile du parcours au moment
> où le focus quitte la ligne. Si le focus **est** sur l'étoile quand la ligne perd le
> focus… il ne peut pas l'être : l'étoile fait partie du groupe, donc `hasFocus` reste
> vrai. C'est précisément pourquoi le snippet utilise `onFocusEvent`/`hasFocus` et non
> `onFocusChanged`/`isFocused` — l'erreur inverse enfermerait le focus sur une ligne.

**Hors périmètre.** L'index A→Z focalisable en marge des genres (point 2 de l'audit) est un
composant neuf avec sa propre mécanique de focus et de défilement synchronisé ; il mérite
sa propre itération, après vérification que G8 + l'étoile conditionnelle ne suffisent pas.

**Vérification.** Compter les appuis pour lancer la 1ʳᵉ chaîne du 40ᵉ genre : doit passer de
43 à ~8. Vérifier que l'étoile reste **atteignable** sur la ligne focalisée — c'est le
garde-fou §8.6.

---

### G12 — Films et Séries ont gardé les rangées horizontales imbriquées

- **Fichiers** : `TvMoviesScreen.kt:865-917` (`TvMovieGenreHeader`), `TvSeriesScreen.kt`
- **Priorité : Gênant.** Périmètre réduit — cf. §1.4.

**Cause racine.** Direct TV a été refondu en deux panneaux verticaux (§13) précisément
parce qu'un axe de défilement imbriqué dans l'autre coûte un appui par élément. Films et
Séries n'ont pas suivi : 26 298 titres, 8 affiches visibles par rangée, jusqu'à 566 appuis
`▶` pour la dernière d'ANIMATION.

L'échappatoire existe pourtant : `TvMovieGenreHeader` **est** une `Surface` cliquable qui
ouvre la vue complète du genre (`onSelect = { selectedGenre = genre }`), et elle affiche
déjà un `ChevronRight`. Deux choses la rendent inopérante :

- rien ne la signale comme une action — l'en-tête ressemble à un titre de section, et le
  chevron de 16 dp à 32 % d'opacité ne se voit pas à trois mètres ;
- elle n'est pas sur le trajet naturel du focus (cf. G6, corrigé au Lot 2 : le point
  d'entrée devient la première affiche, donc l'en-tête est à un `▲`).

**Solution recommandée.** Rendre l'action lisible. C'est le geste le moins coûteux, et il
convertit un composant déjà présent — pas une refonte.

```kotlin
// app-tv/…/ui/movies/TvMoviesScreen.kt — TvMovieGenreHeader
Row(
    modifier              = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
    verticalAlignment     = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(8.dp),
) {
    if (isFav) Icon(Icons.Rounded.Bookmark, null, tint = PurplePalette.Purple300,
                    modifier = Modifier.size(14.dp))
    Text(
        genre.uppercase(),
        style    = LocalPurpleType.current.capsLabel.copy(
            color = LocalContentColor.current, fontWeight = FontWeight.ExtraBold),   // ← G10
        maxLines = 1, overflow = TextOverflow.Ellipsis,
        modifier = Modifier.weight(1f),
    )
    // « Tout voir · 574 » au lieu de « (574) » : l'en-tête ressemblait à un titre de
    // section. Le chevron seul, à 32 % d'opacité, ne se lit pas à trois mètres — or
    // c'est la seule échappatoire aux 566 appuis d'une rangée d'ANIMATION.
    Text(
        stringResource(R.string.action_see_all, count),      // « Tout voir · %1$d »
        style = LocalPurpleType.current.capsLabel.copy(color = PurplePalette.Purple300),
    )
    Icon(Icons.Rounded.ChevronRight, null,
         tint = PurplePalette.Purple300, modifier = Modifier.size(20.dp))
}
```

Chaîne à ajouter dans les deux `strings.xml` : `action_see_all` — `"Tout voir · %1$d"` /
`"See all · %1$d"`.

> ⚠️ **Rappel §8.9** : `%1$d` reçoit un `Int`. Un `%d` recevant une `String` fait tomber
> l'écran à l'exécution — c'est ce qui a planté la fiche série au §20. Contrôler l'argument
> à l'appel, pas seulement la chaîne.

**Hors périmètre.** Une vraie grille paginée à la place des rangées imbriquées reste
préférable à terme, et l'écran « genre sélectionné » de `TvMoviesScreen` en est déjà une.
La question à trancher est de savoir si la vue groupée garde un intérêt une fois
« Tout voir » lisible.

---

### G15 — Le genre focalisé n'est pas celui dont on voit les chaînes

- **Fichier** : `TvHomeScreen.kt:199-238`
- **Priorité : Gênant.**

**Cause racine.** Le panneau droit est dérivé de `selectedGroup`, qui n'est écrit que par
`onClick` :

```kotlin
val currentGenre = selectedGroup ?: grouped.firstOrNull()?.first     // :199
// …
TvGenreItem(onClick = { selectedGroup = genre }, /* … */)            // :218
```

Le panneau ne suit donc que la **validation**, pas le focus. On peut parcourir dix genres
avec la liste d'un onzième affichée à droite, et rien à l'écran ne signale le décalage —
dans une disposition à deux panneaux, l'attente est exactement l'inverse.

**Solution recommandée.** Faire suivre le focus, avec temporisation pour ne pas recharger
579 lignes pendant un défilement rapide. `selectedGroup` reste la validation — c'est lui
qui survit à un aller-retour dans un autre onglet.

```kotlin
// app-tv/…/ui/home/TvHomeScreen.kt
var focusedGenre  by remember { mutableStateOf<String?>(null) }
var previewGenre  by remember { mutableStateOf<String?>(null) }

// 300 ms : assez pour absorber un défilement rapide (auto-répétition ≈ 100 ms/appui),
// assez court pour que l'accord panneau gauche / panneau droit paraisse immédiat.
LaunchedEffect(focusedGenre) {
    val g = focusedGenre ?: return@LaunchedEffect
    delay(300)
    previewGenre = g
}

// La validation reste prioritaire : elle vaut intention explicite et survit à un
// changement d'onglet, contrairement au survol.
val currentGenre = selectedGroup ?: previewGenre ?: grouped.firstOrNull()?.first

// …
TvGenreItem(
    genre      = genre,
    isSelected = genre == currentGenre,
    onClick    = { selectedGroup = genre },
    onFocused  = { focusedGenre = genre; selectedGroup = null },   // ← nouveau
    /* … */
)
```

```kotlin
// TvGenreItem — signale son focus sans devenir un second focalisable (§8.10)
Surface(
    onClick  = onClick,
    modifier = Modifier
        .weight(1f)
        .onFocusChanged { if (it.isFocused) onFocused() },
    /* … */
)
```

> **Deux points à surveiller à l'émulateur.**
> 1. `selectedGroup = null` dans `onFocused` est nécessaire pour que le survol reprenne la
>    main après une validation — sans lui, le panneau resterait figé sur le dernier genre
>    validé. Vérifier que cela ne casse pas le `BackHandler` de `TvHomeScreen.kt:85`, qui
>    teste `selectedGroup != null`.
> 2. Le repli proposé par l'audit — griser le panneau droit tant que le genre focalisé
>    n'est pas celui affiché — reste la solution de secours si le rechargement à 300 ms
>    s'avère trop coûteux sur le catalogue réel (11 899 chaînes). Le mesurer avant de
>    trancher.

**Vérification.** Focaliser « ALBANIA » sans valider : après 300 ms, le panneau droit doit
afficher RTSH 1, RTSH 2, RTSH 3. Parcourir dix genres à l'auto-répétition : le panneau ne
doit se recharger qu'une fois, à l'arrêt.

---

## Lot 6 — Finitions

### G14 — Changer de langue relance l'application et éjecte des Paramètres

- **Fichier** : `TvMainScreen.kt:559-566`
- **Priorité : Amélioration.**

**Cause racine.** `activity.recreate()` détruit et recrée l'`Activity`. `TvNavGraph` repart
de `currentScreen = null`, refait son `LaunchedEffect(Unit)` et retombe sur `TvScreen.Main`
avec `selectedIndex = 0`. Le `rememberSaveableStateHolder` de §38 conserve l'état *interne*
de chaque onglet, mais **pas quel onglet était ouvert** : `selectedIndex` est un
`remember` simple (`TvMainScreen.kt:83`), pas un `rememberSaveable`.

**Solution recommandée.** Un changement de deux caractères. `recreate()` conserve le
`Bundle` d'état sauvegardé, donc `rememberSaveable` suffit.

```kotlin
// app-tv/…/ui/main/TvMainScreen.kt:83
// `rememberSaveable` et non `remember` : `activity.recreate()` (changement de langue)
// détruit l'Activity et ramenait systématiquement sur Direct TV — 7 appuis pour revenir
// aux Paramètres, dans une interface dont on ne lit plus les libellés si l'on s'est
// trompé de langue.
var selectedIndex by rememberSaveable { mutableIntStateOf(0) }
```

Faire de même pour `showLogoutConfirm` **non** — il doit repartir à `false`, une
confirmation ne survit pas à une recréation.

**Vérification.** Paramètres → `OK` sur « FR » : après recréation, l'écran affiché doit
être Paramètres, pas Direct TV.

---

### M2 — « Retour » des Paramètres est une affordance inerte

- **Fichier** : `TvMainScreen.kt:545-551`
- **Priorité : Amélioration.**

**Cause racine.** C'est un `androidx.compose.material3.Text` nu, placé en haut à droite de
la carte. Il ressemble à un bouton et n'est ni cliquable ni focalisable ; il n'apparaît
dans aucun parcours de focus.

**Solution recommandée.** Le supprimer. Une fois B4 livré, `RETOUR` sort des Paramètres, et
`◀` mène au rail : la fonction est couverte deux fois. Une affordance inerte coûte plus
qu'elle ne rapporte — et un focalisable de plus a un coût sur télécommande (§8.10).

```kotlin
// TvMainScreen.kt:538-551
Row(verticalAlignment = Alignment.CenterVertically) {
    Text(
        stringResource(R.string.settings_title),
        style = LocalPurpleType.current.h2.copy(color = PurplePalette.Fg1),
        modifier = Modifier.weight(1f),
    )
    // SUPPRIMÉ : `Text("Retour")` — ni cliquable, ni focalisable, absent de tout
    // parcours. RETOUR (B4) et ◀ couvrent la fonction.
}
```

Si l'on préfère la conserver, en faire une `Surface` focalisable **avec** `onClick`, pas un
`Text` décoré.

---

### M4 — L'écran d'achat a un seul focalisable, en lien gris à 3,41 : 1

- **Fichier** : `TvPurchaseScreen.kt:63-67`
- **Priorité : Amélioration.** Largement couvert par B2 ; ce qui reste est visuel.

**Cause racine.** `TextButton` + `TvTextPrimary.copy(0.4f)` + `TextDecoration.Underline` :
c'est une convention **web**. Sur TV, une action secondaire est un bouton à bordure — le
soulignement ne se lit pas à trois mètres et l'opacité 0,4 donne 3,41 : 1 même focalisé.
S'y ajoute une colonne droite vide aux deux tiers quand la facturation ne rend rien : c'est
l'écran qui vend.

**Solution recommandée.** B2 remplit déjà la colonne droite (offres, ou erreur explicite
avec « Réessayer » et « Restaurer mes achats ») et remplace le lien par un bouton. Reste à
appliquer le jeton de G10 :

```kotlin
// Action secondaire de TV = bouton à bordure, pas lien souligné.
Surface(
    onClick = onBack,
    shape   = ClickableSurfaceDefaults.shape(PurpleShapes.Md),
    colors  = ClickableSurfaceDefaults.colors(
        containerColor        = Color.Transparent,
        contentColor          = PurplePalette.Fg2,          // 78 % ≈ 11 : 1 sur Bg1
        focusedContainerColor = PurplePalette.Purple400,
        focusedContentColor   = PurplePalette.FgOnPrimary,  // 9,4 : 1 — cf. G10
    ),
    border = ClickableSurfaceDefaults.border(
        border = Border(BorderStroke(1.dp, PurplePalette.Line1), shape = PurpleShapes.Md),
    ),
) {
    Text(stringResource(R.string.purchase_later),
         modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
         style    = LocalPurpleType.current.button)
}
```

---

### M5 — Le texte d'état vide de « Ma liste » oublie les chaînes

- **Fichiers** : `app-tv/src/main/res/values/strings.xml:80` et `values-fr/strings.xml`
- **Priorité : Amélioration.**

**Cause racine.** `mylist_empty_hint` dit « Ajoutez des films ou des séries depuis leurs
fiches » alors que le filtre « Chaînes » existe juste au-dessus et que les chaînes sont bien
favorisables depuis le §14. Le texte n'a pas suivi la fonctionnalité.

**Solution recommandée.** Reprendre la formulation du mobile — **mais pas telle quelle** :
`MyListScreen.kt:156` porte la phrase en **littéral français codé en dur**, ce qui est le
défaut M1 sur l'autre application. Extraire dans les deux `strings.xml` des deux modules,
et faire pointer le mobile sur la ressource au passage.

```xml
<!-- app-tv et app-mobile, values/strings.xml -->
<string name="mylist_empty_hint">Add channels with the star in the channel list, or movies and series from their pages.</string>
<!-- values-fr/strings.xml -->
<string name="mylist_empty_hint">Ajoutez des chaînes avec l\'étoile de la liste, ou des films et séries depuis leurs fiches.</string>
```

L'état vide de « Ma liste » a par ailleurs le défaut structurel de G7 (zéro focalisable) :
lui ajouter le même CTA.

---

### M7 — Rail replié : les icônes de Direct TV et Séries se confondent

- **Fichier** : `TvMainScreen.kt:155-160`
- **Priorité : Amélioration.**

**Cause racine.** `Icons.Rounded.LiveTv` (un téléviseur) pour Direct TV et `Icons.Rounded.Tv`
(un moniteur) pour Séries : deux rectangles sur pied, indiscernables à 22 dp et à trois
mètres. Ce sont les deux catégories les plus utilisées.

**Solution recommandée.** Une icône franchement typée pour Séries. `material-icons-extended`
est déjà une dépendance — aucun ajout.

```kotlin
val navItems = listOf(
    NavItem(stringResource(R.string.nav_live),      Icons.Rounded.LiveTv),
    NavItem(stringResource(R.string.nav_movies),    Icons.Rounded.Movie),
    // `Tv` (un moniteur) et `LiveTv` (un téléviseur) sont deux rectangles sur pied :
    // indiscernables à 22 dp. `VideoLibrary` évoque une pile d'épisodes.
    NavItem(stringResource(R.string.nav_series),    Icons.Rounded.VideoLibrary),
    NavItem(stringResource(R.string.nav_mylist),    Icons.Rounded.Bookmarks),
    NavItem(stringResource(R.string.nav_downloads), Icons.Rounded.Download),
    NavItem(stringResource(R.string.nav_settings),  Icons.Rounded.Settings),
)
```

**Alternative à considérer.** L'audit note que le rail replié fait 72 dp — assez pour un
libellé de 12 sp sous l'icône. Garder les libellés visibles en permanence supprimerait le
problème d'ambiguïté **et** une partie de G2 (le dépliage aurait moins d'utilité). À
arbitrer visuellement.

---

### M8 — « 3 day(s) remaining » : pluriel non résolu, action non annoncée

- **Fichiers** : `TvMainScreen.kt:463-470`, `strings.xml:14,17` des deux langues
- **Priorité : Amélioration.**

**Cause racine.** `<string name="trial_banner">Free trial: %d day(s) remaining.</string>` —
le pluriel est contourné par la parenthèse au lieu d'être résolu. Et le badge est une
`Surface(onClick = onPurchase)` focalisable, mais rien ne l'annonce comme une action.

**Solution recommandée.** `plurals` Android, plus un chevron. ⚠️ Le français et l'anglais
n'ont pas les mêmes catégories de pluriel : `one` couvre 0 et 1 en français, seulement 1 en
anglais — d'où `<item quantity="one">` distinct dans chaque fichier.

```xml
<!-- app-tv/src/main/res/values/plurals.xml -->
<plurals name="trial_banner">
    <item quantity="one">Free trial: %d day remaining.</item>
    <item quantity="other">Free trial: %d days remaining.</item>
</plurals>
<plurals name="premium_days">
    <item quantity="one">%d day remaining.</item>
    <item quantity="other">%d days remaining.</item>
</plurals>
```

```xml
<!-- app-tv/src/main/res/values-fr/plurals.xml -->
<plurals name="trial_banner">
    <item quantity="one">Essai gratuit : %d jour restant.</item>
    <item quantity="other">Essai gratuit : %d jours restants.</item>
</plurals>
<plurals name="premium_days">
    <item quantity="one">%d jour restant.</item>
    <item quantity="other">%d jours restants.</item>
</plurals>
```

```kotlin
// TvMainScreen.kt:463-470
val label = if (days > 0)
    pluralStringResource(R.plurals.trial_banner, days, days)
else
    stringResource(R.string.trial_expired)

Row(verticalAlignment = Alignment.CenterVertically) {
    Text(label, style = LocalPurpleType.current.bodySmall.copy(color = LocalContentColor.current))
    Spacer(Modifier.weight(1f))
    // Le badge ouvre l'écran d'achat depuis le §10 (UX-2) mais rien ne le disait :
    // il ressemblait à un état, pas à une action.
    Icon(Icons.Rounded.ChevronRight, null, tint = PurplePalette.Purple300,
         modifier = Modifier.size(16.dp))
}
```

Supprimer les deux anciennes clés `<string>` des quatre fichiers ; le contrôle de parité
du §17 doit être étendu aux `plurals`, qu'il ne couvre pas aujourd'hui.

---

## Annexe — Table de correspondance

| Réf. | Sévérité | Lot | Fichier principal | Prérequis |
|---|---|---|---|---|
| B1 | Bloquant | 1 | `TvSetupScreen.kt:349` | — |
| B4 | Bloquant | 1 | `TvNavGraph.kt` + `TvPlayerScreen.kt:123` | — |
| B2 | Bloquant | 1 | `TvPurchaseScreen.kt:63` | B4 (flag `blocking`) |
| B3 | Bloquant | 1 | `TvMainScreen.kt:512` | Lot 0 (ancre) |
| G5 | Gênant | 2 | `TvMoviesScreen.kt:96` | Lot 0 |
| G4 | Gênant | 2 | `TvMoviesScreen.kt:451` | **B4** |
| G2 | Gênant | 2 | `TvMainScreen.kt:88` | **G5** |
| G3 | Gênant | 2 | `TvMainScreen.kt:175` | Lot 0 |
| G6 | Gênant | 2 | `TvMoviesScreen.kt:152` | Lot 0, G5 |
| G9 | Gênant | 2 | `TvHomeScreen.kt:249` | Lot 0 |
| G7 | Gênant | 2 | `TvDownloadsScreen.kt:63` | — |
| G1 | Gênant | 3 | `TvPlayerScreen.kt:166` | — |
| G13 | Gênant | 3 | `TvPlayerScreen.kt:95` | — |
| M1 | Mineur | 3 | `TvPlayerScreen.kt:760` | — |
| M9 | Mineur | 3 | `TvPlayerScreen.kt` (dialogue) | — |
| G10 | Gênant | 4 | `TvTheme.kt:43` | — |
| M3 | Mineur | 4 | `TvTheme.kt:125` | G10 (même passe) |
| M6 | Mineur | 4 | `TvMoviesScreen.kt` (`LazyRow`) | — |
| G8 | Gênant | 5 | toutes les listes | Lot 0 |
| G11 | Gênant | 5 | `TvChannelRow.kt:104` | G8 |
| G12 | Gênant | 5 | `TvMoviesScreen.kt:865` | G6 |
| G15 | Gênant | 5 | `TvHomeScreen.kt:199` | — |
| G14 | Mineur | 6 | `TvMainScreen.kt:83` | — |
| M2 | Mineur | 6 | `TvMainScreen.kt:545` | B4 |
| M4 | Mineur | 6 | `TvPurchaseScreen.kt:63` | B2, G10 |
| M5 | Mineur | 6 | `strings.xml:80` | G7 (même CTA) |
| M7 | Mineur | 6 | `TvMainScreen.kt:157` | — |
| M8 | Mineur | 6 | `plurals.xml` (neuf) | — |

### Ressources à créer

`app-tv`, dans **les deux** `values/` et `values-fr/` — contrôle de parité §17 à rejouer :

| Clé | Défaut | Note |
|---|---|---|
| `action_retry` | B2, G1 | existe sur `app-mobile:107`, absent de `app-tv` |
| `action_restore` | B2 | neuf |
| `player_error` | G1 | neuf |
| `player_no_tracks` | M9 | existe sur `app-mobile:111`, absent de `app-tv` |
| `downloads_empty_cta` | G7 | neuf |
| `action_see_all` | G12 | `%1$d` — contrôler le type à l'appel (§8.9) |
| `mylist_empty_hint` | M5 | à reformuler dans les deux modules |
| `plurals/trial_banner`, `plurals/premium_days` | M8 | remplacent les `<string>` existants |
