<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Code Arena : ajoute une colonne image (optionnelle) aux défis,
 * pour pouvoir illustrer les cartes de la liste.
 */
final class Version20260615144517 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Code Arena : ajoute challenge.image (URL de couverture, optionnelle)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE challenge ADD image VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE challenge DROP COLUMN image');
    }
}
