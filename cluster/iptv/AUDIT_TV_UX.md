# Audit UX / QA — Purple IPTV au D-pad (Android TV)

Parcours systématique de `app-tv` **à la télécommande** sur émulateur, avec le catalogue
réel de l'utilisateur. Chaque défaut ci-dessous a été **reproduit à l'écran** ; la lecture
des sources n'intervient que pour en nommer la cause.

| | |
|---|---|
| Date | 2026-08-20 |
| Build | `app-tv` debug, versionCode **10** / versionName **1.2.1** |
| Appareil | AVD `purple_tv` — Android 13 (API 33), 1920×1080, `-gpu host` |
| Catalogue | Xtream réel — 11 899 chaînes / 75 genres, 26 298 films / 50 genres, 8 470 séries |
| Écrans couverts | 12 |
| Méthode | `adb shell input keyevent` + relevé `uiautomator` du nœud `focused="true"`, échantillonnage des captures d'écran au pixel |

**Bilan : 28 défauts — 4 bloquants, 15 gênants, 9 mineurs.** 21 des 28 relèvent
directement de la gestion du focus.

---

## Table des matières

- [1. Bloquants](#1-bloquants)
- [2. Gênants](#2-gênants)
- [3. Mineurs](#3-mineurs)
- [4. Répartition par écran](#4-répartition-par-écran)
- [5. Ce qui tient déjà](#5-ce-qui-tient-déjà)
- [6. Portée et limites de l'audit](#6-portée-et-limites-de-laudit)
- [7. Ordre de traitement suggéré](#7-ordre-de-traitement-suggéré)

---

## 1. Bloquants

Trois d'entre eux ferment une porte que rien d'autre n'ouvre : se connecter par
identifiants, se déconnecter, revenir en arrière. Le quatrième ouvre une porte qui
devrait rester fermée.

### B1 — Les champs de saisie piègent le focus : la connexion par identifiants est impossible à la télécommande

- **Écran / contexte** : écran de connexion (`TvSetupScreen`), onglets *Lien M3U* **et** *Identifiants*
- **Sévérité** : **Bloquant**

**Problème constaté.** Dès que le focus entre dans un champ de texte, plus aucune
direction ne l'en fait sortir. Le clavier virtuel s'ouvre et avale haut / bas / gauche /
droite ; on le referme avec `RETOUR`, et le champ continue d'avaler les mêmes touches.
Pire : `OK` (`DPAD_CENTER`) **ne rouvre pas** le clavier — seul `KEYCODE_ENTER` le fait,
or une vraie télécommande envoie `DPAD_CENTER`.

Sur l'onglet **Identifiants**, le piège se referme sur le *premier* des trois champs :
« Nom d'utilisateur », « Mot de passe » et « Se connecter » ne sont jamais atteignables
autrement qu'en naviguant **à l'intérieur du clavier virtuel** jusqu'à sa touche
« suivant » (`→|`) — neuf appuis pour passer un champ. La seule autre issue est `RETOUR`,
qui quitte l'application (cf. B4).

```
Trace relevée — onglet Identifiants, clavier fermé
focus  [939,243][1816,371]  'Server (Host)'
▼ ×5   focus inchangé   ×5
▲ ◀ ▶  focus inchangé
OK     mInputShown=false        ← le clavier ne se rouvre pas
ENTER  mInputShown=true         ← seule touche qui le rouvre (absente des télécommandes)
RETOUR topResumedActivity = com.google.android.tvlauncher
```

**Cause.** `TvSetupScreen.kt:349` — `TvSetupField` utilise un `OutlinedTextField`
Material3 nu, sans aucune interception de touche.

**Piste de correction.** Porter le correctif déjà appliqué à `TvSearchBar` (§26 de
`CLAUDE.md`) : interception haut/bas en `onPreviewKeyEvent` déléguée à
`focusManager.moveFocus`, plus `focusProperties { canFocus = editing }` pour le clavier à
la demande. Il règle l'entrée *et* la sortie du champ.

---

### B2 — La barrière d'expiration se contourne en deux appuis

- **Écran / contexte** : écran d'achat (`TvPurchaseScreen`) atteint comme barrière (`access == false`)
- **Sévérité** : **Bloquant** (perte de revenu directe)

**Problème constaté.** Avec un essai expiré, l'application s'ouvre bien sur l'écran
Premium. Mais celui-ci affiche toujours le lien « Plus tard », et c'est **le seul élément
focalisable de l'écran** : `▼` pour le prendre, `OK` pour le valider, et le catalogue
complet s'ouvre. Aucune revérification n'a lieu ensuite.

```
Mesuré — état d'essai expiré injecté dans trial_prefs.preferences_pb
lancement → « Premium · Accès illimité… · Plus tard »
focusables : 1 seul  →  [128,660][291,756] 'Plus tard'
▼ OK  →  « Direct TV | 11899 CHAÎNES - 75 GENRES »
```

**Cause.** `TvPurchaseScreen.kt:63` rend inconditionnellement le `TextButton(onClick =
onBack)`, et `TvNavGraph` câble `onBack = { currentScreen = TvScreen.Main }` aussi bien
pour l'ouverture volontaire depuis le badge d'essai que pour la barrière. Le mobile a reçu
ce correctif (P9, `onBack` nullable + `Routes.purchase(blocking = true)`) ; la TV non.

**Piste de correction.** Donner à `TvPurchaseScreen` le paramètre
`onBack: (() -> Unit)?` nullable du mobile, et passer `null` depuis la branche barrière du
`TvNavGraph`.

> ⚠️ **Attention** : l'écran n'aurait alors **plus aucun** focalisable tant que la
> facturation ne renvoie pas d'offre. Prévoir un bouton « Réessayer » pour ne pas remplacer
> une fuite par un écran mort.

---

### B3 — La déconnexion est hors de l'écran : on ne peut pas changer de fournisseur

- **Écran / contexte** : Paramètres (`TvMainScreen.kt:512`, `TvSettingsPanel`)
- **Sévérité** : **Bloquant**

**Problème constaté.** La carte des Paramètres est plus haute que 1080 px et n'a *aucun*
défilement — le code l'assume : `// Centred card — everything visible at a glance, no
scroll needed`. Le bloc « Déconnexion » (titre, explication, bouton) tombe entièrement
sous le bord bas.

Le bouton reste focalisable, mais seulement par un rebouclage contre-intuitif : `▲` depuis
la rangée des langues saute tout en bas de l'écran. Une fois focalisé, il est
**invisible** — seul un liseré rouge de quelques pixels dépasse. Le valider arme deux
boutons de confirmation eux aussi hors champ, **et** envoie le focus dans le rail latéral
qui se déplie.

```
Trace relevée
▼ ×3 depuis « Langue »  →  bloqué sur le toggle [1364,729][1468,825]
▲ ×4 depuis « EN »      →  focus [596,976][771,1072]     (écran = 1080 px)
OK                      →  2 boutons hors champ [596,976] + [773,976]
                           et focus → rail 'Live TV', rail déplié
```

**Piste de correction.** Un `Modifier.verticalScroll(rememberScrollState())` sur la
colonne, plus un indicateur de débordement. À défaut, sortir la déconnexion de la carte
pour en faire une entrée du rail — c'est une action de compte, pas un réglage de
sous-titres.

---

### B4 — RETOUR ne navigue jamais : il quitte l'application

- **Écran / contexte** : transverse — lecteur, écran de connexion, écran d'achat
- **Sévérité** : **Bloquant**

**Problème constaté.** Sur Android TV, `RETOUR` est la commande la plus utilisée après les
flèches. Ici elle n'est interceptée nulle part au-dessus des onglets : `TvNavGraph` est une
machine à états `when (currentScreen)` **sans pile de navigation et sans `BackHandler`**.
La touche traverse jusqu'à l'Activity, qui se termine.

Dans le lecteur, les deux premiers appuis sont consommés par l'affichage de l'overlay — le
troisième éjecte vers le lanceur TV, en pleine lecture. La seule sortie prévue est la petite
flèche en haut à gauche de l'overlay : réveiller l'overlay, remonter, valider — trois appuis
contre un.

```
Mesuré — depuis le lecteur
RETOUR ×1 → overlay ré-affiché
RETOUR ×2 → overlay ré-affiché
RETOUR ×3 → topResumedActivity = com.google.android.tvlauncher

app-tv/…/ui/main/TvMainScreen.kt:47
  import androidx.activity.compose.BackHandler   ← importé, jamais utilisé
```

**Piste de correction.** Poser un `BackHandler` par destination du `TvNavGraph`
(lecteur → Main, achat non bloquant → Main, connexion → rien), et ne laisser la touche
s'échapper que depuis l'écran d'accueil. L'import déjà présent dans `TvMainScreen` suggère
que l'intention existait.

---

## 2. Gênants

Onze des quinze ont la même racine : quand l'élément focalisé disparaît, ou qu'il n'y a
rien dans la direction demandée, Compose TV donne le focus au focalisable le plus proche —
et le rail, toujours présent à gauche, est le candidat permanent.

### G1 — Un échec de lecture ne produit aucun message : écran noir indéfini

- **Écran** : lecteur · **Sévérité** : Gênant (Bloquant du point de vue de l'utilisateur qui ne comprend rien)

Le flux a échoué (HTTP 407 côté fournisseur). L'application n'a **rien** affiché : ni
erreur, ni indicateur, ni action de reprise. Le relevé de l'arbre d'accessibilité ne
rapporte aucun texte ; l'overlay se contente du titre de la chaîne et d'un `▶`.

Ce n'est pas une lacune du socle : `PlayerService` expose bien `PlayerStatus.ERROR` et un
message, et `PlayerScreen` côté **mobile** le rend (l. 208–215). `TvPlayerScreen` ne
contient pas une seule occurrence de « error » et ne gère que l'état `BUFFERING`.

```
uiautomator  →  TEXTES: []   DESC: []
logcat       →  ExoPlaybackException … HttpDataSourceException 407
grep -c error  app-tv/…/TvPlayerScreen.kt        →  0
grep -n  error  app-mobile/…/PlayerScreen.kt     →  208, 215
```

**Correction.** Porter le bloc `if (state.status == PlayerStatus.ERROR)` du mobile, avec un
bouton « Réessayer » focalisable qui reçoit le focus d'office.

---

### G2 — Le menu latéral s'ouvre tout seul sur des gestes courants

- **Écran** : rail de navigation · **Sévérité** : Gênant

Le rail se déplie 100 ms après que le focus y entre (`TvMainScreen.kt:89`), et l'animation
décale **tout le contenu de 336 px vers la droite**. Or le focus y arrive sans que
l'utilisateur l'ait demandé, à chaque fois qu'un élément focalisé disparaît.

```
Reproduit ×4
Films → ouvrir une fiche → RETOUR    ⇒ rail DÉPLIÉ, focus 'Direct TV'
Séries → recherche → RETOUR          ⇒ rail DÉPLIÉ, focus 'Direct TV'
Paramètres → OK sur « Déconnexion »  ⇒ rail DÉPLIÉ, focus 'Live TV'
Fiche film → ◀                       ⇒ rail DÉPLIÉ, focus 'Downloads'

rail replié 144 px · rail déplié 480 px · contenu décalé de 336 px
```

**Correction.** Généraliser le mécanisme déjà en place dans `TvMyListScreen`
(`FocusRequester` + drapeau `refocusAfterEdit`) partout où une fermeture détruit l'élément
focalisé. Découpler aussi le dépliage du focus : n'ouvrir le rail que sur une entrée
*latérale* délibérée, jamais sur une reprise de focus par défaut.

---

### G3 — Entrer dans le rail ne mène jamais à l'onglet où l'on se trouve

- **Écran** : rail de navigation · **Sévérité** : Gênant

Depuis l'onglet Direct TV, `◀` donne le focus non pas à « Direct TV » mais à l'élément du
rail situé *à la même hauteur* que la ligne où l'on était. Un `▼` que l'utilisateur pense
mener de Direct TV à Films l'emmène en réalité vers Téléchargements.

```
Mesuré — onglet actif : Direct TV
focus contenu [192,346] 'ALGERIE'  → ◀ →  rail 'Series'
focus contenu [192,426] 'BRASIL'   → ◀ →  rail 'My list'
focus contenu [192,426] 'ARABES'   → ◀ →  rail 'My list'
```

**Correction.** `focusProperties { enter = { railFocus[selectedIndex] } }` sur le rail —
un point d'**entrée**, pas un `LaunchedEffect` : c'est justement un effet de ce type qui a
dû être retiré au §40 parce qu'il happait le focus au lancement.

---

### G4 — La fiche détail ne retient pas le focus : on peut naviguer ailleurs sans la fermer

- **Écran** : fiche film / série · **Sévérité** : Gênant

La fiche se présente comme une page modale, mais le rail reste focalisable derrière elle.
Depuis « Lire », un simple `◀` ouvre le menu latéral par-dessus la fiche ; un `OK` de plus
change d'onglet et la fiche disparaît sans avoir été fermée.

```
fiche ouverte, focus 'Lire'
◀   →  rail DÉPLIÉ, focus 'Downloads'
OK  →  onglet Téléchargements, fiche perdue
```

**Correction.** Encadrer le contenu de la fiche d'un `focusGroup()` avec
`focusProperties { exit = FocusRequester.Cancel }` tant qu'elle est ouverte, en laissant
`RETOUR` comme unique sortie. Même garde-fou que celui déjà posé sur le rail au §30 pour
les directions verticales — il manque sur l'axe horizontal quand une fiche est ouverte.

---

### G5 — Fermer une fiche ne rend jamais le focus à l'affiche qu'on avait ouverte

- **Écran** : fiche film / série · **Sévérité** : Gênant

Les deux chemins de fermeture donnent deux résultats différents, et aucun ne ramène sur
l'élément d'origine. L'utilisateur qui a parcouru vingt affiches d'une rangée doit tout
refaire.

```
Affiche ouverte : [412,266] « Lost on a Mountain in Maine »
fermeture par RETOUR      ⇒ focus rail 'Direct TV'  (rail déplié)
fermeture par « Fermer »  ⇒ focus 'Retour' [192,39]
attendu                   ⇒ focus [412,266], rangée à la même position
```

**Correction.** Mémoriser le `FocusRequester` de l'élément qui a ouvert la fiche et le
redemander à la fermeture, quel que soit le chemin. C'est la contrepartie indispensable de
G4 : piéger le focus n'a de sens que si on sait le rendre.

---

### G6 — Le focus d'arrivée sur un onglet est imprévisible, et jamais sur le contenu

- **Écran** : Films · Séries · **Sévérité** : Gênant

Après avoir choisi « Films » dans le rail, le focus atterrit tantôt sur la **barre de
recherche**, tantôt sur l'**en-tête de genre** — jamais sur la première affiche. Depuis la
barre, `▼` mène au petit bouton favori en bout de ligne d'en-tête, puis un second `▼`
tombe au milieu de la rangée : la 8ᵉ affiche, en sautant les sept premières.

```
Trois entrées successives dans l'onglet Films
#1  focus [1312,39]            barre de recherche
#2  focus [192,166][1792,250]  en-tête de genre
#3  focus [192,166][1792,250]  en-tête de genre
▼ ▼ depuis la barre → [677,266] 8ᵉ affiche (rangée auto-défilée)
```

**Correction.** Un `FocusRequester` explicite sur la première carte de la première rangée,
redemandé à l'affichage de l'onglet. La recherche est une action secondaire : elle ne doit
pas être le point d'entrée par défaut d'un écran de catalogue.

---

### G7 — Sur un onglet vide, le focus est enfermé dans le rail resté ouvert

- **Écran** : Téléchargements (état vide) · **Sévérité** : Gênant

L'onglet sans contenu n'offre aucun élément focalisable. Le focus reste donc dans le rail,
qui reste **déplié en permanence** et occupe un quart de l'écran. `▶`, le geste naturel
pour « aller au contenu », ne fait rien : la télécommande paraît morte sur cet axe.

```
onglet Téléchargements (vide)
focusables : 7  →  tous dans le rail
▶  ⇒ focus inchangé, rail toujours à 480 px
```

**Correction.** Rendre focalisable l'état vide lui-même (une carte « Parcourir les films »
qui bascule sur l'onglet Films) — un écran de TV ne devrait jamais présenter zéro cible.
À défaut, replier le rail dès qu'un onglet est validé, même si le focus n'a pas pu partir.

---

### G8 — Les touches page précédente / page suivante détruisent le focus

- **Écran** : transverse (toutes les listes) · **Sévérité** : Gênant

Beaucoup de télécommandes et de box émettent `PAGE_UP` / `PAGE_DOWN` (souvent sous
l'étiquette chaîne +/−). Ces touches font défiler d'une page, l'élément focalisé est
recyclé, et **plus aucun nœud n'a le focus**. L'application paraît figée jusqu'à un appui
supplémentaire qui le récupère au hasard.

```
Liste des chaînes (genre ARABES, 579 entrées)
PAGE_DOWN (93) → aucun focus
PAGE_UP   (92) → aucun focus
▼ (récupération) → focus [888,435] 'AR | SHAHID ACTION'

Sans effet, focus conservé : MEDIA_FF (90), MEDIA_NEXT (87), MOVE_HOME (122),
                             CHANNEL_UP (166), CHANNEL_DOWN (167)
```

**Correction.** Les intercepter en `onPreviewKeyEvent` sur les listes pour en faire un vrai
saut de page **avec** déplacement du focus. C'est aussi la réponse la moins coûteuse à
G11 : une touche déjà présente sur la télécommande, actuellement nuisible, deviendrait le
raccourci qui manque.

---

### G9 — Les résultats de recherche sautent le premier, et la dernière carte renvoie à la barre

- **Écran** : recherche (Direct TV, Films, Séries) · **Sévérité** : Gênant

La barre est ancrée en haut à *droite*, les résultats commencent en haut à *gauche*. `▼`
depuis la barre choisit le focalisable le plus proche verticalement — le **deuxième**
résultat. Et `▶` sur le dernier résultat, faute de voisin à droite, remonte à la barre.

```
Recherche « Simpson » — 2 résultats
résultats : [192,174] #1   ·   [533,174] #2
barre     : [1312,39]
▼ depuis la barre  → #2   (le #1 est sauté)
▶ depuis #2        → barre de recherche
◀ depuis #2        → #1   (correct)
```

> Correction d'un constat antérieur : le §24 de `CLAUDE.md` avait conclu que ce défaut
> « n'existe pas » sur la base d'une recherche à **un seul** résultat. Avec deux résultats,
> il se manifeste.

**Correction.** `focusProperties { enter = firstResult }` sur la grille de résultats, et le
même garde-fou `enter = Cancel` sur la barre de recherche pour les directions latérales que
celui déjà posé sur le rail au §30 pour les directions verticales.

---

### G10 — L'élément focalisé est le moins lisible de l'écran

- **Écran** : transverse (listes, grilles, panneau des genres) · **Sévérité** : Gênant

Le focus se marque par un remplissage lavande vif et un texte blanc. Le repérage est
excellent, mais **lire** l'élément désigné devient plus difficile que lire ses voisins.
À trois mètres, c'est l'inverse de ce qu'il faut.

```
Contraste mesuré au pixel (WCAG)
ligne de chaîne au repos   #FFFFFF sur #1B0E36  →  18,06 : 1
ligne de chaîne FOCALISÉE  #FFFFFF sur #B36BFC  →   3,27 : 1
genre au repos                                  →  19,13 : 1
genre FOCALISÉ                                  →   3,27 : 1
```

**Correction.** Garder le remplissage lavande — c'est l'identité du produit — mais poser le
texte en `--on-accent` sombre (`#12061F`) plutôt qu'en blanc : le contraste repasse
au-dessus de 9 : 1 sans rien changer à la qualité du repérage.

---

### G11 — Un appui par élément, sur des listes de plusieurs centaines d'entrées

- **Écran** : Direct TV (deux panneaux) · **Sévérité** : Gênant

Ni index alphabétique, ni saut de page, ni raccourci — et les seules touches qui pourraient
en tenir lieu cassent le focus (G8). S'ajoutent deux arrêts de focus par ligne : chaque
genre porte son étoile, chaque chaîne aussi.

```
Coût mesuré
genre → étoile du genre → chaîne          3 appuis ▶
dernier genre (75ᵉ)                      74 appuis ▼
dernière chaîne de ARABES (579)         578 appuis ▼
lancer la 1ʳᵉ chaîne du 40ᵉ genre     ≈  43 appuis au total
```

**Correction**, par ordre de rapport coût/bénéfice :
1. rendre `PAGE_UP` / `PAGE_DOWN` utile (cf. G8) ;
2. un index A→Z focalisable en marge de la liste des genres ;
3. n'exposer l'étoile qu'au survol de la ligne focalisée, pour ne pas la facturer un appui
   à chaque traversée.

---

### G12 — Films et Séries ont gardé les rangées horizontales imbriquées

- **Écran** : Films · Séries · **Sévérité** : Gênant

Direct TV a été refondu en deux panneaux verticaux (§13) précisément parce qu'un axe de
défilement imbriqué dans l'autre coûte un appui par élément. Films et Séries n'ont pas
suivi. L'en-tête de genre ouvre bien une vue complète, mais rien ne le signale comme un
bouton, et il n'est pas le point d'entrée par défaut (cf. G6).

```
Onglet Films, catalogue réel
26 298 titres · 50 genres
ADVENTURE (280)   ANIMATION (574)
8 affiches visibles par rangée → jusqu'à 566 appuis ▶ pour la dernière
```

**Correction.** Donner à l'en-tête de genre l'apparence d'une action (« Tout voir · 574 »),
et le placer sur le trajet naturel du focus. Une vraie grille paginée reste préférable,
mais le chevron existe déjà : le rendre visible est le geste le moins coûteux.

---

### G13 — L'overlay du lecteur ramène le focus sur « Lecture » à chaque réapparition

- **Écran** : lecteur · **Sévérité** : Gênant

L'overlay se masque après 5 s d'inactivité — comportement correct, et le minuteur est bien
réarmé par les appuis. Mais à chaque réaffichage, un effet redemande inconditionnellement
le focus sur le bouton central : l'utilisateur qui était sur « Pistes » ou sur la vitesse
doit refaire le trajet.

```
app-tv/…/TvPlayerScreen.kt:95-98
LaunchedEffect(overlayVisible) {
    delay(80)
    if (overlayVisible && …) playFocus.requestFocus()
}
observé : après masquage, tout appui ⇒ focus [876,456] (bouton Lecture)
```

**Correction.** Ne poser le focus par défaut qu'à la *première* apparition de l'overlay ;
ensuite, mémoriser le dernier contrôle focalisé et le restaurer.

---

### G14 — Changer de langue relance l'application et éjecte des Paramètres

- **Écran** : Paramètres · **Sévérité** : Gênant

Basculer FR ↔ EN recrée l'activité et ramène sur Direct TV. L'utilisateur venu régler aussi
la taille des sous-titres doit refaire tout le chemin. Et s'il s'est trompé de langue, il
doit re-naviguer dans une interface dont il ne lit plus les libellés.

```
Paramètres → OK sur « FR »
⇒ « Direct TV | 11899 CHAÎNES - 75 GENRES », focus [192,250] 'ALBANIA'
retour aux Paramètres : ◀ puis ▼×5 puis OK  =  7 appuis
```

**Correction.** Restaurer l'écran Paramètres après la recréation — l'onglet est déjà
mémorisé par `rememberSaveableStateHolder` (§38), il suffit d'y ajouter l'état d'ouverture
des Paramètres.

---

### G15 — Le genre focalisé n'est pas celui dont on voit les chaînes

- **Écran** : Direct TV · **Sévérité** : Gênant

Dans une disposition à deux panneaux, l'attente est que le panneau droit suive le focus du
panneau gauche. Ici il ne suit que la *validation* : on peut parcourir dix genres avec, en
permanence, la liste d'un onzième affichée à droite. Rien à l'écran ne signale le décalage.

```
focus 'ALBANIA' (317)  ·  panneau droit : AFRICANS CHANNELS, AFRICA, CANAL+ …
OK sur 'ALBANIA'       ·  panneau droit : RTSH 1, RTSH 2, RTSH 3 …
```

**Correction.** Mettre à jour le panneau droit sur le focus, avec une temporisation de
250–400 ms pour ne pas recharger pendant un défilement rapide. Si le coût est jugé trop
élevé, marquer visuellement le décalage — griser le panneau droit tant que le genre
focalisé n'est pas celui affiché.

---

## 3. Mineurs

Défauts de finition. Aucun ne bloque un parcours, mais plusieurs touchent la lisibilité à
distance de canapé — la contrainte la plus spécifique du support.

| Réf. | Écran | Problème constaté | Piste de correction |
|---|---|---|---|
| **M1** | Lecteur | Le panneau « Style des sous-titres » affiche **Petit / Moyen / Grand / Blanc / Jaune** en français dans une interface en anglais. Libellés codés en dur (`TvPlayerScreen.kt:760,766,767`) — la campagne de localisation du §17 les a manqués parce qu'ils ne portent aucun accent. | Extraire en ressources ; les clés `fr`/`en` équivalentes existent déjà pour l'écran Paramètres. La parité `strings.xml` est par ailleurs intacte (app-tv 100/100, app-mobile 113/113). |
| **M2** | Paramètres | « Retour », en haut à droite de la carte, ressemble à un bouton mais est un `Text` nu (`TvMainScreen.kt:547`) : ni cliquable, ni focalisable. Il n'apparaît dans aucun parcours de focus. | En faire une `Surface` focalisable, ou le supprimer — une affordance inerte coûte plus qu'elle ne rapporte. |
| **M3** | Transverse | **34 des 64 tailles de police** de `app-tv` sont sous 14 sp, dont deux à **8 sp** (badges FILM / SÉRIE de « Ma liste ») et trois à 10 sp (badge LIVE du lecteur, badges « BEST DEAL » du paywall). Le minimum Android TV est 12 sp, la recommandation pour du texte courant 18 sp. Seules 6 valeurs sur 64 atteignent 18 sp. | Plancher à 12 sp pour les micro-étiquettes, 16–18 sp pour tout ce qui se lit. Un badge à 8 sp mesure 16 px de haut à l'écran. |
| **M4** | Écran d'achat | Un seul élément focalisable, « Plus tard », rendu en lien souligné gris à **3,41 : 1** de contraste même focalisé. Les deux tiers droits de l'écran sont vides. C'est l'écran qui vend. | Traiter « Plus tard » comme une action secondaire de TV (bouton, pas lien), et remplir la colonne droite : offres, ou état d'erreur explicite avec reprise. |
| **M5** | Ma liste | Le texte d'état vide dit « Ajoutez des films ou des séries depuis leurs fiches » alors que le filtre « Chaînes » existe juste au-dessus et que les chaînes sont bien favorisables. Le mobile, lui, mentionne les trois. | Reprendre la formulation du mobile (`MyListScreen.kt:155`), qui cite l'étoile de la liste des chaînes. |
| **M6** | Films · Séries | Les rangées d'affiches vont jusqu'à `x = 1920`, sans marge de sécurité à droite. Sur un téléviseur appliquant de l'overscan, la dernière affiche est amputée ; les guides Android TV demandent 5 % (48 dp). | Un `contentPadding` de fin sur les `LazyRow`. L'effet « affiche coupée » qui suggère le défilement se conserve, décalé de 48 dp. |
| **M7** | Rail de navigation | Rail replié, seules les icônes subsistent : un téléviseur pour Direct TV et un *moniteur* pour Séries se confondent à distance. Rien ne distingue les deux catégories les plus utilisées. | Une icône franchement typée pour Séries (pile d'épisodes, grille) — ou garder les libellés visibles en permanence, le rail replié faisant déjà 72 dp. |
| **M8** | Rail de navigation | Le badge d'essai affiche « Free trial: **3 day(s)** remaining. » — pluriel non résolu. Il est focalisable et ouvre l'écran d'achat, mais rien ne l'annonce comme une action. | Passer par un `plurals` Android, et ajouter une intention explicite (chevron, ou « Activer »). |
| **M9** | Lecteur | Le dialogue « Pistes et sous-titres » s'ouvre vide quand aucune piste n'est disponible : deux onglets, un bouton « Fermer », et rien entre les deux. Aucun message n'explique l'absence. | Un état vide explicite (« Aucune piste alternative sur ce flux »), au lieu d'un panneau qui semble ne pas avoir chargé. |

---

## 4. Répartition par écran

Les défauts se concentrent là où l'utilisateur entre dans l'application et là où il en
sort : connexion, rail, lecteur.

| Écran | Défauts | Bloq. | Gên. | Min. |
|---|---|---:|---:|---:|
| Écran de connexion | B1 | 1 | 0 | 0 |
| Rail de navigation | G2, G3, M7, M8 | 0 | 2 | 2 |
| Lecteur | G1, G13, M1, M9 | 0 | 2 | 2 |
| Paramètres | B3, G14, M2 | 1 | 1 | 1 |
| Films · Séries | G6, G12, M6 | 0 | 2 | 1 |
| Fiche film / série | G4, G5 | 0 | 2 | 0 |
| Écran d'achat | B2, M4 | 1 | 0 | 1 |
| Direct TV | G11, G15 | 0 | 2 | 0 |
| Recherche | G9 | 0 | 1 | 0 |
| Téléchargements | G7 | 0 | 1 | 0 |
| Ma liste | M5 | 0 | 0 | 1 |
| Transverse | B4, G8, G10, M3 | 1 | 2 | 1 |
| **Total** | | **4** | **15** | **9** |

---

## 5. Ce qui tient déjà

Relevé pour éviter qu'une correction ne le casse.

- **Le repérage du focus dans les listes et les grilles est excellent** — remplissage
  lavande, halo, légère mise à l'échelle. On voit d'un coup d'œil où l'on est ; c'est sa
  *lisibilité* qui pose problème (G10), pas sa visibilité.
- **Trois états visuellement distincts** dans le panneau des genres : au repos, sélectionné
  (violet sombre `#301A4F`) et focalisé (lavande vif `#B36BFC`). La distinction
  sélection/focus est correctement traitée — le correctif du §23 tient.
- **La barre de recherche n'ouvre plus le clavier au simple passage du focus** — il faut
  valider (`mInputShown=false` au focus, `true` après `OK`). Traverser la barre n'écrit plus
  dedans, et `▼` en ressort bien vers les résultats. Les correctifs §22 et §26 tiennent.
- **Le rail ne happe plus le focus au lancement** : l'application démarre sur le premier
  genre, rail replié. Le correctif du §40 tient.
- **Le focus ne s'échappe plus verticalement vers le rail** en bout de liste longue ; le
  garde-fou du §30 tient.
- **La fiche film est bien composée pour la télévision** : affiche 2:3 non déformée, boutons
  larges, hiérarchie claire, action première (« Lire ») focalisée à l'arrivée.
- **Le rail déplié est lisible** — libellés, onglet actif marqué par un liseré indépendant
  du focus.
- **Le minuteur de l'overlay du lecteur est correctement réarmé** par les appuis (5 s,
  `lastInteractionMs` dans la clé de l'effet) : il ne se masque plus en pleine navigation.
  Le correctif du §29 tient.

---

## 6. Portée et limites de l'audit

Ce qui n'a **pas** pu être vérifié, et pourquoi — à reprendre dans un second passage.

- **Tout ce qui suit le démarrage d'un flux.** Le fournisseur renvoie `HTTP 407` sur ses URL
  de flux depuis cet environnement (`ExoPlaybackException … Received HTTP_PROXY_AUTH`).
  La carte EPG, la barre de progression, le bouton VF / VOSTFR, la suggestion d'épisode
  suivant et le dialogue des pistes rempli n'ont donc pas pu être exercés. Le défaut G1 est,
  lui, une conséquence directe de cet échec — et une observation valide.
- **La fiche série et sa liste d'épisodes** n'ont reçu qu'un passage superficiel ; la fiche
  film a été auditée en détail.
- **L'auto-répétition des touches** (maintien d'une flèche) n'est pas simulable par `adb`.
  Les coûts en appuis de G11 et G12 sont donc des bornes hautes : une télécommande réelle
  les réduit, sans changer la conclusion structurelle.
- **L'écran d'achat n'a pas d'offres** sur cette image système (`android-tv` sans Play
  Store, cf. §11). Le « Aucune offre disponible » observé est attendu et ne dit rien de la
  facturation ; seules les observations de mise en page et de focus sont retenues.
- **Téléchargements** n'a été vu qu'à vide. Le comportement du focus avec des éléments en
  cours de téléchargement reste à vérifier.
- **Émulateur, pas téléviseur.** Les mesures de contraste et de taille de texte sont exactes
  en pixels, mais la lisibilité réelle à distance de canapé demande une validation sur un
  écran de 50 pouces à trois mètres — notamment pour M3.

---

## 7. Ordre de traitement suggéré

Classé par ce qui débloque le reste, pas par difficulté.

1. **B1** — sans lui, un nouvel utilisateur TV ne peut pas se connecter par identifiants.
   C'est le tout premier écran de l'application.
2. **B4** — un `BackHandler` par destination. Il conditionne le confort de tous les autres
   écrans, et rend B3 moins critique (on pourrait au moins sortir des Paramètres).
3. **B2** — deux lignes de code, impact revenu direct. Prévoir le repli « Réessayer ».
4. **B3** — un `verticalScroll`. Sans lui, aucune déconnexion possible sur TV.
5. **G1** — porter la gestion d'erreur du mobile. C'est ce qui distingue « ça charge » de
   « c'est cassé » pour l'utilisateur.
6. **G2 + G3 + G4 + G5** — le lot « focus et rail ». Ils partagent une racine unique ; les
   traiter ensemble évite d'introduire le défaut inverse (rail inatteignable).
7. **G10 + M3** — lisibilité à distance de canapé. Peu coûteux, effet immédiat sur la
   perception de qualité.
8. Le reste au fil de l'eau.

> **Rappel de méthode** (leçon du §5 P4 et du §36) : chaque correctif de focus doit être
> rejoué à l'émulateur avant d'être considéré comme acquis. Plusieurs correctifs de focus de
> ce projet ont introduit le défaut symétrique — le §40 documente un cas où le correctif du
> §23 est devenu la cause du problème suivant.

---

*Audit conduit au D-pad sur AVD `purple_tv` (Android 13, 1920×1080), build `app-tv` debug
1.2.1, catalogue Xtream réel. Chaque trace de focus provient d'un relevé `uiautomator` ;
chaque contraste et chaque couleur d'un échantillonnage de capture d'écran au pixel.*
