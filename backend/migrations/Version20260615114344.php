<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Code Arena : tables challenge, challenge_test, submission, badge, user_badge.
 * Schéma possédé par le backend ; l'application code-arena/ se contente de lire/écrire.
 */
final class Version20260615114344 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Code Arena : création des tables challenge, challenge_test, submission, badge, user_badge';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('
            CREATE TABLE challenge (
                id          INT AUTO_INCREMENT NOT NULL,
                slug        VARCHAR(100) NOT NULL,
                title       VARCHAR(255) NOT NULL,
                statement   TEXT NOT NULL,
                difficulty  VARCHAR(20) NOT NULL,
                languages   JSON NOT NULL,
                max_score   INT NOT NULL DEFAULT 100,
                created_at  DATETIME NOT NULL,
                updated_at  DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE INDEX UNIQ_challenge_slug (slug)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE challenge_test (
                id              INT AUTO_INCREMENT NOT NULL,
                challenge_id    INT NOT NULL,
                stdin           TEXT DEFAULT NULL,
                expected_output TEXT NOT NULL,
                is_public       TINYINT(1) NOT NULL DEFAULT 0,
                weight          INT NOT NULL DEFAULT 1,
                position        INT NOT NULL DEFAULT 0,
                PRIMARY KEY (id),
                INDEX IDX_challenge_test_challenge (challenge_id),
                CONSTRAINT fk_challenge_test_challenge FOREIGN KEY (challenge_id) REFERENCES challenge (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE submission (
                id           INT AUTO_INCREMENT NOT NULL,
                challenge_id INT NOT NULL,
                user_id      INT NOT NULL,
                language     VARCHAR(20) NOT NULL,
                code         MEDIUMTEXT NOT NULL,
                status       VARCHAR(20) NOT NULL DEFAULT \'pending\',
                score        INT NOT NULL DEFAULT 0,
                tests_passed INT NOT NULL DEFAULT 0,
                tests_total  INT NOT NULL DEFAULT 0,
                created_at   DATETIME NOT NULL,
                PRIMARY KEY (id),
                INDEX IDX_submission_challenge (challenge_id),
                INDEX IDX_submission_user (user_id),
                CONSTRAINT fk_submission_challenge FOREIGN KEY (challenge_id) REFERENCES challenge (id) ON DELETE CASCADE,
                CONSTRAINT fk_submission_user      FOREIGN KEY (user_id)      REFERENCES user (id)      ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE badge (
                id           INT AUTO_INCREMENT NOT NULL,
                challenge_id INT NOT NULL,
                code         VARCHAR(50) NOT NULL,
                name         VARCHAR(100) NOT NULL,
                description  VARCHAR(255) DEFAULT NULL,
                icon         VARCHAR(255) DEFAULT NULL,
                created_at   DATETIME NOT NULL,
                PRIMARY KEY (id),
                INDEX IDX_badge_challenge (challenge_id),
                UNIQUE INDEX UNIQ_badge_challenge_code (challenge_id, code),
                CONSTRAINT fk_badge_challenge FOREIGN KEY (challenge_id) REFERENCES challenge (id) ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        $this->addSql('
            CREATE TABLE user_badge (
                id         INT AUTO_INCREMENT NOT NULL,
                user_id    INT NOT NULL,
                badge_id   INT NOT NULL,
                awarded_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                INDEX IDX_user_badge_badge (badge_id),
                UNIQUE INDEX UNIQ_user_badge_user_badge (user_id, badge_id),
                CONSTRAINT fk_user_badge_badge FOREIGN KEY (badge_id) REFERENCES badge (id) ON DELETE CASCADE,
                CONSTRAINT fk_user_badge_user  FOREIGN KEY (user_id)  REFERENCES user (id)  ON DELETE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS user_badge');
        $this->addSql('DROP TABLE IF EXISTS badge');
        $this->addSql('DROP TABLE IF EXISTS submission');
        $this->addSql('DROP TABLE IF EXISTS challenge_test');
        $this->addSql('DROP TABLE IF EXISTS challenge');
    }
}
