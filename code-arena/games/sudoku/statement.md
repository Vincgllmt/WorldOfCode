# Le Maître du Sudoku

Le vieux maître ne te demande qu'une chose : remplir ses grilles. Les premières se laissent
faire… les dernières font transpirer les plus grands joueurs. Écris un programme capable de
résoudre **n'importe quel** sudoku.

## Les règles

La grille fait 9 cases sur 9, découpée en 9 carrés de 3 sur 3. Il faut remplir chaque case
vide avec un chiffre de `1` à `9` de sorte que :

- chaque **ligne** contienne tous les chiffres de `1` à `9`, une seule fois chacun ;
- chaque **colonne** aussi ;
- chaque **carré** de 3 sur 3 aussi.

Les chiffres déjà présents, les **indices**, ne bougent pas.

## Entrée (stdin)

Neuf lignes de neuf caractères : un chiffre de `1` à `9`, ou `.` pour une case vide.

```
.3467891.
6.2195348
19.342567
8597.1423
42685.79.
713924.56
96.537284
287.19635
.452.6179
```

## Sortie (stdout)

Neuf lignes de neuf chiffres : la grille complète. Pour l'exemple :

```
534678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
```

Chaque grille a **une seule** solution.

## Le retour sur trace

Sur les premières grilles, chaque case vide n'accepte qu'un seul chiffre : on les remplit
une à une. Sur les dernières, plus aucune case n'est évidente. Il faut alors **faire une
hypothèse**, la suivre, et **revenir en arrière** si elle mène à une impasse. C'est le
**backtracking** (retour sur trace) :

1. Cherche une case vide. S'il n'en reste aucune, la grille est résolue.
2. Pour chaque chiffre **autorisé** dans cette case (absent de sa ligne, de sa colonne et de
   son carré), pose-le, puis **résous le reste de la grille** : ta fonction s'appelle
   elle-même, c'est la **récursivité**.
3. Si la suite réussit, c'est gagné. Sinon, **efface** ce chiffre et essaie le suivant.
4. Si aucun chiffre ne convient, renvoie « échec » : c'est une hypothèse précédente qui
   était fausse, et l'appel du dessus essaiera son chiffre suivant.

Astuce : pour savoir dans quel carré tombe la case `(ligne, colonne)`, divise chacune par 3
(division entière) puis multiplie par 3 : tu obtiens le coin en haut à gauche du carré.

## Pour aller plus loin

La dernière grille passe pour l'une des plus difficiles au monde… pour un humain. Un
backtracking simple la résout en une fraction de seconde. Le temps d'exécution est toutefois
limité : si ton programme est trop lent, commence par la case vide qui a le **moins de
chiffres possibles**, l'arbre des hypothèses fond littéralement.

Dans la visualisation, chaque ligne de ta réponse s'inscrit à l'encre bleue. Si la grille
est fausse, les chiffres en conflit (en double dans une ligne, une colonne ou un carré) sont
entourés de rouge.
