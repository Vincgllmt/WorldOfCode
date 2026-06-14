<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajout des champs de bannissement sur User (is_banned, banned_at, banned_reason)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE user ADD is_banned TINYINT(1) NOT NULL DEFAULT 0");
        $this->addSql("ALTER TABLE user ADD banned_at DATETIME DEFAULT NULL");
        $this->addSql("ALTER TABLE user ADD banned_reason LONGTEXT DEFAULT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE user DROP is_banned, DROP banned_at, DROP banned_reason");
    }
}
