<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260403000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create group_suggestion table for Epic 7 - Group Suggestions';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE group_suggestion (
            id INT AUTO_INCREMENT NOT NULL,
            suggested_by_id INT NOT NULL,
            claimed_by_id INT DEFAULT NULL,
            approved_by_id INT DEFAULT NULL,
            rejected_by_id INT DEFAULT NULL,
            name VARCHAR(255) NOT NULL,
            description LONGTEXT DEFAULT NULL,
            rss_feed_url VARCHAR(500) DEFAULT NULL,
            status VARCHAR(50) NOT NULL,
            claimed_at DATETIME DEFAULT NULL,
            approved_at DATETIME DEFAULT NULL,
            rejected_at DATETIME DEFAULT NULL,
            resolution_note LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL,
            INDEX IDX_group_suggestion_suggested_by (suggested_by_id),
            INDEX IDX_group_suggestion_claimed_by (claimed_by_id),
            INDEX IDX_group_suggestion_status (status),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE group_suggestion
            ADD CONSTRAINT FK_group_suggestion_suggested_by
                FOREIGN KEY (suggested_by_id) REFERENCES user (id) ON DELETE CASCADE');

        $this->addSql('ALTER TABLE group_suggestion
            ADD CONSTRAINT FK_group_suggestion_claimed_by
                FOREIGN KEY (claimed_by_id) REFERENCES user (id) ON DELETE SET NULL');

        $this->addSql('ALTER TABLE group_suggestion
            ADD CONSTRAINT FK_group_suggestion_approved_by
                FOREIGN KEY (approved_by_id) REFERENCES user (id) ON DELETE SET NULL');

        $this->addSql('ALTER TABLE group_suggestion
            ADD CONSTRAINT FK_group_suggestion_rejected_by
                FOREIGN KEY (rejected_by_id) REFERENCES user (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE group_suggestion DROP FOREIGN KEY FK_group_suggestion_suggested_by');
        $this->addSql('ALTER TABLE group_suggestion DROP FOREIGN KEY FK_group_suggestion_claimed_by');
        $this->addSql('ALTER TABLE group_suggestion DROP FOREIGN KEY FK_group_suggestion_approved_by');
        $this->addSql('ALTER TABLE group_suggestion DROP FOREIGN KEY FK_group_suggestion_rejected_by');
        $this->addSql('DROP TABLE group_suggestion');
    }
}
