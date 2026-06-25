<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260614110000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Spécialités mentor : remplacement Skill par TechGroup dans mentor_profile_specialties';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS mentor_profile_specialties');
        $this->addSql('
            CREATE TABLE mentor_profile_specialties (
                mentor_profile_id INT NOT NULL,
                tech_group_id     INT NOT NULL,
                PRIMARY KEY (mentor_profile_id, tech_group_id),
                CONSTRAINT fk_mps_profile  FOREIGN KEY (mentor_profile_id) REFERENCES mentor_profile (id) ON DELETE CASCADE,
                CONSTRAINT fk_mps_group    FOREIGN KEY (tech_group_id)     REFERENCES tech_group (id)     ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS mentor_profile_specialties');
        $this->addSql('
            CREATE TABLE mentor_profile_specialties (
                mentor_profile_id INT NOT NULL,
                skill_id          INT NOT NULL,
                PRIMARY KEY (mentor_profile_id, skill_id),
                CONSTRAINT fk_mps_profile_r FOREIGN KEY (mentor_profile_id) REFERENCES mentor_profile (id) ON DELETE CASCADE,
                CONSTRAINT fk_mps_skill     FOREIGN KEY (skill_id)          REFERENCES skill (id)          ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');
    }
}
