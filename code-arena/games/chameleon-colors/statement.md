# Caméléon Caméléon

Un caméléon gourmand veut dévorer des fruits colorés… mais il ne peut manger un
fruit que si sa peau a **exactement la même couleur** que lui. En plus, il doit
manger par **séries de taille croissante** : d'abord **1** fruit, puis **2**, puis
**3**, et ainsi de suite — et tous les fruits d'**une même série** doivent être de
la **même couleur**.

À toi de planifier le trajet, les changements de peau et l'ordre des fruits pour
compléter le plus de séries possible.

## Entrée (stdin)

    <cols> <rows> <budget> <cible>
    <rows lignes de cols caractères>

- `cols` `rows` : dimensions de la grille.
- `budget` : nombre maximum d'actions autorisées.
- `cible` : nombre de séries à compléter pour réussir le défi.

Caractères de la grille :

| Caractère | Signification          |
|-----------|------------------------|
| `.`       | sol                    |
| `#`       | mur                    |
| `S`       | départ du caméléon     |
| `R`       | fruit **rouge**        |
| `G`       | fruit **vert**         |
| `B`       | fruit **bleu**         |

Le caméléon démarre sur `S` avec une peau **neutre** (aucune couleur).

## Sortie (stdout)

Une action par ligne (les actions au-delà du `budget` sont ignorées) :

- `MOVE U` · `MOVE D` · `MOVE L` · `MOVE R` — avance d'une case (haut, bas, gauche, droite).
- `SKIN R` · `SKIN G` · `SKIN B` — change la couleur de la peau.

## Règles

- **Manger** : dès que le caméléon se trouve sur une case fruit **et** que sa peau a
  la couleur de ce fruit, il le mange (automatiquement). Avec une autre couleur de
  peau, il passe sur le fruit sans y toucher.
- **Combo croissant** : les fruits mangés forment des séries de tailles `1, 2, 3, …`.
  Chaque série doit être **monochrome** (tous ses fruits de la même couleur), mais
  la couleur peut changer d'une série à l'autre.
- **Casser le combo** : manger un fruit d'une couleur différente alors qu'une série
  est en cours stoppe la progression — le score reste celui des séries déjà complétées.
- Avancer vers un mur ou hors de la grille gaspille l'action (le caméléon ne bouge pas).

## Score

Le score est proportionnel au nombre de séries complétées. Le défi est **réussi**
lorsque tu atteins la `cible` de séries.

## Exemple

Avec les fruits 🔴 puis 🟢🟢 puis 🔵🔵🔵 disponibles, une solution valide est :

    SKIN R    (peau rouge)
    MOVE R    (mange 🔴  → série 1 complétée : 1 fruit)
    SKIN G    (peau verte)
    MOVE R
    MOVE R    (mange 🟢🟢 → série 2 complétée : 2 fruits)
    SKIN B    (peau bleue)
    MOVE D
    MOVE D
    MOVE D    (mange 🔵🔵🔵 → série 3 complétée : 3 fruits)
