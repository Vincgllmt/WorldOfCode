# Cameleon Bros

Le caméléon doit traverser **8 portails** gardés par des blocs algorithmiques.
Chaque portail te pose un problème : donne la bonne réponse et le caméléon saute par-dessus le bloc !

Ton programme lit le **type de problème** sur la première ligne et les **données** sur la deuxième ligne, puis écrit la réponse.

```
TYPE
<données>
```

---

## Portail 1 — SUCCESSOR

Retourne le successeur d'un entier, c'est-à-dire **n + 1**.

**Entrée**
```
SUCCESSOR
42
```
**Sortie attendue**
```
43
```
Autres exemples : `0` → `1` · `-1` → `0` · `99` → `100`

---

## Portail 2 — IS_NEGATIVE

Retourne `True` si le nombre est **strictement négatif**, `False` sinon.

**Entrée**
```
IS_NEGATIVE
-42
```
**Sortie attendue**
```
True
```
Autres exemples : `0` → `False` · `42` → `False` · `-1` → `True`

---

## Portail 3 — ABS

Retourne la **valeur absolue** d'un entier (toujours positif ou nul).

**Entrée**
```
ABS
-7
```
**Sortie attendue**
```
7
```
Autres exemples : `0` → `0` · `5` → `5` · `-100` → `100`

---

## Portail 4 — MIN

Retourne le **plus petit** de deux entiers séparés par un espace.

**Entrée**
```
MIN
10 3
```
**Sortie attendue**
```
3
```
Autres exemples : `5 5` → `5` · `-2 8` → `-2`

---

## Portail 5 — SUM

Retourne la **somme** de tous les entiers de la liste.

**Entrée**
```
SUM
1 2 3 4
```
**Sortie attendue**
```
10
```
Autres exemples : `0` → `0` · `10 20 30` → `60`

---

## Portail 6 — REVERSE

Retourne la liste dans l'**ordre inverse**, séparés par des espaces.

**Entrée**
```
REVERSE
1 2 3 4 5
```
**Sortie attendue**
```
5 4 3 2 1
```
Autres exemples : `42` → `42` · `1 2` → `2 1`

---

## Portail 7 — UNIQUE

Retourne la liste **sans doublons**, en conservant l'ordre d'apparition.

**Entrée**
```
UNIQUE
1 2 2 3 1 4 3
```
**Sortie attendue**
```
1 2 3 4
```
Autres exemples : `5 5 5` → `5` · `1 2 3` → `1 2 3`

---

## Portail 8 — SORT

Retourne la liste triée par **ordre croissant**.

**Entrée**
```
SORT
5 10 3 1 8 2
```
**Sortie attendue**
```
1 2 3 5 8 10
```
Autres exemples : `3 1 2` → `1 2 3` · `42` → `42`

---

> **Astuce** : ton programme sera exécuté sur **un portail à la fois**.
> Utilise un `if/elif` sur le type pour gérer tous les cas.
