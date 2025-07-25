#!/bin/bash

if [ ! -d "vendor" ]; then
  composer install
fi

until php bin/console doctrine:query:sql "SELECT 1" > /dev/null 2>&1; do
  echo "⏳ En attente de la base de données..."
  sleep 2
done

php bin/console doctrine:migrations:migrate --no-interaction

php bin/console doctrine:fixtures:load --no-interaction

php -S 0.0.0.0:8090 -t public