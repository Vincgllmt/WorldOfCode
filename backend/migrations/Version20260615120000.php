<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * SEC-9 : ajoute reset_token_expires_at pour faire expirer les tokens de reset password.
 */
final class Version20260615120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add reset_token_expires_at column to user table (SEC-9: reset token expiration)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` ADD reset_token_expires_at DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP COLUMN reset_token_expires_at');
    }
}
