<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260429195938 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow multiple sessions per mentoring request (OneToOne → ManyToOne)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentoring_session DROP FOREIGN KEY FK_4B4BBF2B427EB8A5');
        $this->addSql('DROP INDEX UNIQ_4B4BBF2B427EB8A5 ON mentoring_session');
        $this->addSql('ALTER TABLE mentoring_session ADD CONSTRAINT FK_4B4BBF2B427EB8A5 FOREIGN KEY (request_id) REFERENCES mentoring_request (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentoring_session DROP FOREIGN KEY FK_4B4BBF2B427EB8A5');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_4B4BBF2B427EB8A5 ON mentoring_session (request_id)');
        $this->addSql('ALTER TABLE mentoring_session ADD CONSTRAINT FK_4B4BBF2B427EB8A5 FOREIGN KEY (request_id) REFERENCES mentoring_request (id) ON DELETE SET NULL');
    }
}
