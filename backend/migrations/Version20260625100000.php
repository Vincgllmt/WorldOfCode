<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260625100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'CV Interactif 19.1 : ajout cvLayout et cvAccentColor sur user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE `user` ADD cv_layout VARCHAR(30) DEFAULT 'sidebar-left', ADD cv_accent_color VARCHAR(7) DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP COLUMN cv_layout, DROP COLUMN cv_accent_color');
    }
}
