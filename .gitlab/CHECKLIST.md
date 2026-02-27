# ✅ Checklist de validation CI/CD

## Avant de pusher sur GitLab

### 🔍 Vérifications locales

- [ ] Les tests backend passent
  ```bash
  cd backend && composer run test
  ```

- [ ] Le linter frontend passe (ou seulement warnings)
  ```bash
  cd frontend && pnpm lint
  ```

- [ ] Le linter backoffice passe (ou seulement warnings)
  ```bash
  cd backoffice && pnpm lint
  ```

- [ ] Le script de test CI local passe
  ```bash
  ./test-ci-local.sh
  ```

### 📝 Avant la première utilisation

- [ ] Vérifier que `.gitlab-ci.yml` est bien à la racine du projet
- [ ] Vérifier que GitLab CI/CD est activé dans le projet
- [ ] Configurer les runners GitLab (si nécessaire)
- [ ] Tester avec une branche de test

### 🎯 Première MR (Merge Request)

- [ ] Créer une branche de test
  ```bash
  git checkout -b test/ci-validation
  ```

- [ ] Faire un changement mineur (ex: mise à jour README)
- [ ] Pusher et créer une MR
- [ ] Vérifier que les 2 jobs s'exécutent correctement
- [ ] Vérifier que le coverage s'affiche

### 🔧 Configuration optionnelle GitLab

- [ ] Activer "Pipelines must succeed" dans Settings > Merge Requests
- [ ] Configurer la regex de coverage dans Settings > CI/CD
  ```
  ^\s*Lines:\s*\d+\.\d+\%
  ```
- [ ] Ajouter les badges dans le README principal

## 📊 Validation des jobs

### Job Linter

**Doit passer avec :**
- ✅ Aucune erreur ESLint
- ✅ Warnings uniquement (acceptés)
- ✅ Exit code 0

**Doit échouer avec :**
- ❌ Erreurs ESLint
- ❌ Erreur de configuration
- ❌ Exit code 1 (avec erreurs) ou 2

### Job Coverage

**Doit passer avec :**
- ✅ Tous les tests passent
- ✅ Coverage généré
- ✅ Warnings/notices PHP (acceptés)

**Doit échouer avec :**
- ❌ Tests échoués
- ❌ Erreurs PHP fatales
- ❌ Exceptions non gérées

## 🚀 Mise en production

- [ ] Tester sur plusieurs branches
- [ ] Vérifier les performances (temps d'exécution)
- [ ] Documenter pour l'équipe
- [ ] Former les membres de l'équipe

## 📝 Notes

Date de mise en place : _________________

Validé par : _________________

Problèmes rencontrés : _________________

Solutions apportées : _________________
