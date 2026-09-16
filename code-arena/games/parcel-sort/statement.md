# Le hangar du caméléon

Le caméléon range son hangar. Il reçoit un lot de colis et doit les faire passer sur le
tapis **du plus petit au plus grand volume**. Trie les colis pour lui.

## Entrée (stdin)

    <N>
    <id> <l> <w> <h>
    ... (N lignes)

- `N` : le nombre de colis (`1 ≤ N ≤ 100`).
- Chaque colis : un identifiant `id` (entier unique) puis ses dimensions `l`, `w`, `h`
  (entiers, en cm).
- Le **volume** d'un colis vaut `l × w × h`.

## Sortie (stdout)

Les `id` des colis triés par **volume croissant**, séparés par des espaces sur une seule ligne.

En cas de volume égal, place d'abord le colis dont l'`id` est le plus petit.

## Exemple

Entrée :

    3
    7 2 2 2
    4 1 1 1
    9 2 1 3

Sortie :

    4 9 7

Volumes : colis `4` → 1, colis `9` → 6, colis `7` → 8. Du plus petit au plus grand : `4 9 7`.

Ta solution est évaluée sur **plusieurs lots** : lis l'entrée et trie de façon générique.
Essaie chaque cas individuellement, puis « Joue » pour la soumission notée sur l'ensemble des cas.
