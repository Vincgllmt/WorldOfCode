<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260319140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add two_factor_code and two_factor_expires_at columns to user table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user ADD two_factor_code VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE user ADD two_factor_expires_at DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user DROP COLUMN two_factor_code');
        $this->addSql('ALTER TABLE user DROP COLUMN two_factor_expires_at');
    }
}
