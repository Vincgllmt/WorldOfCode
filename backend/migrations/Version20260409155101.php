<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260409155101 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create payment table for Stripe integration';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<SQL
            CREATE TABLE payment (
                id INT AUTO_INCREMENT NOT NULL,
                payer_id INT NOT NULL,
                mentor_id INT NOT NULL,
                amount INT NOT NULL,
                currency VARCHAR(3) NOT NULL,
                status VARCHAR(20) NOT NULL,
                stripe_payment_intent_id VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                UNIQUE INDEX UNIQ_6D28840D1A9504DE (stripe_payment_intent_id),
                INDEX IDX_6D28840D8A3C68E0 (payer_id),
                INDEX IDX_6D28840DF09E2198 (mentor_id),
                PRIMARY KEY(id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);

        $this->addSql(<<<SQL
            ALTER TABLE payment
                ADD CONSTRAINT FK_payment_payer  FOREIGN KEY (payer_id)  REFERENCES user (id),
                ADD CONSTRAINT FK_payment_mentor FOREIGN KEY (mentor_id) REFERENCES user (id)
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payment DROP FOREIGN KEY FK_payment_payer');
        $this->addSql('ALTER TABLE payment DROP FOREIGN KEY FK_payment_mentor');
        $this->addSql('DROP TABLE payment');
    }
}
