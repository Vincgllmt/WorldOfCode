#!/bin/bash
set -e

# 1) Dépendances PHP (le volume monté en dev peut masquer le vendor de l'image)
composer install --no-interaction --prefer-dist

# 2) Attente de la base de données partagée (projet_web)
echo "Attente de la base de données..."
until php bin/console dbal:run-sql "SELECT 1" > /dev/null 2>&1; do
  sleep 2
done
echo "Base de données disponible."

# 3) Attente de la clé publique JWT.
#    Code Arena ne génère PAS les clés : elles sont produites par le backend
#    et partagées via le volume Docker jwt_keys.
echo "Attente de la clé publique JWT..."
until [ -f config/jwt/public.pem ]; do
  sleep 2
done
echo "Clé publique JWT disponible."

# 4) Nettoyage du cache
php bin/console cache:clear --no-interaction

# 5) Synchronisation des jeux (games/<slug>/ -> base). Idempotent ; non bloquant.
php bin/console app:arena:sync || echo "Avertissement : sync des jeux ignorée (tables absentes ?)."

# 6) Démarrage du serveur (commande passée par CMD / docker-compose)
exec "$@"
