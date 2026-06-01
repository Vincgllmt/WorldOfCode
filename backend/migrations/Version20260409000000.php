<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260409000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make post.tech_group_id nullable to allow posts without a group';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE post MODIFY tech_group_id INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('UPDATE post SET tech_group_id = (SELECT id FROM tech_group LIMIT 1) WHERE tech_group_id IS NULL');
        $this->addSql('ALTER TABLE post MODIFY tech_group_id INT NOT NULL');
    }
}
