# 🌍 World of Code

Bienvenue dans **World of Code**, un projet collaboratif réalisé par cinq développeurs passionnés.  
Ce projet a pour but de créer un espace numérique où les développeurs et professionnels de l’IT peuvent se connecter, apprendre, collaborer et faire évoluer ensemble le monde du code.

---

## 🚀 Fonctionnalités principales

- ✅ [Interactivité selon le langage de programmation]
- ✅ [News de toutes les technologies]
- ✅ [Portfolio pour les développeurs]

> 🔧 *Ajouter le reste qui sera développé.*

---

## 👥 Équipe de développement

Ce projet a été conçu et développé par :

- **DESAUNAI Eugénie**
- **GUILLEMOT Vincent**
- **JACQUEMIN Théo**
- **JOUINI Hichem**
- **KABOL Amine**

---

## 🛠️ Technologies utilisées

- [Frontend] : **React**
- [Backend] : **PHP, Symfony**
- [Base de données] : **MySQL**
- [Styles] : **Tailwind CSS**
- [Autres outils] : **ESLint**

> ✏️ *Merci d’ajuster la liste si besoin.*

---

## 📦 Installation

Cloner le projet et installer les dépendances :

```bash
git clone git@rendu-git.etna-alternance.net:module-9999/activity-53534/group-1056533.git world-of-code
cd world-of-code
docker compose up -d
```

Il faut ensuite générer les clés JWT pour le backend :

```bash
docker compose exec backend composer install
docker compose exec backend php bin/console lexik:jwt:generate-keypair
docker compose restart
```

## 🧪 Tests

``` Bash
# dans le conteneur backend | local backend/
composer run test
```

## 🔄 CI/CD

Ce projet utilise GitLab CI/CD pour garantir la qualité du code.

### Pipelines automatiques

La CI s'exécute automatiquement sur :
- 🔀 Les **Merge Requests**
- 🌿 Les pushs sur **main** et **dev**

### Jobs de la CI

1. **🔍 Linter** (Frontend + Backoffice)
   - Vérifie la qualité du code avec ESLint
   - ❌ Bloque le merge si erreurs détectées
   - ✅ Accepte les warnings

2. **🧪 Coverage** (Backend Symfony)
   - Exécute les tests PHPUnit avec couverture de code
   - ❌ Bloque le merge si tests échoués
   - ✅ Accepte les warnings/notices

📚 **Documentation complète** : [CI-CD-README.md](.gitlab/CI-CD-README.md)

## 🎨 Fixtures - Données de démonstration

Pour avoir un **bel aperçu du site** avec des données réalistes, nous avons préparé des fixtures complètes !

### 🚀 Chargement rapide

**via docker compose :**
```bash
docker-compose exec backend php bin/console doctrine:fixtures:load --no-interaction
```

**directement dans le docker backend :**
```bash
php bin/console doctrine:fixtures:load --no-interaction
```
### 📊 Ce qui sera créé

- **51 utilisateurs** (1 admin + 10 comptes test + 40 générés)
- **25 groupes technologiques** (React, Vue.js, Symfony, Docker, AWS, etc.)
- **300+ posts** avec contenu technique réaliste
- **2000+ commentaires** engageants
- **4000+ likes** distribués naturellement
- **400+ relations de follow** entre utilisateurs
- **Posts partagés** et interactions variées

### 🔑 Comptes de connexion

**Admin :**
- Username: `admin`
- Password: `admin123`

**Comptes test :**
- Username: `sarah.dev`, `julien_tech`, `marie.code`, etc.
- Password: `password123`

## 📄 Documentation

### Documentation API
L'API est documentée avec Swagger. Vous pouvez y accéder via l'URL suivante une fois le projet lancé :
```
http://localhost:8090/doc
```

### Documentation test unitaires
La documentation des tests unitaires est disponible ici : [Documentation TU](backend/tests/README.md)

## Scripts utiles
Voici quelques scripts utiles pour le développement et la maintenance du projet :
- `composer run test` : Lancer les tests unitaires
- `composer run fixtures` : Charger les fixtures dans la base de données
- `composer run generate-jwt-keys` : Générer les clés JWT pour l'authentification