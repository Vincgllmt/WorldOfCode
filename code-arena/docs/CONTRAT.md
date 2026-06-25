# Code Arena — Contrat (modèle de données + API)

Module 168H intégré à World of Code : IDE en ligne + jeux de dev exécutés en sandbox,
avec scoring, leaderboard et badges.

## Décisions d'architecture

- **Logique** : application Symfony autonome dans le dossier `code-arena/` (séparée de `backend/`).
- **Schéma / migrations** : possédés par le `backend/` (migrations Doctrine), comme les tables `msg_*` de la messagerie. `code-arena/` mappe les tables en entités mais ne génère **jamais** de migration.
- **Base de données** : `projet_web` (MySQL partagé) ; Code Arena lit/écrit directement.
- **Utilisateur** : référencé par `user_id` scalaire (entier, → `user.id`). Pas d'entité `User` côté Code Arena.
- **Auth** : validation JWT RS256 via clé publique partagée (volume `jwt_keys`), sans appel au backend.

- **Exécution (résolu)** : modèle générique « referee dans Piston ». Le code joueur **et** le referee
  (propre à chaque jeu) s'exécutent dans Piston ; le referee juge la sortie et produit le replay.
  → Fonctionnement complet, cycle de vie d'une partie et ajout d'un jeu : voir [`./README.md`](./README.md).

## Modèle de données

### `challenge` — un défi
| colonne | type | note |
|---|---|---|
| id | INT PK AI | |
| slug | VARCHAR(100) UNIQUE | identifiant URL |
| title | VARCHAR(255) | |
| statement | TEXT | énoncé (markdown) |
| difficulty | VARCHAR(20) | `easy` / `medium` / `hard` |
| languages | JSON | langages autorisés, ex. `["javascript","python"]` |
| max_score | INT | défaut 100 |
| image | VARCHAR(255) | URL de couverture (optionnelle, affichée sur la carte) |
| referee_code | LONGTEXT | code du referee exécuté dans Piston (nullable) |
| referee_language | VARCHAR(20) | langage du referee, ex. `python` (nullable) |
| created_at | DATETIME | |
| updated_at | DATETIME | |

> Pour un **jeu** (CodinGame-lite), `challenge_test` sert d'**input du jeu** (donné au code joueur)
> et le `referee_code` juge la sortie. Le mode I/O simple (comparaison `expected_output`) reste possible
> pour des défis sans referee.

### `challenge_test` — cas de test d'un défi
| colonne | type | note |
|---|---|---|
| id | INT PK AI | |
| challenge_id | INT FK → challenge | |
| stdin | TEXT | entrée |
| expected_output | TEXT | sortie attendue |
| is_public | TINYINT | exemple visible par l'utilisateur (1) ou caché (0) |
| weight | INT | poids dans le score, défaut 1 |
| position | INT | ordre d'affichage |

### `submission` — une soumission
> Colonnes liées à Piston (`execution_time_ms`, `stderr`, statuts `running`/`error`) ajoutées plus tard.

| colonne | type | note |
|---|---|---|
| id | INT PK AI | |
| challenge_id | INT FK | |
| user_id | INT | scalaire → `user.id` |
| language | VARCHAR(20) | |
| code | MEDIUMTEXT | code soumis |
| status | VARCHAR(20) | `pending` / `passed` / `failed` |
| score | INT | défaut 0 |
| tests_passed | INT | défaut 0 |
| tests_total | INT | défaut 0 |
| created_at | DATETIME | |

### `badge` — un badge (plusieurs par défi)
| colonne | type | note |
|---|---|---|
| id | INT PK AI | |
| challenge_id | INT FK | relation 1-à-N |
| code | VARCHAR(50) | règle d'attribution : `first_solve`, `perfect` |
| name | VARCHAR(100) | |
| description | VARCHAR(255) | |
| icon | VARCHAR(255) | clé ou URL d'icône |
| created_at | DATETIME | |
| | UNIQUE(challenge_id, code) | un type de badge unique par défi |

### `user_badge` — badge débloqué par un utilisateur
| colonne | type | note |
|---|---|---|
| id | INT PK AI | |
| user_id | INT | scalaire |
| badge_id | INT FK → badge | |
| awarded_at | DATETIME | |
| | UNIQUE(user_id, badge_id) | attribution idempotente |

### Badges au lancement (codes en dur, gérés par le service de scoring)
- `first_solve` — premier succès du défi par l'utilisateur
- `perfect` — tous les tests passés / score maximum

### Leaderboard
Pas de table dédiée. Calculé par requête : somme du meilleur score par défi et par utilisateur.

## Contrat d'API

Préfixe `/api/arena`. JWT requis. Le `user_id` d'une soumission est extrait du JWT, jamais du body.
Le leaderboard et les badges renvoient des `userId` ; le front résout pseudo/avatar via le backend.

| méthode | route | corps / réponse |
|---|---|---|
| GET | `/api/arena/challenges` | `[{id, slug, title, difficulty, languages, maxScore, image, solved, successRate}]` (`successRate` = progression perso : meilleur ratio `testsPassed/testsTotal`) |
| GET | `/api/arena/challenges/{slug}` | `{id, slug, title, statement, difficulty, languages, maxScore, image, publicTests:[{stdin, expectedOutput}]}` |
| POST | `/api/arena/challenges/{slug}/play` | body `{language, code}` → `{submissionId, verdict, score, testsPassed, testsTotal, results:[{index, verdict, score, replay:{init,frames}, playerStderr, error}], badgesAwarded}` — **soumission notée** : code joueur + referee sur **tous** les cas (`passed` ssi tous passent) |
| POST | `/api/arena/challenges/{slug}/run-tests` | body `{language, code, testIndex?}` → `{results:[…]}` (même forme que `play.results`) — **essai non noté** : un cas (`testIndex`) ou tous, rien de persisté |
| POST | `/api/arena/run` | body `{language, code, stdin?}` → `{stdout, stderr, exitCode, timedOut}` — exécution brute (sandbox/debug) |
| POST | `/api/arena/challenges/{slug}/submit` | body `{language, code}` → `{submissionId, status, score, testsPassed, testsTotal, badgesAwarded}` — soumission notée par comparaison `stdout == expectedOutput`, **sans referee ni replay** (défis I/O classiques) |
| GET | `/api/arena/submissions/{id}` | `{id, challengeSlug, language, status, score, testsPassed, testsTotal, createdAt}` |
| GET | `/api/arena/leaderboard` | `[{rank, userId, username, totalScore, badgesCount, isCurrentUser}]` |
| GET | `/api/arena/users/{userId}/badges` | `[{badgeId, name, description, icon, challengeSlug, awardedAt}]` |

### Contrat du referee (exécuté dans Piston)
- **stdin** : JSON `{ "input": "...", "output": "<sortie du code joueur>" }`
- **stdout** : JSON `{ "verdict": "passed|failed", "score": int, "replay": { "init": ..., "frames": [...] } }`
