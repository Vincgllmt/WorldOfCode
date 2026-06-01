<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\AbstractAsset;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260430100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add proposed_by column to session_appointment (mentor|junior)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE session_appointment ADD COLUMN proposed_by VARCHAR(10) NOT NULL DEFAULT 'mentor'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE session_appointment DROP COLUMN proposed_by');
    }
}
