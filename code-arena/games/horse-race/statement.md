# Course de Chevaux

Plusieurs chevaux s'élancent sur une piste droite. Chacun a sa propre **vitesse** et sa
propre **endurance**. Ton programme doit **simuler la course seconde par seconde** et
annoncer l'**ordre d'arrivée**.

## Comment fonctionne un cheval

Chaque seconde, tant que la course n'est pas finie pour lui, un cheval avance :

- s'il lui reste de l'**endurance** (> 0) : il galope à **sa vitesse pleine**, et son
  endurance diminue de 1 ;
- une fois son endurance à **0** : il continue, mais **fatigué**, à **la moitié de sa
  vitesse** (arrondie à l'entier inférieur — ex. vitesse 25 → 12 m/s une fois fatigué).

Un cheval a **fini la course** dès que la distance qu'il a parcourue atteint ou dépasse la
longueur de la piste. Il s'arrête alors définitivement (il ne continue pas d'avancer après
la ligne).

## Ce que ton programme reçoit (entrée standard)

```
<distance> <N>
<nom> <vitesse> <endurance>
...
```

- **1ère ligne** : `distance` = longueur de la piste en mètres, `N` = nombre de chevaux
  qui participent (entre 2 et 6).
- **N lignes suivantes** : une par cheval, dans l'ordre où il faudra les faire courir,
  au format `nom vitesse endurance` (vitesse en m/s, endurance en secondes).

Exemple d'entrée :

```
120 3
Bolide 30 2
Trotteur 12 20
Courant 20 7
```

Ici la piste fait 120 m et 3 chevaux courent : **Bolide** (vitesse 30, endurance 2 s),
**Trotteur** (vitesse 12, endurance 20 s) et **Courant** (vitesse 20, endurance 7 s).

Ton programme est **lancé une fois par course** (l'entrée de cette course arrive sur
l'entrée standard). Tu résous donc **une seule** course ; ta solution est ensuite testée
automatiquement sur plusieurs courses différentes.

## Ce que ton programme doit écrire (sortie standard)

Les **noms des chevaux**, un par ligne, dans leur **ordre d'arrivée** (le gagnant en
premier).

**En cas d'égalité** (deux chevaux franchissent la ligne à la même seconde) : celui qui a
la **vitesse la plus élevée** passe devant ; si les vitesses sont aussi égales, on les
départage par **ordre alphabétique** du nom.

## Exemple déroulé seconde par seconde

Reprenons l'entrée ci-dessus (piste de 120 m). Voici la position de chaque cheval au fil
des secondes :

| Seconde | Bolide (v=30, end.) | Trotteur (v=12, end.) | Courant (v=20, end.) |
|---|---|---|---|
| 1 | 30 (end. 1) | 12 (end. 19) | 20 (end. 6) |
| 2 | 60 (end. 0) | 24 (end. 18) | 40 (end. 5) |
| 3 | 75 *(fatigué : +15)* | 36 (end. 17) | 60 (end. 4) |
| 4 | 90 | 48 (end. 16) | 80 (end. 3) |
| 5 | 105 | 60 (end. 15) | 100 (end. 2) |
| 6 | **120 → arrivé !** | 72 (end. 14) | **120 → arrivé !** |
| ... | | ... | |
| 10 | | **120 → arrivé !** | |

- À la seconde 2, Bolide n'a plus d'endurance : à partir de là il avance à `30 // 2 = 15`
  m/s au lieu de 30.
- À la seconde 6, **Bolide et Courant** franchissent tous les deux les 120 m **la même
  seconde** : égalité ! On les départage par vitesse décroissante → Bolide (30) devant
  Courant (20).
- Trotteur, plus lent mais jamais fatigué sur cette distance, arrive bon dernier à la
  seconde 10.

Sortie attendue pour cet exemple :

```
Bolide
Courant
Trotteur
```

## Contraintes (indicatif)

```
2 ≤ N ≤ 6
10 ≤ distance ≤ 1000
1 ≤ vitesse ≤ 100
0 ≤ endurance ≤ 300
```

## Comment t'y prendre

- Lis la première ligne pour connaître `distance` et `N`, puis lis les `N` chevaux.
- Simule seconde par seconde : à chaque tour, avance chaque cheval qui n'est pas encore
  arrivé, selon son endurance restante.
- Dès qu'un ou plusieurs chevaux franchissent la ligne à la même seconde, ajoute-les au
  classement (les plus rapides d'abord, puis par ordre alphabétique).
- Arrête-toi quand tous les chevaux sont arrivés, puis affiche le classement obtenu.

Ta solution est évaluée sur **plusieurs courses** : écris une simulation **générique**
capable de traiter n'importe quelle entrée dans ce format, pas une réponse codée en dur
pour cet exemple.
