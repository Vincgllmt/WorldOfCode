<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260904090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Élargit msg_messages.type à VARCHAR(32) : session_counter_proposal (24) et appointment_proposal (20) ne tenaient pas dans VARCHAR(16)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE msg_messages CHANGE type type VARCHAR(32) DEFAULT 'text' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE msg_messages CHANGE type type VARCHAR(16) DEFAULT 'text' NOT NULL");
    }
}
