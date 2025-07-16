#!/bin/bash

# Installer les dépendances PHP
if [ ! -d "vendor" ]; then
  composer install
fi

exec "$@"
