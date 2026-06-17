# Jeux Code Arena — source de vérité

Chaque jeu est défini dans `code-arena/games/<slug>/` (le `slug` = nom du dossier) et
synchronisé en base par `php bin/console app:arena:sync` (lancé aussi au démarrage du conteneur).

## Fichiers d'un jeu

```
games/<slug>/
  game.json      # métadonnées (requis)
  statement.md   # énoncé (markdown)
  referee.<ext>  # validateur exécuté dans Piston (un seul fichier referee.*)
  input.txt      # input du jeu donné au code joueur (stdin)
```

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

## Contrat du referee (exécuté dans Piston)

- **stdin** : JSON `{ "input": "<input.txt>", "output": "<sortie du code joueur>" }`
- **stdout** : JSON `{ "verdict": "passed|failed", "score": int, "replay": { "init": ..., "frames": [...] } }`

`init`/`frames` sont propres au jeu et interprétés par **son viewer** côté front :
`frontend/src/app/arena/games/<slug>/viewer.ts` (enregistré dans `registry.ts`).

## Ajouter un jeu

1. Créer `games/<slug>/` (game.json, statement.md, referee.*, input.txt).
2. Créer le viewer front `frontend/src/app/arena/games/<slug>/viewer.ts` + l'enregistrer dans le registre.
3. `php bin/console app:arena:sync` (ou redémarrer le conteneur code-arena).

Aucun code backend à modifier.
