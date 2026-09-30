# La Boîte de Petri

Dans ce laboratoire, une culture de cellules évolue sous le microscope. Les biologistes
connaissent ses règles par cœur : c'est le **Jeu de la vie** inventé par le mathématicien
John Conway. Ta mission : **prédire** à quoi ressemblera la culture après un certain nombre
de générations.

## La grille

La culture est une grille. Chaque case est soit **vivante** (`#`), soit **morte** (`.`).
Chaque case a jusqu'à **8 voisines** : les cases qui la touchent par un côté ou par un coin.

## Les règles

On passe d'une génération à la suivante en appliquant, **à toutes les cases en même temps** :

- une case **vivante** avec **2 ou 3** voisines vivantes **reste en vie** ;
- une case **vivante** avec moins de 2 voisines meurt d'isolement, et avec plus de 3 elle
  meurt d'étouffement ;
- une case **morte** avec **exactement 3** voisines vivantes **devient vivante** (naissance).

Au-delà du bord de la grille, il n'y a rien : ces cases comptent comme mortes.

## Entrée (stdin)

- Ligne 1 : `largeur hauteur générations`.
- Puis `hauteur` lignes de `largeur` caractères : la culture de départ.

```
5 5 1
.....
..#..
..#..
..#..
.....
```

## Sortie (stdout)

La grille après le nombre de générations demandé, dans le même format (sans la première
ligne). Pour l'exemple :

```
.....
.....
.###.
.....
.....
```

## Le piège

« Toutes les cases en même temps » est la règle la plus importante. Si tu modifies la grille
pendant que tu la parcours, les cases suivantes compteront des voisines **déjà mises à jour**,
et la culture partira de travers.

La solution : calcule la génération suivante dans une **nouvelle grille**, en ne lisant que
l'ancienne. Quand elle est complète, elle remplace l'ancienne. Puis recommence autant de
fois qu'il y a de générations.

1. Lis la grille dans un **tableau à deux dimensions** (ou une liste de lignes).
2. Écris une fonction qui **compte les voisines vivantes** d'une case, sans sortir de la
   grille.
3. Écris une fonction qui fabrique la **génération suivante** dans une nouvelle grille.
4. Répète-la, puis affiche le résultat.

Dans la visualisation, la culture évolue génération par génération, puis ta réponse est
comparée à la vraie : les cases fausses sont entourées de rouge.
