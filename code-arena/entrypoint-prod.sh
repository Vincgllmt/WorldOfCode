#!/bin/bash
set -e

echo "→ Attente de la base de données..."
until php bin/console dbal:run-sql "SELECT 1" > /dev/null 2>&1; do
  sleep 2
done
echo "DB OK"

# Code Arena ne génère PAS les clés : il attend la clé publique partagée par le backend.
echo "→ Attente de la clé publique JWT..."
until [ -f config/jwt/public.pem ]; do
  sleep 2
done
echo "JWT OK"

echo "→ Clear cache (prod)..."
php bin/console cache:clear --env=prod --no-interaction

echo "→ Cache warmup..."
php bin/console cache:warmup --env=prod --no-interaction

echo "→ Fix permissions (var)..."
chown -R www-data:www-data var

echo "→ Lancement PHP-FPM"
exec "$@"
