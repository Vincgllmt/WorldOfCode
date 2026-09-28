# Le Message secret

Un agent t'a transmis un message chiffré avec le **code de César** : chaque lettre a été
décalée d'un même nombre de rangs dans l'alphabet. Avec un décalage de 3, `A` devient `D`,
`B` devient `E`… et arrivé au bout, on repart au début : `X` devient `A`, `Z` devient `C`.

Problème : l'agent n'a pas eu le temps de te donner **le décalage**. Il t'a seulement glissé
un **indice** : un mot qui apparaît dans le message en clair.

## Entrée (stdin)

- Ligne 1 : le mot indice.
- Ligne 2 : le message chiffré.

```
CHAT
OH FKDW GRUW VXU OH WRLW
```

## Sortie (stdout)

Le message déchiffré, sur une seule ligne :

```
LE CHAT DORT SUR LE TOIT
```

## Les règles du chiffre

- Seules les lettres de `A` à `Z` sont décalées. Les espaces, les chiffres et la
  ponctuation restent tels quels.
- Les messages sont en majuscules, sans accent.
- Il existe **un seul** décalage, entre `0` et `25`, qui fait apparaître l'indice dans le
  message en clair.

## Comment t'y prendre

1. Écris une **fonction** qui déchiffre un message pour un décalage `k` donné : chaque lettre
   recule de `k` rangs. Raisonne avec la **position** de la lettre dans l'alphabet (`A` vaut
   `0`, `Z` vaut `25`) et utilise l'opérateur **modulo** pour boucler de `A` vers `Z`.
2. Tu ne connais pas le décalage ? **Essaie les 26.** Pour chacun, déchiffre le message et
   regarde si l'indice apparaît dans le résultat.
3. Affiche le message obtenu avec le bon décalage.

Piège classique : dans plusieurs langages, `-1 % 26` vaut `-1` et non `25`. Ajoute `26` avant
de prendre le modulo pour rester dans les positifs.

Dans la visualisation, la roue de chiffrement tourne jusqu'au bon décalage, puis ta réponse
se dévoile mot à mot sur la feuille : chaque lettre fausse apparaît en rouge.
