<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20250204120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow nullable post content to support optional share comments';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE post CHANGE content content LONGTEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE post CHANGE content content LONGTEXT NOT NULL');
    }
}
