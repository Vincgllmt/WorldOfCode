<?php

use Symfony\Component\Dotenv\Dotenv;
use Symfony\Component\Process\Process;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}

// Initialisation de la base de données de test
$console = dirname(__DIR__).'/bin/console';

// Vider le cache Doctrine pour prendre en compte les changements d'entités
(new Process(['php', $console, 'cache:clear', '--env=test']))->run();

// Supprimer et recréer la base SQLite de test
(new Process(['php', $console, 'doctrine:database:drop', '--force', '--if-exists', '--env=test']))->run();
(new Process(['php', $console, 'doctrine:database:create', '--env=test']))->run();
(new Process(['php', $console, 'doctrine:schema:create', '--env=test']))->run();

