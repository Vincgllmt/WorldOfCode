# CI/CD GitLab - World of Code

## 📋 Vue d'ensemble

Cette CI/CD comporte 2 stages principaux :
1. **Lint** - Vérification de la qualité du code (Frontend & Backoffice)
2. **Test** - Exécution des tests avec coverage (Backend Symfony)

## 🔍 Stage 1 : Linter

### Que fait-il ?
- Exécute ESLint sur le **Frontend** (Next.js)
- Exécute ESLint sur le **Backoffice** (Next.js)

### Règles de validation
- ✅ **PASSE** : Aucune erreur (warnings autorisés)
- ⚠️ **PASSE** : Uniquement des warnings
- ❌ **BLOQUE** : Présence d'erreurs ESLint

### Comment corriger les erreurs ?
```bash
# Frontend
cd frontend
npm run lint --fix

# Backoffice
cd backoffice
npm run lint --fix
```

## 🧪 Stage 2 : Coverage

### Que fait-il ?
- Exécute PHPUnit avec Xdebug sur le **Backend** Symfony
- Génère un rapport de couverture de code
- Affiche le pourcentage de couverture dans GitLab

### Règles de validation
- ✅ **PASSE** : Tous les tests passent (warnings/notices autorisés)
- ❌ **BLOQUE** : Tests échoués ou erreurs fatales

### Comment lancer les tests localement ?
```bash
cd backend
composer run test
```

## 🚀 Déclenchement de la CI

La CI s'exécute automatiquement dans les cas suivants :
- Lors de la création d'une **Merge Request**
- Lors d'un push sur les branches **main** ou **develop**

## 📊 Visualisation dans GitLab

### Coverage Badge
Le taux de couverture est automatiquement extrait et affiché dans GitLab grâce à la regex :
```yaml
coverage: '/^\s*Lines:\s*\d+\.\d+\%/'
```

### Artifacts
Les résultats sont conservés pendant **1 semaine** :
- Rapport de coverage (format Cobertura)
- Logs de sortie des tests

## ⚙️ Configuration

### Variables d'environnement (optionnelles)
Vous pouvez configurer ces variables dans GitLab CI/CD Settings :

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `PHP_VERSION` | Version PHP pour les tests | 8.2 |
| `NODE_VERSION` | Version Node.js pour le lint | 20 |

## 🛠️ Maintenance

### Mise à jour des dépendances
Les dépendances sont cachées pour accélérer la CI :
- **Frontend/Backoffice** : Cache basé sur `pnpm-lock.yaml`
- **Backend** : Cache basé sur `composer.lock`

### Désactiver temporairement la CI
Ajoutez `[ci skip]` ou `[skip ci]` dans votre message de commit :
```bash
git commit -m "docs: update README [ci skip]"
```

## 🐛 Résolution de problèmes

### Le linter échoue alors que j'ai corrigé les erreurs
- Assurez-vous que les fichiers `.eslintrc.*` sont présents
- Vérifiez que `npm install` s'exécute correctement

### Les tests de coverage échouent
- Vérifiez que tous les tests passent localement
- Assurez-vous que Xdebug est correctement configuré
- Vérifiez les variables d'environnement dans `phpunit.xml.dist`

### La CI est trop lente
- Vérifiez que le cache fonctionne correctement
- Envisagez de paralléliser les jobs si nécessaire

## 📝 Notes importantes

1. **Warnings vs Erreurs** : La CI fait la distinction entre warnings (autorisés) et erreurs (bloquantes)
2. **allow_failure: false** : Les deux jobs sont bloquants pour les merges
3. **Cache** : Permet d'accélérer les builds en réutilisant les dépendances installées
