# La Route des feux

Une petite voiture doit traverser la ville. Sur sa route, des **feux tricolores**. C'est toi
qui conduis : à chaque feu, tu dois donner le **bon ordre** selon sa couleur.

## Le code de la route

Trois couleurs, trois ordres :

- feu `VERT` : on continue, ordre `PASSE` ;
- feu `ORANGE` : on lève le pied, ordre `RALENTIS` ;
- feu `ROUGE` : on s'arrête, ordre `STOP`.

## Entrée (stdin)

La première ligne donne le **nombre de feux** sur la route. Viennent ensuite les couleurs
des feux, **une par ligne**, dans l'ordre où la voiture les rencontre.

```
3
VERT
ROUGE
VERT
```

## Sortie (stdout)

Un ordre par ligne, un pour chaque feu, dans le même ordre. Pour l'entrée ci-dessus :

```
PASSE
STOP
PASSE
```

Un ordre faux, et c'est l'infraction : griller un feu rouge, piler devant un feu vert… le
trajet s'arrête là.

## Ta première réussite

Regarde le cas 1 dans l'onglet **Tests** : il n'y a qu'**un seul feu**, et il est vert.
Écris un programme qui affiche simplement `PASSE`, puis clique sur ▶ à côté du cas 1.

La voiture passe le feu et arrive à destination. **C'est gagné !**

## Et les autres cas ?

Les autres trajets ont plus de feux (3, 4, 6, puis 8), de toutes les couleurs. Ton programme
doit **regarder chaque couleur** et **décider** de l'ordre à donner. C'est la grande nouveauté
de ce défi : la **condition**.

Une condition, c'est un « si… sinon » : *si* la couleur est `VERT`, alors affiche `PASSE` ;
*sinon si* elle est `ORANGE`, affiche `RALENTIS` ; *sinon*, affiche `STOP`. Cherche comment
on écrit `if` / `else` dans ton langage.

1. **Lis le nombre de feux** sur la première ligne.
2. **Fais une boucle** qui tourne autant de fois qu'il y a de feux.
3. À chaque tour, **lis la couleur** du feu suivant, puis utilise une **condition** pour
   afficher l'ordre qui correspond.

Attention à l'orthographe : les couleurs et les ordres s'écrivent en majuscules, sans accent.
