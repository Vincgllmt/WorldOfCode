<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260617170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'CV Interactif 15.4 : ajout cv_public_token sur user';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD cv_public_token VARCHAR(36) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_cv_token ON `user` (cv_public_token)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_cv_token ON `user`');
        $this->addSql('ALTER TABLE `user` DROP cv_public_token');
    }
}
