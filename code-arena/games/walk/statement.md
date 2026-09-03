# La Promenade du Caméléon

Le caméléon est sur une branche. Une fraise l'attend un peu plus loin.
À toi de lui dire d'avancer jusqu'à elle.

## Comment ça marche

Ton programme **écrit du texte**, et chaque ligne de texte est un ordre donné au caméléon.
Il n'existe qu'un seul ordre :

```
AVANCE
```

**Une ligne `AVANCE` = un pas.** Trois lignes `AVANCE`, et le caméléon fait trois pas.

## Entrée (stdin)

Une seule ligne, un seul nombre : la distance qui sépare le caméléon de la fraise.

```
3
```

## Sortie (stdout)

Autant de lignes `AVANCE` que de pas à faire. Pour l'entrée ci-dessus :

```
AVANCE
AVANCE
AVANCE
```

Il faut arriver **pile** sur la fraise : un pas de trop et le caméléon la dépasse.

## Ta première réussite

Ouvre l'onglet **Tests** et regarde le cas 1 : la distance est `3`. Écris donc un programme
qui affiche **trois fois** la ligne `AVANCE`, puis clique sur ▶ à côté du cas 1.

Le caméléon marche jusqu'à la fraise. **C'est gagné** — et tu n'as eu besoin que d'afficher
du texte.

## Et les autres cas ?

Chaque cas place la fraise à une distance différente :

| Cas | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Distance | 3 | 5 | 9 | 16 |

Ton programme du cas 1 ne passera pas le cas 2 : la fraise n'est plus au même endroit.
Tu peux le rallonger à la main pour le cas 2, puis le cas 3… mais au cas 4 il faudrait
écrire seize lignes. Et surtout, **un seul et même programme doit passer les 4 cas** :
écrire la réponse en dur ne peut donc jamais en faire réussir plus d'un.

Il te faut un programme qui **s'adapte** à la distance qu'on lui donne. Deux notions à
découvrir pour ça, et c'est tout :

1. **Lire la distance.** Le nombre du cas (`3`, `5`, `9`…) est donné à ton programme au
   démarrage, sur ce qu'on appelle l'**entrée standard**. Cherche comment lire une ligne
   sur l'entrée standard dans le langage que tu as choisi.
2. **Répéter.** Plutôt que de recopier `AVANCE` seize fois, demande à l'ordinateur de le
   répéter autant de fois qu'il le faut. C'est ce qu'on appelle une **boucle**.

Avec ces deux briques, un programme de quelques lignes passe les quatre cas.
