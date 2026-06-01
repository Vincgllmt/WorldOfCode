<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260429220803 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add status column to session_appointment (pending|confirmed)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE session_appointment ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE session_appointment DROP COLUMN status');
    }
}
