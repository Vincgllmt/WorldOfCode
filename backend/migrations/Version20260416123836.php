<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260416123836 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add trusted_ips column to user table for 2FA IP-based bypass';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD trusted_ips JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP COLUMN trusted_ips');
    }
}
