<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260319120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove is_auto_detected column from tech_watch_source';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE tech_watch_source DROP COLUMN is_auto_detected');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE tech_watch_source ADD is_auto_detected TINYINT(1) NOT NULL DEFAULT 0');
    }
}
