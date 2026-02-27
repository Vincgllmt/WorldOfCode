# Variables d'environnement CI/CD (Optionnel)

Ce fichier documente les variables d'environnement que vous pouvez configurer dans GitLab pour personnaliser la CI.

## Configuration dans GitLab

**Settings** > **CI/CD** > **Variables**

## Variables disponibles

### 🐳 Versions des images

| Variable | Description | Valeur par défaut | Type |
|----------|-------------|-------------------|------|
| `NODE_VERSION` | Version de Node.js pour le linter | `20` | Variable |
| `PHP_VERSION` | Version de PHP pour les tests | `8.2` | Variable |

**Exemple d'utilisation dans `.gitlab-ci.yml` :**
```yaml
image: node:${NODE_VERSION:-20}-alpine
```

### 🧪 Configuration des tests

| Variable | Description | Valeur par défaut | Type |
|----------|-------------|-------------------|------|
| `PHPUNIT_OPTIONS` | Options supplémentaires pour PHPUnit | _(vide)_ | Variable |
| `ESLINT_OPTIONS` | Options supplémentaires pour ESLint | _(vide)_ | Variable |

### 🔐 Secrets (si nécessaire)

| Variable | Description | Type | Protected | Masked |
|----------|-------------|------|-----------|--------|
| `DATABASE_URL` | URL de la base de test | Variable | ✅ | ✅ |
| `JWT_PASSPHRASE` | Passphrase JWT pour tests | Variable | ✅ | ✅ |

## 📝 Comment ajouter une variable

1. Aller dans **Settings** > **CI/CD**
2. Expander **Variables**
3. Cliquer sur **Add variable**
4. Remplir :
   - **Key** : Nom de la variable (ex: `NODE_VERSION`)
   - **Value** : Valeur (ex: `20`)
   - **Type** : Variable ou File
   - **Environment scope** : All (par défaut)
   - **Protect variable** : Cocher si seulement pour branches protégées
   - **Mask variable** : Cocher si c'est un secret

## 🎯 Variables utiles supplémentaires

### Slack/Discord notifications (optionnel)

```yaml
SLACK_WEBHOOK_URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DISCORD_WEBHOOK_URL: https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### Cache personnalisé

```yaml
CACHE_FALLBACK_KEY: my-project-cache
```

### Timeouts personnalisés

```yaml
PHPUNIT_TIMEOUT: 600  # 10 minutes
LINT_TIMEOUT: 300     # 5 minutes
```

## ⚙️ Modification du `.gitlab-ci.yml` pour utiliser les variables

**Exemple avec timeout configurable :**

```yaml
coverage:backend:
  script:
    - timeout ${PHPUNIT_TIMEOUT:-600} php vendor/bin/phpunit
  variables:
    PHPUNIT_TIMEOUT: 600
```

**Exemple avec options personnalisables :**

```yaml
lint:frontend-backoffice:
  script:
    - pnpm lint ${ESLINT_OPTIONS}
```

## 🔒 Sécurité

⚠️ **Important :**
- Ne jamais commiter de secrets dans `.gitlab-ci.yml`
- Utiliser les variables GitLab pour les données sensibles
- Activer "Mask variable" pour les tokens/passwords
- Activer "Protected" pour les variables de production

## 📚 Documentation GitLab

Pour plus d'informations sur les variables CI/CD :
https://docs.gitlab.com/ee/ci/variables/
