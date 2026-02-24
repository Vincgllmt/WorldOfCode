#!/bin/bash
set -e

echo "→ Attente de la base de données..."
until php bin/console doctrine:query:sql "SELECT 1" > /dev/null 2>&1; do
  sleep 2
done
echo "DB OK"

echo "→ Vérification des clés JWT..."
if [ ! -f config/jwt/private.pem ] || [ ! -f config/jwt/public.pem ]; then
  echo "→ Génération des clés JWT..."
  php bin/console lexik:jwt:generate-keypair --env=prod --no-interaction
else
  echo "→ Clés JWT déjà présentes."
fi

echo "→ Clear cache (prod)..."
php bin/console cache:clear --env=prod --no-interaction

echo "→ Cache warmup..."
php bin/console cache:warmup --env=prod --no-interaction

echo "→ Lancement PHP-FPM"
exec "$@"
