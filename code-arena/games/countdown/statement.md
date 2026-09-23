# Le Grand Feu d'artifice

Ce soir, c'est toi qui lances le feu d'artifice ! Toute la ville a les yeux levés vers le
ciel… mais personne n'allume la mèche avant le **compte à rebours**.

## Comment ça marche

Ton programme reçoit un nombre de départ. Il doit **compter à rebours** jusqu'à `1`, un
nombre par ligne, puis écrire `FEU` pour allumer la mèche.

## Entrée (stdin)

Une seule ligne, un seul nombre : le point de départ du compte à rebours.

```
3
```

## Sortie (stdout)

Pour l'entrée ci-dessus :

```
3
2
1
FEU
```

Chaque nombre sur sa propre ligne, du plus grand au plus petit, et `FEU` tout à la fin.
Un nombre oublié, un nombre en trop, ou `FEU` trop tôt : la fusée reste au sol.

## Ta première réussite

Ouvre l'onglet **Tests** et regarde le cas 1 : le départ est `3`. Écris un programme qui
affiche exactement les quatre lignes ci-dessus, puis clique sur ▶ à côté du cas 1.

La foule compte avec toi… et la fusée décolle. **C'est gagné !**

## Et les autres cas ?

Chaque cas part d'un nombre différent : `3`, puis `5`, `1`, `10` et enfin `15`. Un seul et
même programme doit réussir les cinq : il doit donc **s'adapter** au nombre reçu.

Dans la Promenade du Caméléon, tu as appris à **lire** un nombre et à **répéter** une action
avec une boucle. La nouveauté ici : à chaque tour de boucle, tu n'écris pas toujours la même
chose, tu écris **la valeur du compteur**.

1. **Lis le nombre de départ** sur l'entrée standard.
2. **Fais une boucle qui descend** : son compteur part du nombre de départ et diminue de 1 à
   chaque tour, tant qu'il vaut au moins `1`. À chaque tour, affiche le compteur.
3. **Après la boucle**, affiche `FEU`, une seule fois.

Attention au cas où le départ vaut `1` : il n'y a alors qu'un seul nombre avant `FEU`.
