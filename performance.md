# Journal de performance — WOC API

Tests réalisés avec k6 (stress test : 0→50 VUs sur 15 min) contre `https://api-woc-prod.duckdns.org`.

---

## Baseline — 2026-06-01 (avant optimisations)

### Résultats stress test prod

| Métrique | Valeur |
|---|---|
| VUs max | 50 |
| Requêtes totales | 9 006 |
| Débit | ~10 req/s |
| `http_req_failed` | **0.00%** ✓ |
| `http_req_duration` avg | 2.5s |
| `http_req_duration` médiane | 1.34s |
| `http_req_duration` p90 | 7.2s |
| `http_req_duration` p95 | **8.4s** ✗ (seuil : 5s) |
| `http_req_duration` max | 11.61s |
| Checks passés | 100% (9006/9006) ✓ |
| Timeouts | 0 ✓ |

### Analyse slow query (performance_schema)

Requête dominante — `SELECT post` :

| | |
|---|---|
| Exécutions | **12 046** |
| Temps moyen | 94ms |
| Temps max | 944ms |

### Diagnostic EXPLAIN

```sql
EXPLAIN SELECT ... FROM post p0_ ORDER BY p0_.created_at DESC LIMIT 20;
```

```
type: ALL | key: NULL | rows: 336 | Extra: Using filesort
```

**Full table scan + tri en mémoire à chaque requête.**

### Indexes présents sur `post`

| Index | Colonne |
|---|---|
| PRIMARY | `id` |
| IDX_author | `author_id` |
| IDX_tech_group | `tech_group_id` |
| IDX_shared_from | `shared_from_id` |
| ~~IDX_created_at~~ | ❌ manquant |

### Cause racine

Pas d'index sur `created_at` alors que tous les listings trient par cette colonne (`ORDER BY created_at DESC`).
Avec 12 046 appels sous charge, MySQL scanne les 336 lignes et trie en mémoire à chaque fois.
Le problème s'aggravera exponentiellement à mesure que la table grossit.

---

## Fix #1 — Index sur `post.created_at` (à venir)

**Action** : `CREATE INDEX IDX_post_created_at ON post (created_at DESC);`

**Résultat attendu** : `type: ALL + filesort` → `type: index` sans filesort.
Impact estimé : réduction du p95 de 8.4s → < 2s sous 50 VUs.

---

## Fix #2 — (à définir)

---

## Récapitulatif des performances

| Date | Fix | p95 | Erreurs | Notes |
|---|---|---|---|---|
| 2026-06-01 | Baseline | 8.4s | 0% | Full scan + filesort sur `post` |
| À venir | Index `created_at` | ? | ? | |
