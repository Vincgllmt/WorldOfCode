<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260409155100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add FULLTEXT index on msg_messages.body for message search';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE FULLTEXT INDEX idx_msg_body_fulltext ON msg_messages (body)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_msg_body_fulltext ON msg_messages');
    }
}
