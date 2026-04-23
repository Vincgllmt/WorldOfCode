<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260416130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace trusted_ips (IP-based) with trusted_device table (token-based)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE `user` DROP COLUMN trusted_ips');

        $this->addSql('
            CREATE TABLE trusted_device (
                id          INT AUTO_INCREMENT NOT NULL,
                user_id     INT NOT NULL,
                token_hash  VARCHAR(64) NOT NULL,
                expires_at  DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                created_at  DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                user_agent  VARCHAR(255) DEFAULT NULL,
                INDEX idx_trusted_device_user (user_id),
                INDEX idx_trusted_device_hash (token_hash),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            ALTER TABLE trusted_device
                ADD CONSTRAINT fk_trusted_device_user
                FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE trusted_device DROP FOREIGN KEY fk_trusted_device_user');
        $this->addSql('DROP TABLE trusted_device');
        $this->addSql('ALTER TABLE `user` ADD trusted_ips JSON DEFAULT NULL');
    }
}
