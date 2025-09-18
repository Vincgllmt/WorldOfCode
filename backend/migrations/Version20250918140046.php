<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250918140046 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post ADD shared_from_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8D5919D5BC FOREIGN KEY (shared_from_id) REFERENCES post (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_5A8A6C8D5919D5BC ON post (shared_from_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8D5919D5BC');
        $this->addSql('DROP INDEX IDX_5A8A6C8D5919D5BC ON post');
        $this->addSql('ALTER TABLE post DROP shared_from_id');
    }
}
