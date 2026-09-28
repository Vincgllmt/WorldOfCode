# L'Escalier de briques

Sur le chantier, on t'attend pour construire un **escalier**. Chaque ligne que ton programme
écrit devient une **rangée de briques** : le caractère `#` est une brique.

## Comment ça marche

Ton programme reçoit le **nombre de marches**. La première ligne doit contenir **1** brique,
la deuxième **2** briques, la troisième **3**… jusqu'à la dernière, qui en contient autant
qu'il y a de marches.

## Entrée (stdin)

Une seule ligne, un seul nombre : le nombre de marches.

```
3
```

## Sortie (stdout)

Pour l'entrée ci-dessus :

```
#
##
###
```

Les briques se collent les unes aux autres, sans espace entre elles. Une rangée trop
courte, trop longue, ou une marche oubliée, et l'escalier s'écroule.

## Ta première réussite

Regarde le cas 1 dans l'onglet **Tests** : l'escalier a `3` marches. Écris un programme qui
affiche exactement les trois lignes ci-dessus, puis clique sur ▶ à côté du cas 1.

Les briques tombent en place, et l'ouvrier grimpe jusqu'en haut. **C'est gagné !**

## Et les autres cas ?

Les escaliers suivants ont `1`, `5`, `7`, puis `10` marches. Tu sais déjà lire un nombre et
faire une boucle. Ici, il te faut **une boucle dans une boucle** :

1. **Lis le nombre de marches**.
2. **Une première boucle** parcourt les marches : son compteur vaut `1`, puis `2`, puis `3`…
   jusqu'au nombre de marches.
3. **Pour chaque marche**, une **seconde boucle**, placée à l'intérieur de la première,
   ajoute autant de `#` que la valeur du compteur. Puis on passe à la ligne.

Construire une ligne caractère par caractère, c'est l'occasion de découvrir comment
**assembler du texte** dans ton langage. Certains langages savent même **répéter** un texte
directement : cherche si le tien le permet.
