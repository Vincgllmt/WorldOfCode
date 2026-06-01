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

### Cause racine identifiée

- Pas d'index sur `created_at` → full scan + filesort à chaque requête
- **php-fpm limité à 10 workers** pour 50 VUs simultanés → 40 requêtes en file d'attente en permanence

---

## Fix #1 — Index sur `post.created_at`

**Date** : 2026-06-01

**Action** :
```sql
CREATE INDEX IDX_post_created_at ON post (created_at DESC);
```
Migration Doctrine : `Version20260601150000.php`

**EXPLAIN après** :
```
type: index | key: IDX_post_created_at | rows: 20 | Extra: (none)
```

**Résultat** : Aucun impact mesurable sur le p95.

**Analyse** : Avec seulement 336 lignes, MySQL traitait déjà le full scan en quelques ms.
L'index sera utile à mesure que la table grossit, mais n'était pas le goulot actuel.

---

## Fix #2 — Augmentation du pool php-fpm (10 → 50 workers)

**Date** : 2026-06-01

**Fichier modifié** : `backend/www.conf`

| Paramètre | Avant | Après |
|---|---|---|
| `pm.max_children` | 10 | 50 |
| `pm.start_servers` | 2 | 10 |
| `pm.min_spare_servers` | 2 | 10 |
| `pm.max_spare_servers` | 4 | 30 |

**Résultats après fix** :

| Métrique | Baseline | Après fix | Évolution |
|---|---|---|---|
| Requêtes totales | 9 006 | **9 711** | +8% |
| Débit | ~10 req/s | **~10.8 req/s** | +8% |
| Peak RPS (Grafana) | — | **18.4 req/s** | — |
| `http_req_failed` | 0.00% | **0.00%** | = |
| `http_req_duration` avg | 2.5s | **2.26s** | -10% |
| `http_req_duration` médiane | 1.34s | **218ms** | **-84%** |
| `http_req_duration` p90 | 7.2s | **8.95s** | +24% |
| `http_req_duration` p95 | 8.4s | **9.79s** | +17% |
| Checks passés | 100% | **100%** | = |

**Analyse** : La médiane s'effondre de 1.34s à **218ms** — excellent signe, les requêtes rapides sont bien plus rapides. Mais le p95 s'est légèrement dégradé. Avec plus de workers disponibles, k6 envoie plus de requêtes en parallèle ce qui révèle un nouveau goulot : **les requêtes lentes sur `/api/post`**.

**Par route (Grafana — Requests by URL)** :

| Route | p99 |
|---|---|
| `post_detail` | 437ms ✓ |
| `search` | 362ms ✓ |
| `post_list` | **11.5s** ✗ |

Le problème est clairement isolé sur **`GET /api/post`** (listing). Suspect : requêtes N+1 Doctrine.

---

## Fix #3 — Optimisation N+1 sur `/api/post` (à venir)

**Hypothèse** : Doctrine charge les relations (auteur, likes, commentaires) une par une pour chaque post.

**Action prévue** : Ajouter `JOIN FETCH` ou `addSelect` dans le repository pour eager-loader les relations en une seule requête.

---

## Récapitulatif des performances

| Date | Fix | médiane | p95 | Peak RPS | Erreurs |
|---|---|---|---|---|---|
| 2026-06-01 | Baseline | 1.34s | 8.4s | — | 0% |
| 2026-06-01 | Fix #1 — Index `created_at` | ~1.34s | ~8.4s | — | 0% | 
| 2026-06-01 | Fix #2 — php-fpm 10→50 workers | **218ms** | 9.79s | 18.4 req/s | 0% |
| À venir | Fix #3 — N+1 `/api/post` | ? | ? | ? | ? |
