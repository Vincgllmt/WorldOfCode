#!/bin/bash

if [ ! -d "vendor" ]; then
  composer install
fi

until php bin/console doctrine:query:sql "SELECT 1" > /dev/null 2>&1; do
  echo "⏳ En attente de la base de données..."
  sleep 2
done

php bin/console doctrine:migrations:migrate --no-interaction


ROW_COUNT=$(php bin/console doctrine:query:sql "SELECT COUNT(*) FROM user;" | grep -Eo '[0-9]+')

if [ "$ROW_COUNT" -eq 0 ]; then
  echo "📦 Base vide — chargement des fixtures..."
  php bin/console doctrine:fixtures:load --no-interaction
else
  echo "✅ Base déjà initialisée — pas de fixtures chargées."
fi

php -S 0.0.0.0:8090 -t public