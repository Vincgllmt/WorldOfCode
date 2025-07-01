# Projet Symfony — Groupe kabol_a `1055170`

### Lancer le serveur :
dans le dossier backend :
```sh
composer install
docker-compose up -d
php bin/console doctrine:migrations:migrate
symfony server:start --port=8090
```

dans le dossier frontend :
```sh
npm install
npm run dev
```

doc :
http://localhost:8090/doc



lancer le facker : 
```sh
bash reset-db.sh
```

## Remarque
Lors de la première inscription, le premier utilisateur créé sera automatiquement avec le rôle ADMIN.

### JWT avec LexikJWT ( commande utile pour la prod)

```sh
composer require lexik/jwt-authentication-bundle "^2.20"
mkdir -p config/jwt
openssl genrsa -out config/jwt/private.pem 4096
openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem
chmod 600 config/jwt/private.pem
chmod 644 config/jwt/public.pem
```

---

## Enregistrement d’un utilisateur :
```sh
curl -X POST http://127.0.0.1:8090/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "devSecret"}'
```


---


### Authentification pour obtenir un token :

```sh
curl -X POST http://127.0.0.1:8090/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username": "1eugenie", "password": "devSecret"}'
```

---
### 🔎 Vérifier le token (route `/me`) :

```sh
curl -X GET http://127.0.0.1:8090/me \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```
---


## 🧪 Requêtes API `/user`

### 📋 Récupérer la liste des utilisateurs :

```sh
curl -X GET http://localhost:8090/user \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

---

### 🔍 Récupérer un utilisateur par ID :

```sh
curl -X GET http://localhost:8090/user/3 \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

---

### ✏️ Modifier un utilisateur (username ou rôle) :

```sh
curl -X PUT http://localhost:8090/user/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "username": "nouveau_nom",
    "role": "ROLE_USER"
  }'
```

---

### 🗑️ Supprimer un utilisateur :

```sh
curl -X DELETE http://localhost:8090/user/1 \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

## 🧪 Requêtes API `/address`

### 📥 Créer une adresse :

```sh
curl -X POST http://localhost:8090/address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "street": "7 rue de la mairie",
    "postalCode": "75003",
    "city": "Paris",
    "country": "France"
  }'
```

---

### 📋 Récupérer toutes les adresses :

```sh
curl -X GET http://localhost:8090/address \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

---

### 🔍 Récupérer une adresse par ID :

```sh
curl -X GET http://localhost:8090/address/3 \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

---

### ✏️ Modifier une adresse :

```sh
curl -X PUT http://localhost:8090/address/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI" \
  -d '{
    "street": "56 rue des champs",
    "city": "Lyon"
  }'
```

---

### 🗑️ Supprimer une adresse :

```sh
curl -X DELETE http://localhost:8090/address/4 \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

---


## 🧾 Accès à la base de données

### Connexion MySQL (via Docker) :
```sh
docker exec -it quest_mysql_8 mysql -uapplication -ppassword quest_web
docker exec -it quest_mysql_8 mysql -uroot -proot

```

Création BDD test :
```sh
CREATE DATABASE quest_web_test;
GRANT ALL PRIVILEGES ON quest_web_test.* TO 'application'@'%';
FLUSH PRIVILEGES;

```

### Voir tous les utilisateurs :
```sql
SELECT * FROM user;
SELECT * FROM address;
```

### Ajouter un utilisateur admin et un utilisateur  manuellement:
```sql
INSERT INTO user (username, password, role, creation_date, updated_date)
VALUES (
  'admin',
  'devSecret',
  'ROLE_ADMIN',
  NOW(),
  NOW()
);
```
