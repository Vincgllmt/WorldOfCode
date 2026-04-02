<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260402000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Epic 4 — Enrichissement Report : status/claim/resolution, post_id nullable SET NULL';
    }

    public function up(Schema $schema): void
    {
        // Supprimer la contrainte unique sur (user_id, post_id) car post_id peut devenir NULL
        $this->addSql('ALTER TABLE reports DROP INDEX UNIQ_F11FA745A76ED3954B89032C');

        // Rendre post_id nullable + SET NULL
        $this->addSql('ALTER TABLE reports DROP FOREIGN KEY FK_F11FA7454B89032C');
        $this->addSql('ALTER TABLE reports MODIFY post_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE reports ADD CONSTRAINT FK_F11FA7454B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE SET NULL');

        // Ajouter les nouveaux champs de modération
        $this->addSql("ALTER TABLE reports
            ADD status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            ADD claimed_by_id INT DEFAULT NULL,
            ADD claimed_at DATETIME DEFAULT NULL,
            ADD resolved_by_id INT DEFAULT NULL,
            ADD resolved_at DATETIME DEFAULT NULL,
            ADD resolution_note LONGTEXT DEFAULT NULL
        ");

        // FK pour claimed_by et resolved_by
        $this->addSql('ALTER TABLE reports
            ADD CONSTRAINT FK_reports_claimed_by FOREIGN KEY (claimed_by_id) REFERENCES user (id) ON DELETE SET NULL,
            ADD CONSTRAINT FK_reports_resolved_by FOREIGN KEY (resolved_by_id) REFERENCES user (id) ON DELETE SET NULL
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reports DROP FOREIGN KEY FK_reports_claimed_by');
        $this->addSql('ALTER TABLE reports DROP FOREIGN KEY FK_reports_resolved_by');
        $this->addSql('ALTER TABLE reports DROP COLUMN status');
        $this->addSql('ALTER TABLE reports DROP COLUMN claimed_by_id');
        $this->addSql('ALTER TABLE reports DROP COLUMN claimed_at');
        $this->addSql('ALTER TABLE reports DROP COLUMN resolved_by_id');
        $this->addSql('ALTER TABLE reports DROP COLUMN resolved_at');
        $this->addSql('ALTER TABLE reports DROP COLUMN resolution_note');
        $this->addSql('ALTER TABLE reports DROP FOREIGN KEY FK_F11FA7454B89032C');
        $this->addSql('ALTER TABLE reports MODIFY post_id INT NOT NULL');
        $this->addSql('ALTER TABLE reports ADD CONSTRAINT FK_F11FA7454B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE');
    }
}
