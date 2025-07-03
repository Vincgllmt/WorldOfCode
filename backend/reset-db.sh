#!/bin/bash

set -e  # Stoppe le script si une commande échoue

echo "🔴 Suppression de la base de données..."
php bin/console doctrine:database:drop --force

echo "🟡 Création de la base de données..."
php bin/console doctrine:database:create

echo "🟢 Mise à jour du schéma..."
php bin/console doctrine:schema:update --force

echo "🔵 Chargement des fixtures..."
php bin/console doctrine:fixtures:load --no-interaction

echo "✅ Base de données réinitialisée avec succès."
