<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create session_note table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE session_note (
                id INT AUTO_INCREMENT NOT NULL,
                session_id INT NOT NULL,
                author_id INT NOT NULL,
                content LONGTEXT NOT NULL,
                type VARCHAR(20) NOT NULL DEFAULT \'note\',
                created_at DATETIME NOT NULL,
                INDEX IDX_session (session_id),
                INDEX IDX_author (author_id),
                PRIMARY KEY (id),
                CONSTRAINT FK_session_note_session FOREIGN KEY (session_id) REFERENCES mentoring_session (id) ON DELETE CASCADE,
                CONSTRAINT FK_session_note_author FOREIGN KEY (author_id) REFERENCES user (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE session_note');
    }
}
