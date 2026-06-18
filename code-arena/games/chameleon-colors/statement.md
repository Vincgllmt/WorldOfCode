# Caméléon Gourmand

Un caméléon gourmand veut manger un maximum de fruits colorés. Il ne mange un fruit
que si sa peau a la **même couleur**, et il mange par **séries de taille croissante** :
d'abord `1` fruit, puis `2`, puis `3`…

Tu n'as **pas** à gérer les déplacements : tu indiques seulement **quelle peau prendre**
et **quel fruit manger**, le caméléon s'y rend tout seul (en contournant les obstacles).

## But

Compléter le plus de séries possible. Tous les fruits d'une **même série** sont de la
**même couleur** (mais la couleur peut changer d'une série à l'autre).

- série 1 → 1 fruit
- série 2 → 2 fruits
- série 3 → 3 fruits…

## Entrée (stdin)

    cols rows cible
    <nbFruits>
    fx fy couleur        (un fruit par ligne ; son numéro = l'ordre, à partir de 0)
    <nbObstacles>
    ox oy                (un obstacle par ligne)

`couleur` vaut `R` (rouge), `G` (vert) ou `B` (bleu). Le caméléon démarre en `(0,0)`.

Pour ta stratégie, **seules les couleurs des fruits comptent** : le moteur gère tous les
déplacements, tu peux donc **ignorer les positions et les obstacles**.

## Sortie (stdout)

Une action par ligne :

- `SKIN R` · `SKIN G` · `SKIN B` — changer la couleur de peau
- `EAT <numéro>` — aller manger ce fruit (le caméléon s'y déplace tout seul)

`EAT` ne fonctionne que si ta peau est de la couleur du fruit : pense à faire `SKIN`
de la bonne couleur **avant**.

## Règles

- Tu manges les fruits dans l'ordre de tes `EAT`, en séries de taille `1, 2, 3…`,
  chaque série d'une **seule couleur**.
- Manger un fruit d'une autre couleur en pleine série **casse le combo** (le score
  garde les séries déjà complétées).

## Conseil

Regroupe les fruits **par couleur**. Pour chaque série : `SKIN` la bonne couleur, puis
`EAT` le bon nombre de fruits de cette couleur. Pense à réserver les couleurs les plus
fournies pour les **grandes** séries.

## Exemple

Fruits : `0` rouge, `1` vert, `2` vert. Cible = 2.

    SKIN R
    EAT 0        -> série 1 terminée (1 rouge)
    SKIN G
    EAT 1
    EAT 2        -> série 2 terminée (2 verts)

## Score

Le score est proportionnel au nombre de séries complétées. Ta solution est évaluée sur
**plusieurs niveaux** : lis la liste de fruits et résous chaque niveau de façon générique.
