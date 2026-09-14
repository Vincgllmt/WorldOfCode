<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Code Arena : solutions de référence des jeux (une par langage), synchronisées
 * depuis games/<slug>/solution.<ext>.txt et consultables dans le backoffice.
 */
final class Version20260914162537 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Code Arena : création de la table challenge_solution (solutions de référence par langage)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE challenge_solution (
                id           INT AUTO_INCREMENT NOT NULL,
                challenge_id INT NOT NULL,
                language     VARCHAR(20) NOT NULL,
                code         TEXT NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX UNIQ_challenge_solution_language (challenge_id, language),
                CONSTRAINT fk_challenge_solution_challenge FOREIGN KEY (challenge_id) REFERENCES challenge (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE challenge_solution');
    }
}
