<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Profil CV : ajout bio, location, availability, experiences sur User
 * + tables skill, user_skill (pivot), user_link
 */
final class Version20260220150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajout profil CV utilisateur : bio, location, availability, experiences, skills (many-to-many), user_link';
    }

    public function up(Schema $schema): void
    {
        // Nouveaux champs sur la table user
        $this->addSql('ALTER TABLE user ADD bio LONGTEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE user ADD location VARCHAR(150) DEFAULT NULL');
        $this->addSql('ALTER TABLE user ADD availability VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE user ADD experiences JSON DEFAULT NULL');

        // Table skill
        $this->addSql('CREATE TABLE skill (
            id INT AUTO_INCREMENT NOT NULL,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(255) NOT NULL,
            UNIQUE INDEX UNIQ_5E3DE4775E237E06 (name),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Table pivot user_skill
        $this->addSql('CREATE TABLE user_skill (
            user_id INT NOT NULL,
            skill_id INT NOT NULL,
            INDEX IDX_BCFF1F2FA76ED395 (user_id),
            INDEX IDX_BCFF1F2F5585C142 (skill_id),
            PRIMARY KEY(user_id, skill_id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE user_skill ADD CONSTRAINT FK_BCFF1F2FA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_skill ADD CONSTRAINT FK_BCFF1F2F5585C142 FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE');

        // Table user_link
        $this->addSql('CREATE TABLE user_link (
            id INT AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            type VARCHAR(255) NOT NULL,
            url VARCHAR(500) NOT NULL,
            INDEX IDX_6E84A210A76ED395 (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE user_link ADD CONSTRAINT FK_6E84A210A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_skill DROP FOREIGN KEY FK_BCFF1F2FA76ED395');
        $this->addSql('ALTER TABLE user_skill DROP FOREIGN KEY FK_BCFF1F2F5585C142');
        $this->addSql('ALTER TABLE user_link DROP FOREIGN KEY FK_6E84A210A76ED395');

        $this->addSql('DROP TABLE user_skill');
        $this->addSql('DROP TABLE user_link');
        $this->addSql('DROP TABLE skill');

        $this->addSql('ALTER TABLE user DROP bio');
        $this->addSql('ALTER TABLE user DROP location');
        $this->addSql('ALTER TABLE user DROP availability');
        $this->addSql('ALTER TABLE user DROP experiences');
    }
}
