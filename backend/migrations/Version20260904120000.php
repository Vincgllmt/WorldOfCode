<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260904120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute payment.session_id (nullable) pour tracer un don rattaché à une session de mentorat';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payment ADD session_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE payment ADD CONSTRAINT FK_payment_session FOREIGN KEY (session_id) REFERENCES mentoring_session (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_payment_session ON payment (session_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE payment DROP FOREIGN KEY FK_payment_session');
        $this->addSql('DROP INDEX IDX_payment_session ON payment');
        $this->addSql('ALTER TABLE payment DROP session_id');
    }
}
