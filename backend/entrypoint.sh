#!/bin/bash
set -ex

# 1) Installer les dépendances uniquement si vendor/ est absent ou vide
if [ ! -f "vendor/autoload.php" ]; then
  composer install --no-interaction --prefer-dist
fi

# 2) Attendre la base de données
echo "Attente de la base de données..."
until php bin/console doctrine:query:sql "SELECT 1" > /dev/null 2>&1; do
  sleep 2
done
echo "Base de données disponible."

# 3) Clear cache
echo "Nettoyage du cache..."
php bin/console cache:clear --env=prod

# 4) Migrations
MIG_COUNT=$(ls -1 migrations | wc -l)

if [ "$MIG_COUNT" -eq 0 ]; then
  echo "Aucune migration trouvée. Génération..."
  php bin/console make:migration --no-interaction || true
fi

MIG_COUNT_AFTER=$(ls -1 migrations | wc -l)

if [ "$MIG_COUNT_AFTER" -gt 0 ]; then
  echo "Exécution des migrations..."
  php bin/console doctrine:migrations:migrate --no-interaction || true
else
  echo "Aucune migration disponible."
fi

# 5) Seed des données de démo : désormais géré par les migrations Doctrine
#    (Version20260616140000 = reset, Version20260616140001 = seed), plus de fixtures.
#    Le seed s'applique donc de façon identique en local, devprod et prod.

# 5b) Création idempotente des indices Elasticsearch
echo "Création des indices Elasticsearch..."
php bin/console app:elastic:create-indices --no-interaction || echo "Avertissement : indices Elasticsearch non créés (cluster indisponible ?)."

# 6) Génération automatique des clés JWT
echo "Vérification des clés JWT..."

if [ ! -f "config/jwt/private.pem" ] || [ ! -f "config/jwt/public.pem" ]; then
  echo "Clés JWT absentes, génération..."
  mkdir -p config/jwt
  chmod 777 config/jwt
  php bin/console lexik:jwt:generate-keypair --skip-if-exists
else
  echo "Clés JWT déjà présentes."
fi

# 7) Premier fetch des actualités tech
echo "Fetch initial des actualités tech..."
php bin/console app:fetch-tech-news || true

# 8) Lancement de la commande passée en argument (symfony serve via docker-compose)
echo "Lancement du serveur..."
exec "$@"
