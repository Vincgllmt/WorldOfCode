# Elasticsearch dans le projet

Ce document décrit l'intégration d'Elasticsearch dans le backend, comment ça
fonctionne en runtime, et les commandes à connaître pour le déploiement.

---

## 1. Aperçu

Elasticsearch alimente la recherche globale exposée via `GET /api/search?q=…`.
Trois entités sont indexées dans trois indices distincts :

| Index    | Source            | Recherche                              |
|----------|-------------------|----------------------------------------|
| `posts`  | `App\Entity\Post` | Contenu plein texte, fuzzy, highlight  |
| `users`  | `App\Entity\User` | Username, firstname, lastname (prefix + fuzzy) |
| `groups` | `App\Entity\TechGroup` | Name (prefix + fuzzy)              |

La réponse de `/api/search` renvoie les trois sections en parallèle :

```json
{
  "users":  [{ "id": 7, "username": "theo", "firstname": "Théo", ... }],
  "groups": [{ "id": 3, "name": "Symfony France", ... }],
  "posts":  [{ "id": 42, "snippet": "Hello <mark>Midgar</mark>", ... }]
}
```

---

## 2. Architecture

```
                ┌───────────────────────────┐
                │  Doctrine ORM (MySQL)     │
                │  Source de vérité         │
                └──────────────┬────────────┘
                               │ post/persist/update/remove
                               ▼
   ┌─────────────────────────────────────────────────┐
   │  EventListeners (Doctrine)                      │
   │   - PostElasticSyncListener                     │
   │   - UserElasticSyncListener                     │
   │   - GroupElasticSyncListener                    │
   └──────────────┬──────────────────────────────────┘
                  │ index/delete/bulk
                  ▼
   ┌─────────────────────────────────────────────────┐
   │  Indexer Services                               │
   │   - PostIndexer, UserIndexer, GroupIndexer      │
   │   - Wrapper basé sur ElasticClient              │
   │   - Erreurs avalées (jamais bloquant)           │
   └──────────────┬──────────────────────────────────┘
                  │ HTTP (auth basic)
                  ▼
   ┌─────────────────────────────────────────────────┐
   │  Cluster Elasticsearch 8.13.4                   │
   │  Service `elasticsearch` (docker-compose)       │
   └─────────────────────────────────────────────────┘
                  ▲
                  │ search
                  │
   ┌──────────────┴──────────────────────────────────┐
   │  SearchService                                  │
   │   - searchPosts / searchUsers / searchGroups    │
   └──────────────┬──────────────────────────────────┘
                  ▲
                  │
   ┌──────────────┴──────────────────────────────────┐
   │  SearchController  (GET /api/search)            │
   │   - Fallback SQL gracieux si ES down            │
   └─────────────────────────────────────────────────┘
```

### Fichiers clés

- `src/Service/Elasticsearch/ElasticClient.php` — wrapper du client PHP officiel (auth basic + méthodes `indexDocument`, `bulk`, `search`, etc.)
- `src/Service/Elasticsearch/IndexDefinitions.php` — mappings des trois indices
- `src/Service/Elasticsearch/PostIndexer.php` (et `UserIndexer`, `GroupIndexer`) — transforme une entité en document ES
- `src/Service/Elasticsearch/SearchService.php` — construit les requêtes de recherche, parse les hits
- `src/EventListener/{Post,User,Group}ElasticSyncListener.php` — synchronisation automatique à chaque écriture Doctrine
- `src/Command/ElasticHealthCommand.php` — diagnostic du cluster
- `src/Command/ElasticCreateIndicesCommand.php` — création idempotente des indices
- `src/Command/ElasticReindexCommand.php` — backfill complet d'un ou de tous les indices

---

## 3. Configuration

### Variables d'environnement (`backend/.env`)

```env
ELASTICSEARCH_HOST=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=projet_es_dev_password
```

En prod, **remplacer `ELASTICSEARCH_PASSWORD`** par un mot de passe fort (32+ caractères aléatoires).
Le `ELASTIC_PASSWORD` côté docker-compose doit correspondre.

### Service docker-compose

Le service `elasticsearch` tourne sur l'image officielle `8.13.4`, en mode single-node,
avec sécurité activée (basic auth) et SSL désactivé pour le réseau interne docker.

Healthcheck intégré : `curl -fs -u elastic:… /_cluster/health`.
Le backend ne démarre qu'après que ES soit `healthy`.

---

## 4. Commandes Symfony

Toutes lancées via `docker compose exec backend php bin/console …`.

### `app:elastic:health`
Affiche l'état du cluster (status, nodes, shards). Retourne 0 si green/yellow, 1 sinon.

### `app:elastic:create-indices`
Crée les indices manquants. **Idempotent** : ne touche pas aux indices existants.
Appelée automatiquement par l'entrypoint à chaque démarrage du backend.

### `app:elastic:reindex --entity=<posts|users|groups|all>`
Réindexe une ou toutes les entités depuis MySQL. Pagination par lots de 500.
À utiliser après un changement de mapping, ou après un wipe du volume ES.

```bash
# Tout réindexer
docker compose exec backend php bin/console app:elastic:reindex --entity=all

# Seulement les posts
docker compose exec backend php bin/console app:elastic:reindex --entity=posts
```

---

## 5. Flux de synchronisation

### Création / modification d'une entité
1. L'application appelle `EntityManager::persist()` puis `flush()`
2. Doctrine déclenche `postPersist` ou `postUpdate`
3. Le listener correspondant (`PostElasticSyncListener` par ex.) appelle `Indexer::index()`
4. `Indexer` envoie un document JSON vers le bon index ES
5. **Si ES est indisponible**, l'erreur est logguée et avalée — la requête utilisateur n'est pas bloquée

### Suppression
1. `EntityManager::remove()` puis `flush()`
2. Doctrine déclenche `preRemove` (avant la suppression DB, pour récupérer l'ID)
3. Le listener appelle `Indexer::delete($id)`

### Recherche
1. `GET /api/search?q=…&limit=…`
2. `SearchController` appelle `SearchService::searchUsers`, `searchGroups`, `searchPosts`
3. Chaque appel ES est dans un `try/catch` :
   - Posts : skip silencieux si ES down
   - Users/Groups : fallback automatique vers la recherche SQL `LIKE` existante

---

## 6. Détails des requêtes de recherche

### Posts
- `multi_match` sur `content^2`, `authorUsername`, `groupName`
- `fuzziness: AUTO` (tolérance de 0 à 2 typos selon longueur)
- `function_score` avec `gauss` decay sur `createdAt` (boost les 30 derniers jours)
- Highlight sur `content`, snippet de 120 chars avec `<mark>…</mark>`

### Users
- `bool/should` combinant :
  - `multi_match` type `bool_prefix` sur `username^3`, `firstname^2`, `lastname^2` (autocomplete : "th" matche "theo")
  - `multi_match` avec `fuzziness: AUTO` sur les mêmes champs (typo tolerance : "ondrcka" matche "ondricka")
- Pas de recherche dans `bio` ni `skills` (intentionnel pour éviter le bruit)

### Groups
- Même logique : `match_phrase_prefix` + `match` avec `fuzziness: AUTO` sur `name`

---

## 7. Déploiement et migration

### Premier déploiement (vierge)

L'entrypoint du backend (`backend/entrypoint.sh`) crée les indices automatiquement.
Mais les indices créés sont **vides** — il faut ensuite réindexer depuis la DB :

```bash
docker compose exec backend php bin/console app:elastic:reindex --entity=all
```

### Mise à jour d'un mapping

Elasticsearch ne permet pas de modifier la plupart des paramètres d'un mapping
existant. La procédure :

```bash
# 1. Supprimer l'index concerné
docker compose exec elasticsearch curl -X DELETE -u elastic:$ES_PWD http://localhost:9200/<index>

# 2. Le recréer (idempotent, prend le nouveau mapping)
docker compose exec backend php bin/console app:elastic:create-indices

# 3. Réindexer
docker compose exec backend php bin/console app:elastic:reindex --entity=<entity>
```

### Activation de la sécurité sur un cluster existant non-sécurisé

ES refuse d'activer la sécurité a posteriori sur un cluster qui a démarré
sans elle. Si tu rencontres ce cas, wiper le volume :

```bash
docker compose down elasticsearch
docker volume rm <project>_elasticsearch_data
docker compose up -d elasticsearch backend
docker compose exec backend php bin/console app:elastic:reindex --entity=all
```

### Diagnostic en cas de problème

```bash
# Cluster vivant ?
docker compose exec backend php bin/console app:elastic:health

# Nombre de docs dans un index
curl -u elastic:$ES_PWD http://localhost:9200/posts/_count

# Voir les logs de l'entrypoint backend (création d'index, etc.)
docker compose logs --tail=50 backend

# Voir les logs ES
docker compose logs --tail=50 elasticsearch
```

---

## 8. Tests

Tests unitaires : `tests/Service/Elasticsearch/` (36 tests, mockent `ElasticClient`).

```bash
docker compose exec backend ./vendor/bin/phpunit tests/Service/Elasticsearch/
```

Pas de tests d'intégration qui hit un vrai cluster — à ajouter si besoin via
un service ES dédié au profil de test.

---

## 9. Limites connues / pistes V2

- **Synchronisation synchrone** : les listeners Doctrine appellent ES dans la même requête HTTP. À fort trafic, basculer vers une queue (`Symfony Messenger`) pour décorréler.
- **Pas de recherche dans la bio / les skills** : volontaire pour éviter le bruit. Si tu veux la réactiver, remettre les champs dans les `fields` de `SearchService::searchUsers`.
- **Pas d'indexation des commentaires ni de la veille tech** : pas d'index dédié à ces entités.
- **Pas de tests d'intégration** : juste des tests unitaires mockés.
- **Single-node, pas de réplication** : OK pour dev, à reconfigurer pour la prod (3 nodes minimum, replicas ≥ 1).
