<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260429214739 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create session_appointment table for scheduled meetings within a session';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE session_appointment (
            id INT AUTO_INCREMENT NOT NULL,
            session_id INT NOT NULL,
            scheduled_at DATETIME NOT NULL,
            format VARCHAR(20) NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX IDX_SA_SESSION (session_id),
            PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE session_appointment
            ADD CONSTRAINT FK_SA_SESSION
            FOREIGN KEY (session_id) REFERENCES mentoring_session (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE session_appointment DROP FOREIGN KEY FK_SA_SESSION');
        $this->addSql('DROP TABLE session_appointment');
    }
}
