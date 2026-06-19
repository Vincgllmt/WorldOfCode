# Mars Lander — Épisode 2

Faites atterrir, **sans crash**, la capsule *Mars Lander* qui transporte le rover
*Opportunity*. Comme dans l'épisode 1 vous pilotez la **puissance** des fusées, mais vous
devez maintenant aussi contrôler **l'angle** de la capsule pour réussir.

La zone fait **7000 m** de large et **3000 m** de haut. La gravité martienne vaut
**g = 3,711 m/s²** (chute libre, sans atmosphère). Il existe **une unique zone
d'atterrissage plane** d'au moins **1000 m** de large.

## ⚠️ Adaptation — pas de boucle interactive

Contrairement au simulateur d'origine, ici **aucun échange tour par tour** : vous lisez
l'état initial **une seule fois**, puis vous écrivez d'un coup **toute la séquence de
commandes** du vol (une ligne `rotate power` par tour de simulation). Le referee applique
vos commandes dans l'ordre, simule la physique et juge l'atterrissage. La physique est
**déterministe** : vous pouvez donc la simuler vous-même pour planifier la descente.

## Entrée (stdin)

```
surfaceN
landX0 landY0
landX1 landY1
...
landX(surfaceN-1) landY(surfaceN-1)
X Y hSpeed vSpeed fuel rotate power
```

- `surfaceN` : nombre de points formant le sol. En reliant les points dans l'ordre on
  obtient la surface de Mars (segments). Pour le premier point `landX = 0`, pour le
  dernier `landX = 6999`.
- Dernière ligne = **état initial** de la capsule : position `X Y` (m), vitesses
  `hSpeed vSpeed` (m/s, signées), `fuel` restant (L), `rotate` (angle en degrés),
  `power` (puissance des fusées).

## Sortie (stdout)

Une ligne `rotate power` **par tour**, dans l'ordre du vol :

- `rotate` : angle de rotation souhaité, de **-90° à 90°**. La rotation effective est
  limitée à **±15°** par rapport au tour précédent.
- `power` : puissance souhaitée, de **0 à 4**. La variation effective est limitée à
  **±1** par tour. Une puissance `X` génère une poussée de `X m/s²` et consomme `X` litres
  de fuel. Quand le fuel manque, la puissance retombe à 0.

## Physique (un tour = 1 seconde)

Après application des limites `±15°` / `±1` et des bornes, on calcule :

```
rad = rotate × π / 180
aX  = -sin(rad) × power
aY  =  cos(rad) × power - 3.711
X  += hSpeed + aX/2      hSpeed += aX
Y  += vSpeed + aY/2      vSpeed += aY
fuel -= power
```

## Atterrissage réussi

La capsule doit toucher le sol **sur la zone plane** avec :

- un angle **vertical** (`rotate = 0°`) ;
- une vitesse **verticale** limitée : `|vSpeed| ≤ 40 m/s` ;
- une vitesse **horizontale** limitée : `|hSpeed| ≤ 20 m/s`.

Toucher un relief non plat, sortir de la zone de jeu, ou atterrir hors de ces limites =
**crash**. Si vos commandes s'épuisent avant l'atterrissage, le vol est un échec.

## Contraintes

```
2 ≤ surfaceN < 30
0 ≤ X < 7000      0 ≤ Y < 3000
-500 < hSpeed, vSpeed < 500
0 ≤ fuel ≤ 2000
-90 ≤ rotate ≤ 90      0 ≤ power ≤ 4
```

## Exemple

Entrée :

```
6
0 1500
1000 2000
2000 500
3500 500
5000 1500
6999 1000
5000 2500 -50 0 1000 90 0
```

La zone plane est le segment `(2000, 500) → (3500, 500)`. À vous d'amener la capsule
au-dessus, à la verticale, suffisamment lentement. Première ligne de sortie possible :
`-45 4` (on demande un angle vers la droite et la poussée max ; la rotation effective ne
passera que de `90` à `75` et la puissance de `0` à `1`).

Votre solution est évaluée sur **plusieurs scénarios** : lisez l'état initial et planifiez
une descente générique. Essayez chaque cas, puis « Jouez » pour la soumission notée sur
l'ensemble.
