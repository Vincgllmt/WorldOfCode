<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260617150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'CV Interactif 15.1 : creation tables experience et experience_skill';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE experience (
            id VARCHAR(36) NOT NULL,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            company VARCHAR(255) NOT NULL,
            location VARCHAR(150) DEFAULT NULL,
            start_date VARCHAR(7) NOT NULL,
            end_date VARCHAR(7) DEFAULT NULL,
            description LONGTEXT DEFAULT NULL,
            position INT NOT NULL,
            visibility VARCHAR(20) NOT NULL DEFAULT \'PUBLIC\',
            INDEX IDX_exp_user (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('ALTER TABLE experience ADD CONSTRAINT FK_exp_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');

        $this->addSql('CREATE TABLE experience_skill (
            experience_id VARCHAR(36) NOT NULL,
            skill_id INT NOT NULL,
            PRIMARY KEY(experience_id, skill_id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('ALTER TABLE experience_skill ADD CONSTRAINT FK_es_exp FOREIGN KEY (experience_id) REFERENCES experience (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE experience_skill ADD CONSTRAINT FK_es_skill FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE experience_skill DROP FOREIGN KEY FK_es_exp');
        $this->addSql('ALTER TABLE experience_skill DROP FOREIGN KEY FK_es_skill');
        $this->addSql('DROP TABLE experience_skill');
        $this->addSql('ALTER TABLE experience DROP FOREIGN KEY FK_exp_user');
        $this->addSql('DROP TABLE experience');
    }
}
