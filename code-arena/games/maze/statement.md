# Labyrinthe

Guide le caméléon de l'entrée `S` jusqu'à la sortie `G` sans traverser de mur `#`.

## Entrée (stdin)

    <cols> <rows>
    <rows lignes de cols caractères>

Caractères : `#` mur · `.` sol · `S` départ · `G` arrivée.

## Sortie (stdout)

Une suite de déplacements parmi `U` (haut), `D` (bas), `L` (gauche), `R` (droite).
Exemple : `RRDDR`.

Le caméléon part de `S`. Chaque déplacement le fait avancer d'une case : viser un mur ou
sortir de la grille interrompt le parcours. Atteins `G` pour gagner.
