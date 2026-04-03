<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create feedback table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE feedback (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            overall_satisfaction SMALLINT NOT NULL,
            ease_of_use SMALLINT NOT NULL,
            content_quality SMALLINT NOT NULL,
            messaging_rating SMALLINT DEFAULT NULL,
            groups_rating SMALLINT DEFAULT NULL,
            mentoring_rating SMALLINT DEFAULT NULL,
            nps_score SMALLINT NOT NULL,
            comment LONGTEXT DEFAULT NULL,
            status VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX IDX_D2294458A76ED395 (user_id),
            PRIMARY KEY(id),
            CONSTRAINT FK_D2294458A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE feedback');
    }
}
