<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260617180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'CV Interactif 15.5 : creation table profile_highlight';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE profile_highlight (
            id VARCHAR(36) NOT NULL,
            user_id INT NOT NULL,
            post_id INT NOT NULL,
            position INT NOT NULL,
            visibility VARCHAR(20) NOT NULL DEFAULT \'PUBLIC\',
            INDEX IDX_ph_user (user_id),
            INDEX IDX_ph_post (post_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('ALTER TABLE profile_highlight ADD CONSTRAINT FK_ph_user FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE profile_highlight ADD CONSTRAINT FK_ph_post FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE profile_highlight DROP FOREIGN KEY FK_ph_user');
        $this->addSql('ALTER TABLE profile_highlight DROP FOREIGN KEY FK_ph_post');
        $this->addSql('DROP TABLE profile_highlight');
    }
}
