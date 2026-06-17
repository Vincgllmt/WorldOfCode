# Code Arena — Module (récap & fonctionnement)

Code Arena est la fonctionnalité « jeux de dev façon CodinGame » de World of Code :
un utilisateur ouvre un défi, écrit du code dans un IDE en ligne, l'exécute en **sandbox
isolée (Piston)**, et voit un **replay visuel animé** de l'exécution + un verdict/score.

> Détail du modèle de données et du contrat d'API : voir [`../CONTRAT.md`](../CONTRAT.md).

---

## 1. Architecture en bref

```
Frontend (Next.js)              code-arena (Symfony)            Piston (sandbox)
  page liste / page jeu  --->   API /api/arena/*         --->   exécute code joueur
  ReplayPlayer (PixiJS)  <---   GameRunner (orchestre)   <---   exécute referee
  viewer par jeu                 │
                                 └── projet_web (MySQL partagé, schéma backend)
```

- **Microservice Symfony autonome** dans `code-arena/` (séparé de `backend/`).
- **Base partagée `projet_web`** : le **schéma est possédé par les migrations du `backend/`** ;
  code-arena mappe les tables en entités mais ne génère jamais de migration.
- **Utilisateur** référencé par `user_id` scalaire (pas d'entité `User` côté code-arena).
- **Auth** : validation JWT RS256 via la **clé publique partagée** (volume `jwt_keys`), sans appel au backend.
- **Exécution** : tout code (joueur **et** referee) tourne dans **Piston**, jamais côté backend.

---

## 2. Le modèle de jeu (générique, « CodinGame-lite »)

Le backend ne connaît **aucun jeu**. Un jeu = des **données + du code** chargés depuis des fichiers :

- **input** : l'entrée du jeu, donnée sur `stdin` au code joueur.
- **referee** : un programme (par jeu) exécuté dans Piston qui **juge** la sortie du joueur
  et **produit la trace de replay**.
- **viewer** : un composant front (par jeu) qui **anime** la trace.

### Les deux contrats (identiques pour tous les jeux)

1. **Code joueur** — `stdin` = input du jeu · `stdout` = sa réponse.
2. **Referee** (dans Piston) :
   - `stdin` = JSON `{ "input": "...", "output": "<sortie joueur>" }`
   - `stdout` = JSON `{ "verdict": "passed|failed", "score": int, "replay": { "init": ..., "frames": [...] } }`

`init`/`frames` sont **propres au jeu** et interprétés par **son** viewer.

---

## 3. Cycle de vie d'une partie (end-to-end)

```
[Front] clic « Jouer »
   → POST /api/arena/challenges/{slug}/play  { language, code }
[code-arena] PlayController
   → charge le défi (referee + input depuis la base)
   → GameRunner.play():
        1. Piston.execute(language, code, input)            → sortie joueur
        2. Piston.execute(refereeLang, refereeCode, {input,output})  → {verdict,score,replay}
   → persiste la submission, renvoie { verdict, score, replay }
[Front] ReplayPlayer + viewer du jeu  → anime replay.frames (auto-play)
```

---

## 4. Ajouter un nouveau jeu (0 code backend)

1. **Définir le jeu** dans `code-arena/games/<slug>/` :
   ```
   game.json      # title, difficulty, languages, maxScore, image?, refereeLanguage, badges[]
   statement.md   # énoncé (markdown)
   referee.<ext>  # validateur (un seul fichier referee.*), exécuté dans Piston
   input.txt      # input donné au code joueur
   ```
2. **Écrire le viewer** front : `frontend/src/app/arena/games/<slug>/viewer.ts`
   (implémente `GameViewer` : `setup` + `renderFrame`), puis l'enregistrer dans
   `frontend/src/app/arena/games/registry.ts`.
3. **Synchroniser** : `docker exec projet_code_arena php bin/console app:arena:sync`
   (ou redémarrer le conteneur : la sync tourne au démarrage).

Voir le format détaillé : [`../games/README.md`](../games/README.md). Jeu de référence : `games/maze/`.

---

## 5. Endpoints (`/api/arena`, JWT requis sauf `health`)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/arena/health` | sonde (public) |
| GET | `/api/arena/challenges` | liste des défis (`solved`, `successRate`, `image`…) |
| GET | `/api/arena/challenges/{slug}` | détail (énoncé, tests publics…) |
| POST | `/api/arena/challenges/{slug}/play` | **joue** : code joueur + referee → `{verdict, score, replay}` |
| POST | `/api/arena/run` | exécution brute (sandbox / debug) → `{stdout, stderr, exitCode, timedOut}` |
| POST | `/api/arena/challenges/{slug}/submit` | soumission simple (stub legacy, sans referee) |
| GET | `/api/arena/submissions/{id}` | état d'une soumission (propriétaire) |
| GET | `/api/arena/leaderboard` | classement (somme des meilleurs scores) |
| GET | `/api/arena/users/{userId}/badges` | badges d'un utilisateur |

---

## 6. Langages supportés

`javascript`, `typescript`, `python`, `php`, `java`, `cpp` — exécutés via Piston.
Ajouter un langage = l'installer dans Piston (`piston-install`) + l'ajouter à `PistonService`
(`LANGUAGE_MAP` + `FILE_NAMES`), `RunController`, et au front (`CodeEditor`, snippets).

---

## 7. Déploiement & reproductibilité

Services docker-compose : `code-arena` (port 8082), `piston` (sandbox), `piston-install`
(installe les runtimes via l'API Piston, idempotent).

Au démarrage du conteneur code-arena (`entrypoint.sh`) :
1. `composer install`
2. attente de la base `projet_web`
3. attente de la **clé publique JWT** (générée par le backend après ses migrations)
4. `cache:clear`
5. **`app:arena:sync`** → recrée tous les jeux de `games/<slug>/` en base

→ Sur un environnement neuf (`docker compose down -v && up`), **les jeux reviennent
automatiquement** (sync depuis les fichiers) et les runtimes Piston sont réinstallés.

---

## 8. Tests

PHPUnit est installé **dans code-arena** (conteneur, pas sur la machine) :

```
docker exec projet_code_arena php bin/console app:arena:sync   # (re)synchronise les jeux
docker exec projet_code_arena php bin/phpunit                   # lance les tests
```

Couverts : `GameRunner` (orchestration + referee invalide), `PistonService` (requête/mapping/SIGKILL),
`ArenaUserProvider` (résolution user), `SyncGamesCommand` (upsert depuis `games/`).

---

## 9. Composants principaux

**Backend (`code-arena/src/`)**
- `Controller/` : Health, Challenge, Play, Run, Submission, Leaderboard, Badge
- `Service/` : `PistonService` (+ `PistonClientInterface`), `GameRunner`
- `Security/` : `ArenaUser`, `ArenaUserProvider` (résolution `username → user.id`)
- `Command/SyncGamesCommand` : `games/<slug>/` → base
- `Entity/` : Challenge, ChallengeTest, Submission, Badge, UserBadge

**Frontend (`frontend/src/app/arena/`)**
- `page.tsx` : liste des défis (vitrine + hero + classement)
- `[slug]/page.tsx` : page de jeu (toolbar, onglets Sujet/Tests, visualisation, panneaux redimensionnables)
- `sandbox/page.tsx` : bac à sable (exécution libre)
- `components/arena/ReplayPlayer.tsx` : lecteur de replay PixiJS générique
- `games/registry.ts` + `games/<slug>/viewer.ts` : viewers par jeu

---

## 10. État & limites connues (honnête)

- **Badges** : créés/seedés (`game.json`) mais **pas encore attribués** au joueur (`UserBadge` non écrit au `/play`).
- **Un seul input statique** par jeu : pas de générateur ni de multi-cas / cas cachés.
- **Limites Piston minimales** : timeout d'exécution seulement (pas de cap mémoire/sortie, pas de rate-limiting).
- **Viewers** importés statiquement (tout dans le bundle) : OK à petite échelle.
- **CI** : les tests code-arena ne sont pas encore lancés par la CI (job à ajouter, calqué sur `coverage:backend`).
- **Front** : pas de tests unitaires sur les composants Pixi.
