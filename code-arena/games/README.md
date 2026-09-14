# Jeux Code Arena — source de vérité

Chaque jeu est défini dans `code-arena/games/<slug>/` (le `slug` = nom du dossier) et
synchronisé en base par `php bin/console app:arena:sync` (lancé aussi au démarrage du conteneur).

## Fichiers d'un jeu

```
games/<slug>/
  game.json      # métadonnées (requis)
  statement.md   # énoncé (markdown)
  referee.<ext>  # validateur exécuté dans Piston (un seul fichier referee.*)
  tests/         # un fichier .txt par cas de test (stdin donné au code joueur)
    01.txt
    02.txt
    ...
  input.txt      # repli si tests/ absent : un unique cas de test
  solution.<ext>.txt  # optionnel : solution de référence par langage (js, ts, py, php, java, cpp)
```

Les cas de `tests/` sont triés par nom de fichier (`01.txt`, `02.txt`, …) ; cet ordre
fixe la position des cas affichés et exécutés. Tous sont publics (le joueur voit l'input).
`input.txt` reste accepté pour un jeu à un seul cas (rétro-compatibilité).

`game.json` :

```json
{
  "title": "Labyrinthe",
  "difficulty": "easy|medium|hard",
  "languages": ["javascript", "python", "..."],
  "maxScore": 150,
  "image": null,
  "refereeLanguage": "python",
  "badges": [
    { "code": "first_solve", "name": "...", "description": "..." }
  ]
}
```

## Solutions de référence

`solution.<ext>.txt` (ex. `solution.py.txt`, `solution.js.txt`) contient une solution qui
doit passer **tous** les cas de test. Elles sont synchronisées en base (lecture seule) et
consultables dans le backoffice, section Code Arena, où un bouton « Vérifier » les exécute
sur tous les cas via le referee — pratique pour détecter un referee ou un cas cassé.

## Contrat du referee (exécuté dans Piston)

- **stdin** : JSON `{ "input": "<un cas de tests/>", "output": "<sortie du code joueur>" }`
- **stdout** : JSON `{ "verdict": "passed|failed", "score": int, "replay": { "init": ..., "frames": [...] } }`

Le referee juge **un** cas à la fois ; le backend l'exécute par cas (essai non noté via
`/run-tests`, ou soumission notée sur tous les cas via `/play`).

`init`/`frames` sont propres au jeu et interprétés par **son viewer** côté front :
`frontend/src/app/arena/games/<slug>/viewer.ts` (enregistré dans `registry.ts`).

## Côté front : viewer + aperçu de l'état de départ

Chaque jeu est un `GameModule` dans `frontend/src/app/arena/games/registry.ts` :

- `createViewer` : le viewer PixiJS qui rejoue `init`/`frames` ;
- `buildPreview(input)` : transforme l'input brut d'un cas en `Replay` figé d'une frame
  (l'état de départ), pour l'afficher dans la visualisation **sans exécuter de code**
  (sélection d'un cas, ou cas 1 à l'arrivée sur la page).

## Ajouter un jeu

1. Créer `games/<slug>/` (game.json, statement.md, referee.*, tests/*.txt).
2. Créer le viewer front + `buildPreview` dans `frontend/src/app/arena/games/<slug>/`
   et enregistrer le `GameModule` dans `registry.ts`.
3. `php bin/console app:arena:sync` (ou redémarrer le conteneur code-arena).

Aucun code backend à modifier.
