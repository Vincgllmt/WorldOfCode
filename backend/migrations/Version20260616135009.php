<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Code Arena : ajoute le referee (validateur) à un défi.
 * Le referee est du code exécuté dans Piston ; il juge la sortie du joueur
 * et produit la trace de replay. Stocké par défi → backend générique.
 */
final class Version20260616135009 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Code Arena : ajoute challenge.referee_code et challenge.referee_language';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE challenge ADD referee_code LONGTEXT DEFAULT NULL, ADD referee_language VARCHAR(20) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE challenge DROP COLUMN referee_code, DROP COLUMN referee_language');
    }
}
