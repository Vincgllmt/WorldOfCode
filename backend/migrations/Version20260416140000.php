<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260416140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add login_history table for IP/country-based security notifications';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE login_history (
                id           INT AUTO_INCREMENT NOT NULL,
                user_id      INT NOT NULL,
                ip_hash      VARCHAR(64) NOT NULL,
                country_code VARCHAR(2) DEFAULT NULL,
                logged_at    DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX idx_login_history_user (user_id),
                INDEX idx_login_history_country (user_id, country_code),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');

        $this->addSql('
            ALTER TABLE login_history
                ADD CONSTRAINT fk_login_history_user
                FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE login_history DROP FOREIGN KEY fk_login_history_user');
        $this->addSql('DROP TABLE login_history');
    }
}
