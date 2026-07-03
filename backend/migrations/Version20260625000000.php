<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260625000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Stripe Connect : ajoute stripe_account_id et stripe_transfers_enabled sur mentor_profile';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentor_profile ADD stripe_account_id VARCHAR(255) DEFAULT NULL, ADD stripe_transfers_enabled TINYINT(1) NOT NULL DEFAULT 0');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_STRIPE_ACCOUNT ON mentor_profile (stripe_account_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_STRIPE_ACCOUNT ON mentor_profile');
        $this->addSql('ALTER TABLE mentor_profile DROP COLUMN stripe_account_id, DROP COLUMN stripe_transfers_enabled');
    }
}
