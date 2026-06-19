# Code Arena — Module (récap & fonctionnement)

Code Arena est la fonctionnalité « jeux de dev façon CodinGame » de World of Code :
un utilisateur ouvre un défi, écrit du code dans un IDE en ligne, l'exécute en **sandbox
isolée (Piston)**, et voit un **replay visuel animé** de l'exécution + un verdict/score.

> Détail du modèle de données et du contrat d'API : voir [`./CONTRAT.md`](./CONTRAT.md).

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

- **cas de test** (`tests/*.txt`) : chaque fichier est une entrée donnée sur `stdin` au code joueur.
- **referee** : un programme (par jeu) exécuté dans Piston qui **juge** la sortie du joueur
  sur **un** cas et **produit la trace de replay** de ce cas.
- **viewer** : un composant front (par jeu) qui **anime** la trace.

### Les deux contrats (identiques pour tous les jeux)

1. **Code joueur** — `stdin` = un cas de test · `stdout` = sa réponse.
2. **Referee** (dans Piston), exécuté **un cas à la fois** :
   - `stdin` = JSON `{ "input": "<un cas de tests/>", "output": "<sortie joueur>" }`
   - `stdout` = JSON `{ "verdict": "passed|failed", "score": int, "replay": { "init": ..., "frames": [...] } }`

`init`/`frames` sont **propres au jeu** et interprétés par **son** viewer.

---

## 3. Cas de test & scoring

Un jeu a **plusieurs cas de test** (`games/<slug>/tests/01.txt`, `02.txt`, …), triés par
nom de fichier — cet ordre fixe la position (`Cas 1`, `Cas 2`, …). **Tous les cas sont
publics** : le joueur voit l'input de chacun. Un jeu à cas unique peut encore utiliser
`input.txt` (rétro-compatibilité, voir [`../games/README.md`](../games/README.md)).

Le backend exécute le referee **par cas**. Deux usages :

- **Essai (non noté)** — endpoint `/run-tests` : un cas précis ou tous les cas. Ne persiste
  rien, n'attribue aucun badge. Sert au bouton ▶ d'un cas et à « Tout lancer ».
- **Soumission (notée)** — endpoint `/play` : exécute le code sur **tous** les cas, persiste
  une `submission` et attribue les badges éligibles.

**Verdict & score d'une soumission** (`/play`) :

- `verdict = passed` **seulement si tous les cas passent** (sinon `failed`).
- `score_final = round(testsPassed / testsTotal × maxScore)` — proportionnel au nombre de
  cas réussis. `maxScore` (défini dans `game.json`) reste la valeur de points unique du jeu,
  affichée à l'identique sur la carte et dans l'énoncé.
- La **qualité 0–100** renvoyée par le referee est conservée **par cas** (`results[].score`,
  à titre informatif) mais ne pilote plus le score final.

> Côté liste des défis, `successRate` n'est pas un taux global mais la **progression
> personnelle** de l'utilisateur courant : son meilleur ratio `testsPassed / testsTotal`
> (100 % une fois résolu, valeur partielle sinon, 0 % si jamais tenté) — c'est ce qui
> alimente la barre de progression.

---

## 4. Cycle de vie (end-to-end)

Trois actions depuis la page de jeu :

| Action (front) | Endpoint | Noté ? | Replay | Effet |
|---|---|---|---|---|
| **Exécuter** | `POST /run` | non | non | exécution brute (stdout/stderr/exit) |
| **▶ un cas** / **Tout lancer** | `POST /run-tests` | non | oui (par cas) | essai sur un cas ou tous |
| **Jouer** (jeux) / **Soumettre** (défis I/O) | `POST /play` / `POST /submit` | oui | `/play` oui | soumission persistée + badges |

```
[Front] clic « Jouer »
   → POST /api/arena/challenges/{slug}/play  { language, code }
[code-arena] PlayController
   → charge le défi (referee + tous les cas tests/* depuis la base)
   → pour CHAQUE cas, GameRunner.play():
        1. Piston.execute(language, code, cas)                       → sortie joueur
        2. Piston.execute(refereeLang, refereeCode, {input,output})  → {verdict,score,replay}
   → verdict global = passed si tous les cas passent ; score proportionnel
   → persiste la submission (testsPassed/testsTotal), attribue les badges
   → renvoie { verdict, score, testsPassed, testsTotal, results[], badgesAwarded }
[Front] ReplayPlayer + viewer du jeu  → rejoue results[] cas par cas (file séquentielle),
        affiche l'overlay de réussite si tous passent (et les badges gagnés)
```

Sélectionner un cas sans l'exécuter affiche son **état de départ** : un replay figé d'une
frame construit côté front par `buildPreview(input)`, sans exécuter de code.

---

## 5. Ajouter un nouveau jeu (0 code backend)

1. **Définir le jeu** dans `code-arena/games/<slug>/` :
   ```
   game.json      # title, difficulty, languages, maxScore, image?, refereeLanguage, badges[]
   statement.md   # énoncé (markdown)
   referee.<ext>  # validateur (un seul fichier referee.*), exécuté dans Piston
   tests/         # un fichier .txt par cas (stdin donné au code joueur), triés par nom
     01.txt
     02.txt
     ...
   ```
2. **Écrire le module front** dans `frontend/src/app/arena/games/<slug>/` :
   - `viewer.ts` — implémente `GameViewer` (`setup` + `renderFrame`) ;
   - `preview.ts` — `buildPreview(input)` : état de départ figé (1 frame) à partir de l'input ;
   puis enregistrer le `GameModule` (`{ createViewer, buildPreview }`) dans
   `frontend/src/app/arena/games/registry.ts`.
3. **Synchroniser** : `docker exec projet_code_arena php bin/console app:arena:sync`
   (ou redémarrer le conteneur : la sync tourne au démarrage).

Voir le format détaillé : [`../games/README.md`](../games/README.md). Jeu de référence : `games/maze/`.

---

## 6. Endpoints (`/api/arena`, JWT requis sauf `health`)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/arena/health` | sonde (public) |
| GET | `/api/arena/challenges` | liste des défis (`solved`, `successRate` = progression perso, `image`…) |
| GET | `/api/arena/challenges/{slug}` | détail (énoncé, `publicTests`…) |
| POST | `/api/arena/challenges/{slug}/play` | **soumission notée (jeu)** : code + referee sur **tous** les cas → `{verdict, score, testsPassed, testsTotal, results[], badgesAwarded}` |
| POST | `/api/arena/challenges/{slug}/run-tests` | **essai non noté** : un cas (`testIndex`) ou tous → `{results[]}` (rien de persisté) |
| POST | `/api/arena/run` | exécution brute (sandbox / debug) → `{stdout, stderr, exitCode, timedOut}` |
| POST | `/api/arena/challenges/{slug}/submit` | **soumission notée (défi I/O)** : comparaison `stdout == expectedOutput`, **sans referee ni replay** → `{status, score, testsPassed, testsTotal, badgesAwarded}` |
| GET | `/api/arena/submissions/{id}` | état d'une soumission (propriétaire) |
| GET | `/api/arena/leaderboard` | classement (somme des meilleurs scores) |
| GET | `/api/arena/users/{userId}/badges` | badges d'un utilisateur |

> `play` (referee + replay, jeux) et `submit` (comparaison I/O exacte, défis classiques)
> sont deux modes de soumission distincts. Le front choisit selon que le slug a un module
> de jeu enregistré ou non.

---

## 7. Langages supportés

`javascript`, `typescript`, `python`, `php`, `java`, `cpp` — exécutés via Piston.
Ajouter un langage = l'installer dans Piston (`piston-install`) + l'ajouter à `PistonService`
(`LANGUAGE_MAP` + `FILE_NAMES`), `RunController`, et au front (`CodeEditor`, snippets).

---

## 8. Déploiement & reproductibilité

Services docker-compose : `code-arena` (port 8082), `piston` (sandbox), `piston-install`
(installe les runtimes via l'API Piston, idempotent).

Au démarrage du conteneur code-arena (`entrypoint.sh`) :
1. `composer install`
2. attente de la base `projet_web`
3. attente de la **clé publique JWT** (générée par le backend après ses migrations)
4. `cache:clear`
5. **`app:arena:sync`** → recrée tous les jeux de `games/<slug>/` en base (méta, énoncé,
   referee, **cas de `tests/*`**, badges)

→ Sur un environnement neuf (`docker compose down -v && up`), **les jeux reviennent
automatiquement** (sync depuis les fichiers) et les runtimes Piston sont réinstallés.

---

## 9. Tests

### 9.1 Cas de test d'un jeu (gameplay)

Ce sont les `games/<slug>/tests/*.txt` décrits au §3 et §5 : un fichier `.txt` = un cas,
chargé en base par `app:arena:sync` (table `challenge_test`, tous publics). Pour ajouter /
modifier des cas, on édite les fichiers puis on relance la sync :

```
docker exec projet_code_arena php bin/console app:arena:sync
```

Les essayer sans rien persister : bouton ▶ d'un cas / « Tout lancer » dans l'onglet **Tests**
(endpoint `/run-tests`). Le jeu de référence `games/maze/` en compte 8 (`01.txt` → `08.txt`).

### 9.2 Tests unitaires PHPUnit (code du module)

PHPUnit est installé **dans code-arena** (conteneur, pas sur la machine) :

```
docker exec projet_code_arena php bin/console app:arena:sync   # (re)synchronise les jeux
docker exec projet_code_arena php bin/phpunit                   # lance les tests
```

Couverts : `GameRunner` (orchestration + referee invalide), `PistonService` (requête/mapping/SIGKILL),
`ArenaUserProvider` (résolution user), `SyncGamesCommand` (upsert depuis `games/`, y compris `tests/`).

---

## 10. Composants principaux

**Backend (`code-arena/src/`)**
- `Controller/` : Health, Challenge, **Play** (`/play` + `/run-tests`), Run, Submission, Leaderboard, Badge
- `Service/` : `PistonService` (+ `PistonClientInterface`), `GameRunner`, **`BadgeAwarder`** (attribution `perfect` / `first_solve`)
- `Security/` : `ArenaUser`, `ArenaUserProvider` (résolution `username → user.id`)
- `Command/SyncGamesCommand` : `games/<slug>/` → base
- `Entity/` : Challenge, ChallengeTest, Submission (`testsPassed`/`testsTotal`), Badge, UserBadge

**Frontend (`frontend/src/app/arena/`)**
- `page.tsx` : liste des défis (vitrine + hero + classement + barre de progression)
- `[slug]/page.tsx` : page de jeu (toolbar, onglets Sujet/**Tests**, liste des cas + ▶/« Tout lancer », visualisation, panneaux redimensionnables)
- `sandbox/page.tsx` : bac à sable (exécution libre)
- `components/arena/ReplayPlayer.tsx` : lecteur de replay PixiJS générique
- `components/arena/BadgeUnlockOverlay.tsx` : overlay de célébration (réussite / badge gagné)
- `games/registry.ts` + `games/<slug>/{viewer,preview}.ts` : module par jeu (`createViewer` + `buildPreview`)

---

## 11. État & limites connues (honnête)

- **Badges attribués** : `perfect` (tous les cas passés) et `first_solve` (1er à résoudre le défi)
  sont écrits dans `user_badge` au `/play` et au `/submit` (via `BadgeAwarder`, idempotent).
  Les autres codes de badge éventuels ne sont pas encore gérés.
- **Cas de test multiples mais statiques** : plusieurs cas par jeu (`tests/*`), mais pas de
  générateur ; **tous les cas sont publics** (pas de cas cachés).
- **Limites Piston** : timeout d'exécution (`RUN_TIMEOUT_MS`) + **plafond de sortie** par
  exécution. Le défaut Piston (`output_max_size` = 1024 o) est **trop bas pour un replay**
  (la trace `init`+`frames` du referee le dépasse vite → process tué « Sandbox keeper
  received fatal signal 6 », rendu côté front par « Referee invalide »). Il est relevé via
  `PISTON_OUTPUT_MAX_SIZE` (service `piston` du `docker-compose.yaml`). Garder malgré tout
  les replays compacts (valeurs entières). Pas de cap mémoire ni de rate-limiting.
- **Viewers** importés statiquement (tout dans le bundle) : OK à petite échelle.
- **CI** : les tests code-arena ne sont pas encore lancés par la CI (job à ajouter, calqué sur `coverage:backend`).
  `BadgeAwarder` et `PlayController` (multi-cas) ne sont pas encore couverts par des tests unitaires.
- **Front** : pas de tests unitaires sur les composants Pixi.
</content>
</invoke>
