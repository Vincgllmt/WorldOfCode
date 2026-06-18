# Caméléon Gourmand

Tu diriges un caméléon qui doit **manger des fruits**. Il ne peut manger un fruit que s'il
a d'abord **pris la couleur** de ce fruit. Et il mange par **groupes de plus en plus grands**.

Tu ne déplaces pas le caméléon toi-même : tu indiques seulement **quelle couleur prendre**
et **quel fruit manger** — il s'y rend tout seul.

## La règle

On mange les fruits par **séries** de taille croissante :

- série 1 : 1 fruit
- série 2 : 2 fruits
- série 3 : 3 fruits
- … et ainsi de suite

Tous les fruits d'une **même série** doivent avoir la **même couleur** (la couleur peut
changer d'une série à l'autre). But : compléter le plus de séries possible.

## Ce que ton programme reçoit

Du texte, ligne par ligne. Par exemple :

    6 3 2
    3
    3 0 G
    0 1 R
    3 1 R
    1
    5 2

Ce que chaque ligne veut dire :

- `6 3 2` : la grille fait 6 de large et 3 de haut, et il faut compléter **2 séries**.
- `3` : il y a **3 fruits**.
- Viennent ensuite **3 lignes**, une par fruit, au format `x y couleur`.
- Les fruits sont **numérotés à partir de 0**, dans l'ordre où ils apparaissent :
- fruit **0** = `3 0 G` → vert
- fruit **1** = `0 1 R` → rouge
- fruit **2** = `3 1 R` → rouge
- `1` : il y a **1 obstacle**, dont la position est donnée juste après (`5 2`).

Les couleurs : `R` = rouge, `G` = vert, `B` = bleu.

Dans la visualisation, **le numéro de chaque fruit est affiché dessus** — c'est ce
numéro que tu passes à `EAT`.

**Important :** pour gagner, **seules les couleurs des fruits comptent**. Tu peux ignorer
les positions et les obstacles, le caméléon se déplace tout seul.

Ton programme est **lancé une fois par niveau** (l'entrée de ce niveau lui arrive sur
l'entrée standard). Tu résous donc **un seul** niveau ; il est automatiquement testé sur
les 8.

Exemple en JavaScript permettant de récupérer les données :

    const data = require('fs').readFileSync(0, 'utf8').trim().split('\n')

## Ce que ton programme doit écrire

Une action par ligne :

- `SKIN R` / `SKIN G` / `SKIN B` : prendre la couleur rouge / verte / bleue.
- `EAT 0` / `EAT 1` / `EAT 2` … : manger le fruit qui porte ce **numéro**.

**Attention :** `EAT` ne marche que si ta peau est de la **même couleur** que le fruit.
Fais donc toujours `SKIN` de la bonne couleur **avant** de manger.

## Exemple complet

Avec l'entrée ci-dessus — fruit **0** vert, fruits **1** et **2** rouges, cible **2** — une solution est :

    SKIN G
    EAT 0
    SKIN R
    EAT 1
    EAT 2

Ce que ça fait :

- `SKIN G` puis `EAT 0` : mange le fruit 0 (vert) → **série 1 terminée** (1 fruit).
- `SKIN R` puis `EAT 1` et `EAT 2` : mange les 2 rouges → **série 2 terminée** (2 fruits).

Cette solution est écrite **en dur** : elle ne marche que pour CE niveau. Tu peux t'en
servir pour tester un niveau (le bouton ▶ d'un niveau).

**Mais tout l'intérêt du défi** est d'écrire un programme **générique** qui **lit la liste
des fruits** et calcule les actions tout seul. Une seule solution générique réussit alors
les **8 niveaux d'un coup** (bouton « Jouer »).

## Comment t'y prendre

- Lis la liste et **regroupe les fruits par couleur**.
- Pour chaque série : choisis une couleur qui a assez de fruits, fais `SKIN`, puis `EAT` le bon nombre de fruits.
- Astuce : garde les couleurs les **plus nombreuses** pour les **grandes** séries.

## Score

Le score dépend du nombre de séries complétées. Ta solution est testée sur **plusieurs
niveaux** : lis la liste de fruits et résous chaque niveau automatiquement.
