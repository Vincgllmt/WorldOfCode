CAMÉLÉON GOURMAND

Un caméléon gourmand veut manger un maximum de fruits colorés. Il ne mange
un fruit que si sa peau est de la MÊME couleur que lui, et il mange par
séries de taille croissante : 1 fruit, puis 2, puis 3...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LE BUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Compléter le plus de séries possible :

   - série 1  ->  1 fruit
   - série 2  ->  2 fruits
   - série 3  ->  3 fruits   ...

Tous les fruits d'une même série sont de la MÊME couleur (mais la couleur
peut changer d'une série à l'autre).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTRÉE (stdin)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ligne 1 :   cols  rows  budget  cible
Puis « rows » lignes de grille :

   .  sol      #  mur      S  départ
   R  rouge    G  vert     B  bleu

Le caméléon démarre sur S avec une peau neutre.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SORTIE (stdout)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Une action par ligne (au-delà du budget, elles sont ignorées) :

   MOVE U / MOVE D / MOVE L / MOVE R   avancer d'une case
   SKIN R / SKIN G / SKIN B            changer la couleur de peau

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   - Tu manges automatiquement un fruit si ta peau est de sa couleur
     (sinon tu passes dessus sans y toucher).
   - Manger un fruit d'une autre couleur en pleine série casse le combo.
   - Avancer vers un mur ou hors de la grille = action perdue.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSEIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu vas produire beaucoup d'actions. Le mieux est de créer deux petites
fonctions : une pour avancer (MOVE) et une pour changer de peau (SKIN).
Ton code restera court et lisible, au lieu d'aligner des console.log.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Le score est proportionnel au nombre de séries complétées.
Le défi est réussi lorsque tu atteins la « cible » de séries.
