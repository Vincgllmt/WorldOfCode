<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250613084944 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE techgroup_user (tech_group_id INT NOT NULL, user_id INT NOT NULL, INDEX IDX_C33C001EF85377BC (tech_group_id), INDEX IDX_C33C001EA76ED395 (user_id), PRIMARY KEY(tech_group_id, user_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE techgroup_user ADD CONSTRAINT FK_C33C001EF85377BC FOREIGN KEY (tech_group_id) REFERENCES tech_group (id) ON DELETE CASCADE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE techgroup_user ADD CONSTRAINT FK_C33C001EA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE techgroup_user DROP FOREIGN KEY FK_C33C001EF85377BC
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE techgroup_user DROP FOREIGN KEY FK_C33C001EA76ED395
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE techgroup_user
        SQL);
    }
}
