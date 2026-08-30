# Règles de méthode — ce que ce chantier a coûté pour apprendre

> Sorti de `CLAUDE.md` le 2026-08-27, qui n'en garde qu'un renvoi : ce fichier n'est
> **pas** chargé automatiquement. Chaque règle vient d'une erreur réellement commise,
> référencée dans `JOURNAL.md` ; les relire évite de la refaire.
>
> ⚠️ **La numérotation est celle d'avant le déplacement.** `audit.md` et
> `PLAN_CORRECTION_TV.md` citent ces règles sous la forme « §8.N de `CLAUDE.md` » — la
> règle §8.2 est ici la règle **2**, et ainsi de suite. Ne pas renuméroter.

---

Chacune vient d'une erreur réellement commise, référencée dans le journal. Les relire
évite de la refaire ; le détail est à la section citée.

1. **Ne pas durcir un comportement qui fonctionne quand on ne peut pas le vérifier en
   conditions réelles.** L'encodage de la query était un vrai correctif, vérifiable ;
   l'étendre aux segments de chemin était gratuit et risquait 11 889 URL de flux
   (§5 P4). Rencontré une seconde fois sur le type MIME du cast (§36).
2. **Une décision écrite deux fois, une par UI, finit toujours par diverger** — les
   correctifs ne sont appliqués qu'à une copie. Constaté sur l'EPG (§28), le nettoyage
   des titres d'épisodes (§33.1), la sélection de pistes (§29). ➡️ extraire la décision
   dans `core` et la tester là.
3. **Un test qui ne peut pas échouer ne prouve rien.** « L'accès revient après
   `pm clear` » était vrai quoi qu'il arrive, l'essai neuf le rendant. Chercher le
   **signal discriminant** — ici le *nombre de jours* affiché (§9 B1.4, §32).
4. **Compter et reproduire avant de conclure à un défaut de focus.** Le « défaut 11 »
   n'existait pas : il n'y avait qu'un seul résultat, donc rien à droite (§24). Le
   « focus qui s'échappe en fin de liste » ne se produit pas au cas décrit, mais sur une
   liste plus courte que l'écran (§30).
5. **Un raisonnement différentiel ne vaut que si *chaque* terme est mesuré.** Un seul
   fait non vérifié — le conteneur du témoin positif — a inversé la conclusion sur le
   cast, et le reste de la chaîne, correct, lui a donné l'apparence de la rigueur (§36).
6. **Supprimer un élément d'interface mal libellé supprime aussi la fonction qu'il
   portait.** Retirer « ACTIVER » à l'abonné a supprimé le seul chemin vers l'écran
   d'achat (§10). Vérifier ce qu'on retire, pas seulement ce qu'on ajoute — de même,
   ajouter `FLAG_KEEP_SCREEN_ON` impose de le retirer à la sortie (§18).
7. **« Déclaré mais jamais branché » est le motif récurrent de ce code** — sept
   occurrences : `onPurchase` (§10 UX-2), `onFav` (§13), `TvToggleOption` (§19), le
   `modifier` de `MiniBar` (§33), `lastInteractionMs` (§29), les `FocusRequester` du
   rail (§40), l'`onClose` de `TvRecentCard` (§49). Devant un contrôle inerte, chercher
   d'abord s'il est câblé.
8. **Compose** : modifier l'état qui sert de clé à un `LaunchedEffect` l'annule et le
   relance (§23) ; un `LaunchedEffect` s'exécute **aussi à la première composition**
   (§40) ; `produceState` sans clé capture la valeur initiale (§5 P6) ;
   `rememberSaveable` ne survit pas à un `when (index)` qui retire l'onglet de la
   composition — il faut `SaveableStateProvider` (§38).
9. **Un format de ressource mal typé ne se voit pas à la compilation** : `%d` recevant
   une `String` fait tomber l'écran à l'exécution. Toute extraction de libellés exige un
   contrôle type-par-type de chaque argument (§20).
10. **Sur télécommande, le nombre d'appuis compte plus que le nombre de lignes
    visibles.** Une optimisation de densité qui allonge un chemin D-pad est un mauvais
    échange (§25). Et un focalisable de plus a un coût : ne l'ajouter que s'il sert (§29).
11. **Avaler une exception peut supprimer un repli utile.** Rendre une liste vide au lieu
    de lever aurait empêché le repli hors-ligne *et* écrasé le cache pour 24 h : une
    panne bruyante vaut mieux qu'une panne silencieuse et destructrice (§27).
12. **Le clavier virtuel TV avale les touches directionnelles** — piège de test *et*
    défaut réel pour l'utilisateur (§22, §26). Contrôler
    `dumpsys input_method | grep mInputShown` avant de conclure à un défaut de focus.
13. **Ne jamais committer un secret ni un lien d'abonnement** : le dépôt est partagé. Le
    lien M3U par défaut passe par `local.properties` (ignoré) et `BuildConfig`, vide par
    défaut (§41) ; `keystore.properties` a été sorti du suivi (§31).
14. **Toute modification de la gestion du focus TV se vérifie à l'émulateur** (§11) —
    c'est précisément le sujet qui a fait quitter Flutter. Une correction trop large
    piège le focus, défaut pire que celui corrigé (§23, §30).
15. **Une boucle de fond qui survit à son écran réécrit ce que l'utilisateur vient
    d'effacer.** « Impossible de retirer » se lisait comme un défaut de l'interface ; la
    cause était un `while (true)` jamais annulé qui réinsérait l'entrée dix secondes plus
    tard. Devant une suppression qui « ne prend pas », chercher qui écrit encore (§49).
16. **Le Pixel 7 branché en USB est le téléphone personnel de l'utilisateur, pas un
    appareil de test.** Y installer une build TV et la capturer a ramené une conversation
    privée à l'écran (§52). Tout essai `app-tv` passe par l'AVD `purple_tv` (§11), ou par
    aucun appareil — auquel cas on établit la cause par lecture et on écrit ce qui reste à
    vérifier (§49, §52).
17. **Un plein écran focalisable est un cul-de-sac de focus.** La recherche
    directionnelle de Compose exige qu'un candidat **dépasse** le rectangle focalisé du
    côté visé : quand ce rectangle est l'écran entier, aucune direction n'aboutit, dans
    aucun sens. Devant un écran qui ne répond à rien, chercher d'abord **qui** a le focus
    avant de soupçonner le clavier ou les touches (§52.5).
18. **Un `verticalScroll` ne défile qu'avec le focus.** Posé sur un `Text` — jamais
    focalisable — il est inerte à la télécommande, et le commentaire qui l'accompagne
    ment sans que rien ne le signale (§52.3).
19. **Play ne fait autorité que sur ce qu'il a lui-même installé.** Sur une variante à
    `applicationId` suffixé il répond « OK, liste vide » : en conclure une révocation met
    dehors un utilisateur légitime (§32). Toute observation de facturation faite hors
    d'une build installée par `com.android.vending` est ininterprétable (§9).

---

20. **Sur un correctif d'affichage, mesurer les *deux* termes.** Un test de règle pure
    écrit en même temps que la règle ne peut pas échouer (règle 3) : la seule preuve est
    de reconstruire la build d'avant, de l'installer par-dessus, de lui donner **les mêmes
    données**, et de comparer les deux écrans. Fait au §53 ; sans cela, « la carte a
    disparu » n'aurait prouvé que l'absence de carte.

21. **Un délai fixe n'est pas un signal.** `delay(800)` puis lire la durée du média
    marchait sur l'émulateur et **pas sur le téléphone** — sur un gros fichier, la durée
    n'était pas encore publiée, et le lecteur sautait à la fin. Attendre la **valeur**
    (`first { it > 0 }`, avec un plafond), pas un temps supposé suffisant (§53).

22. **Une donnée enregistrée peut mentir sur ce qu'elle prétend décrire.** La durée
    stockée avec une position valait 5 317 862 ms là où le lecteur en mesure 9 568 408 :
    c'était la durée *connue à l'instant de l'écriture*. S'y fier faisait repartir de zéro
    un épisode vu à 55 %. Avant d'appuyer une décision sur un nombre persisté, se demander
    qui l'a écrit, et quand (§53).


23. **Un contrôle automatique ne trouve que la forme qu'on lui a décrite.** `check_strings.py`
    n'a rien vu de huit messages anglais affichés dans une interface française : il cherchait
    des paramètres **nommés** (`label = "…"`), et le défaut vivait en argument positionnel
    (`Text("…")`) et en arme de `when`. Deuxième récidive après §17 et §45. Devant un défaut
    qu'un contrôle existant aurait dû attraper, la question n'est pas « pourquoi ne l'a-t-il
    pas vu » mais **« quelle forme ne sait-il pas décrire »** — et l'élargir se paie tout de
    suite : la passe ajoutée a immédiatement sorti #R9, le même défaut en miroir dans `core`
    (§66).
