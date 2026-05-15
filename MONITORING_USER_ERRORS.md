# Monitoring — Alertes sur les erreurs utilisateurs

## Objectif

Envoyer une notification automatique sur Google Chat dès que des erreurs provoquées par des utilisateurs sont détectées sur le site WOC, en s'appuyant sur la stack de monitoring déjà en place (Loki + Grafana).

---

## Architecture du système

```
Utilisateur fait une requête invalide
         │
         ▼
Symfony (backend) lève une HttpException (4xx)
         │
         ▼
UserErrorSubscriber (kernel.exception)
  → filtre : 400, 401, 403, 422, 429 (pas 404)
  → logue en JSON via channel "user_error"
         │
         ▼
stdout du container php-fpm
         │
         ▼
Promtail collecte les logs du pod (labels: app=backend)
         │
         ▼
Loki indexe les logs
         │
         ▼
Grafana évalue la règle LogQL toutes les minutes
  → si > 5 erreurs en 5 min → FIRING
         │
         ▼
Contact Point "Google Chat WOC"
         │
         ▼
Notification Google Chat (webhook)
```

---

## Fichiers créés / modifiés

### 1. `backend/config/packages/monolog.yaml` *(créé)*

Configure deux handlers Monolog :

| Handler              | Channel      | Level   | Format | Destination  |
|----------------------|--------------|---------|--------|--------------|
| `main`               | tout sauf `user_error` | debug | JSON | stdout |
| `user_error_handler` | `user_error` | warning | JSON | stdout |

Les deux écrivent en **JSON structuré** vers `stdout`. Promtail collecte `stdout` automatiquement sur tous les pods Kubernetes. Le format JSON permet à Loki de parser les champs avec `| json` dans les requêtes LogQL.

**Extrait :**
```yaml
monolog:
    channels:
        - user_error
    handlers:
        user_error_handler:
            type:      stream
            path:      php://stdout
            level:     warning
            channels:  [user_error]
            formatter: monolog.formatter.json
```

---

### 2. `backend/src/EventListener/UserErrorSubscriber.php` *(créé)*

Event listener Symfony qui intercepte toutes les exceptions HTTP et logue les erreurs utilisateur.

**Codes HTTP monitorés :**

| Code | Signification              | Exemple                            |
|------|----------------------------|------------------------------------|
| 400  | Bad Request                | Payload malformé                   |
| 401  | Unauthorized               | Token JWT absent ou invalide       |
| 403  | Forbidden                  | Accès refusé (ex. 2FA non validée) |
| 422  | Unprocessable Entity       | Erreur de validation (API Platform)|
| 429  | Too Many Requests          | Rate limiter déclenché             |

**Code 404 exclu volontairement** : trop de bruit (bots, crawlers, routes inexistantes).

**Contexte loggé dans chaque entrée :**

```json
{
  "message": "Access Denied.",
  "context": {
    "status_code": 403,
    "route": "api_post_create",
    "method": "POST",
    "ip": "82.45.x.x",
    "user": "john.doe"
  },
  "channel": "user_error",
  "level_name": "WARNING"
}
```

**Mécanisme technique :**
- `#[AsEventListener(event: KernelEvents::EXCEPTION)]` — s'abonne à l'événement noyau Symfony
- `#[Autowire(service: 'monolog.logger.user_error')]` — injecte le logger du channel dédié
- `TokenStorageInterface` — récupère l'utilisateur courant (ou `anonymous`)
- Utilise `getUserIdentifier()` (Symfony 7 / PHP 8.4)

---

### 3. `cluster/monitoring/grafana-alerting.yaml` *(créé)*

Fichier Helm values overlay dédié exclusivement à l'alerting. Il est appliqué **par-dessus** la configuration vm-stack existante via `--reuse-values`, sans toucher aux autres composants (VictoriaMetrics, node-exporter, etc.).

Ce fichier contient trois sections de provisioning Grafana :

#### Contact Point — Google Chat

```yaml
contactPoints:
  - name: Google Chat WOC
    receivers:
      - uid: google-chat-woc
        type: googlechat
        settings:
          url: "https://chat.googleapis.com/v1/spaces/AAQAsdDI51U/messages?..."
        disableResolveMessage: false
```

Le `disableResolveMessage: false` signifie que Grafana envoie aussi un message quand l'alerte revient à l'état normal ("resolved").

#### Politique de routage

```yaml
policies:
  - receiver: Google Chat WOC
    matchers:
      - label: alertname
        match_type: =~
        value: ".*"
```

Toutes les alertes de cette organisation Grafana sont routées vers Google Chat.

#### Règle d'alerte

| Paramètre         | Valeur                                       |
|-------------------|----------------------------------------------|
| Datasource        | Loki (`uid: loki-datasource`)                |
| Requête LogQL     | `sum(count_over_time({app="backend"} \| json \| channel=\`user_error\` [5m]))` |
| Seuil             | > 5 occurrences                              |
| Fenêtre           | 5 minutes glissantes                         |
| Intervalle        | Évaluée toutes les 1 minute                  |
| Délai déclenchement | 1 minute confirmée (évite les faux positifs) |
| NoData            | `NoData` (pas d'alerte si Loki est vide)     |

**Fonctionnement de la requête LogQL :**
1. `{app="backend"}` — sélectionne les logs des pods backend (label Kubernetes propagé par Promtail)
2. `| json` — parse chaque ligne de log comme du JSON
3. `| channel=\`user_error\`` — filtre sur le channel Monolog dédié
4. `count_over_time([5m])` — compte les occurrences sur 5 minutes
5. `sum(...)` — agrège tous les pods backend (dev + prod)

---

### 4. `cluster/monitoring/.gitlab-ci.yml` *(modifié)*

Ajout du job `deploy:monitoring:alerting`.

**Comportement :**

| Déclencheur | Comportement |
|---|---|
| Commit sur `dev` ou `main` avec changement de `grafana-alerting.yaml` | **Auto** |
| Manuellement via pipeline GitLab | Manuel (`allow_failure: true`) |

**Commande Helm utilisée :**
```bash
helm upgrade --install vm-stack vm/victoria-metrics-k8s-stack \
  --namespace monitoring \
  --version 0.66.1 \
  --reuse-values \                        # conserve la config vm-stack existante
  --values cluster/monitoring/grafana-alerting.yaml   # overlay alerting uniquement
```

`--reuse-values` est la clé : seules les valeurs du fichier `grafana-alerting.yaml` sont appliquées par-dessus la release existante. Cela évite de redéployer entièrement VictoriaMetrics, Grafana et node-exporter pour un simple changement de règle d'alerte.

---

## Déploiement

### Ordre recommandé (première installation)

```
1. deploy:vm-stack          (si pas déjà déployé)
2. deploy:loki-stack        (si pas déjà déployé)
3. deploy:monitoring:alerting   ← nouveau
4. build:backend:dev / build:backend:prod
5. deploy:backend:dev / deploy:backend:prod
```

### Mise à jour de la règle d'alerte uniquement

Modifier `cluster/monitoring/grafana-alerting.yaml` et pousser sur `dev` ou `main` — le job `deploy:monitoring:alerting` se déclenche automatiquement.

### Mise à jour du backend uniquement

Modifier les fichiers `backend/**/*` et pousser sur `dev` — le build et le deploy backend se déclenchent automatiquement (comportement existant inchangé).

---

## Comportement de l'alerte

### Scénario nominal

Un utilisateur tente 6 fois d'accéder à une ressource sans JWT valide en moins de 5 minutes.

```
[13:05] POST /api/posts → 401 Unauthorized  → loggé
[13:06] POST /api/posts → 401 Unauthorized  → loggé
[13:07] POST /api/posts → 401 Unauthorized  → loggé
[13:08] PUT  /api/users → 403 Forbidden     → loggé
[13:09] POST /api/posts → 422 Unprocessable → loggé
[13:10] POST /api/posts → 401 Unauthorized  → loggé ← seuil dépassé

[13:11] Grafana évalue : 6 erreurs en 5 min > seuil(5) → FIRING
[13:12] Message envoyé sur Google Chat ✓
```

### Message Google Chat reçu

```
🔔 [FIRING] Erreurs utilisateurs détectées sur WOC
Summary: Erreurs utilisateurs détectées sur WOC
Description: Plus de 5 erreurs utilisateur ont été détectées en 5 minutes 
             sur le site WOC (codes HTTP 400/401/403/422/429).
Labels: severity=warning, team=woc
```

### Résolution automatique

Quand les erreurs repassent sous le seuil, Grafana envoie un message "RESOLVED" sur Google Chat (car `disableResolveMessage: false`).

---

## Ajustements possibles

### Modifier le seuil d'alerte

Dans `grafana-alerting.yaml`, section `evaluator.params` :
```yaml
evaluator:
  params: [5]   # ← changer ici (ex: 10 pour moins de bruit)
  type: gt
```

### Ajouter un code HTTP supplémentaire

Dans `UserErrorSubscriber.php`, la condition de filtre :
```php
// Ajouter 409 Conflict par exemple
if ($statusCode < 400 || $statusCode >= 500 || in_array($statusCode, [404])) {
    return;
}
```

### Séparer les alertes dev / prod

Remplacer la requête LogQL par deux règles distinctes :
```
{app="backend", namespace="dev"} | json | channel=`user_error`
{app="backend", namespace="production"} | json | channel=`user_error`
```

### Filtrer par type d'erreur

Pour n'alerter que sur les 401 (tentatives d'intrusion) :
```
{app="backend"} | json | channel=`user_error` | status_code=`401`
```

---

## Stack utilisée

| Composant | Rôle | Déjà en place |
|---|---|---|
| Symfony 7.4 / PHP 8.4 | Génère les logs structurés | ✓ |
| Monolog | Formatter JSON + channel dédié | ✓ (configuré ici) |
| Promtail | Collecte stdout des pods | ✓ |
| Loki | Indexe et stocke les logs | ✓ |
| Grafana | Évalue les règles, envoie les alertes | ✓ |
| Google Chat Webhook | Réception des notifications | ✓ (configuré ici) |

Aucun nouveau composant n'a été ajouté. La solution s'appuie entièrement sur l'infrastructure existante.
