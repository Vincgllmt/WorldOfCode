<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260306150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create tech_watch_source and tech_watch_item tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE tech_watch_source (
            id INT AUTO_INCREMENT NOT NULL,
            tech_group_id INT NOT NULL,
            feed_url VARCHAR(500) NOT NULL,
            name VARCHAR(255) NOT NULL,
            is_auto_detected TINYINT(1) NOT NULL DEFAULT 0,
            last_fetched_at DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL,
            INDEX IDX_TWS_GROUP (tech_group_id),
            PRIMARY KEY(id),
            CONSTRAINT FK_TWS_GROUP FOREIGN KEY (tech_group_id) REFERENCES tech_group (id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('CREATE TABLE tech_watch_item (
            id INT AUTO_INCREMENT NOT NULL,
            source_id INT NOT NULL,
            title VARCHAR(500) NOT NULL,
            description LONGTEXT DEFAULT NULL,
            url VARCHAR(500) NOT NULL,
            image_url VARCHAR(1000) DEFAULT NULL,
            published_at DATETIME DEFAULT NULL,
            fetched_at DATETIME NOT NULL,
            INDEX IDX_TWI_SOURCE (source_id),
            UNIQUE INDEX unique_item_url (url),
            PRIMARY KEY(id),
            CONSTRAINT FK_TWI_SOURCE FOREIGN KEY (source_id) REFERENCES tech_watch_source (id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE tech_watch_item');
        $this->addSql('DROP TABLE tech_watch_source');
    }
}
