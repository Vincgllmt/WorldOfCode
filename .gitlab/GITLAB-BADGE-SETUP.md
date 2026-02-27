# Configuration du Badge de Coverage dans GitLab

Pour afficher le badge de couverture de code sur la page de votre projet GitLab :

## 1. Aller dans les paramètres CI/CD

1. Allez dans votre projet GitLab
2. **Settings** > **CI/CD**
3. Expandez la section **General pipelines**

## 2. Configurer l'extraction du coverage

Dans le champ **Test coverage parsing**, ajoutez la regex suivante :

```
^\s*Lines:\s*\d+\.\d+\%
```

Cette regex correspond au format de sortie de PHPUnit avec coverage :
```
Lines:   85.42%
```

## 3. Badges disponibles

Une fois configuré, vous pouvez afficher ces badges dans votre README :

### Badge de Pipeline Status
```markdown
![Pipeline Status](https://rendu-git.etna-alternance.net/module-9999/activity-53534/group-1056533/badges/main/pipeline.svg)
```

### Badge de Coverage
```markdown
![Coverage](https://rendu-git.etna-alternance.net/module-9999/activity-53534/group-1056533/badges/main/coverage.svg)
```

## 4. Alternative : Badge personnalisé

Si vous préférez un badge plus personnalisé, vous pouvez utiliser :

```markdown
[![Pipeline](https://rendu-git.etna-alternance.net/module-9999/activity-53534/group-1056533/badges/main/pipeline.svg)](https://rendu-git.etna-alternance.net/module-9999/activity-53534/group-1056533/-/pipelines)
[![Coverage](https://rendu-git.etna-alternance.net/module-9999/activity-53534/group-1056533/badges/main/coverage.svg?job=coverage:backend)](https://rendu-git.etna-alternance.net/module-9999/activity-53534/group-1056533/-/graphs/main/charts)
```

## 5. Visualisation dans les Merge Requests

Le coverage sera automatiquement affiché dans :
- La page de la Merge Request
- Les commentaires automatiques (si activé)
- La page des pipelines

## Notes

- La regex est déjà configurée dans `.gitlab-ci.yml`
- Le coverage est calculé uniquement pour le job `coverage:backend`
- Les résultats sont conservés pendant 1 semaine (artifacts)
