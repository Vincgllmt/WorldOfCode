<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260427170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow NULL on mentoring_rating.score (placeholder ratings before user submits)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentoring_rating MODIFY score SMALLINT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentoring_rating MODIFY score SMALLINT NOT NULL');
    }
}
