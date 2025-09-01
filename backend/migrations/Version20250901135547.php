<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250901135547 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE msg_conversation_participants (conversation_id VARCHAR(36) NOT NULL, user_id INT NOT NULL, role VARCHAR(16) DEFAULT \'member\' NOT NULL, joined_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_94416A5E9AC0396 (conversation_id), INDEX IDX_94416A5EA76ED395 (user_id), PRIMARY KEY(conversation_id, user_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE msg_conversations (id VARCHAR(36) NOT NULL, type VARCHAR(16) NOT NULL, title VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE msg_messages (id VARCHAR(36) NOT NULL, conversation_id VARCHAR(36) NOT NULL, sender_id INT NOT NULL, body LONGTEXT NOT NULL, type VARCHAR(16) DEFAULT \'text\' NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', edited_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', deleted_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_8A18CF2A9AC0396 (conversation_id), INDEX IDX_8A18CF2AF624B39D (sender_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE msg_conversation_participants ADD CONSTRAINT FK_94416A5E9AC0396 FOREIGN KEY (conversation_id) REFERENCES msg_conversations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_conversation_participants ADD CONSTRAINT FK_94416A5EA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_messages ADD CONSTRAINT FK_8A18CF2A9AC0396 FOREIGN KEY (conversation_id) REFERENCES msg_conversations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_messages ADD CONSTRAINT FK_8A18CF2AF624B39D FOREIGN KEY (sender_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE msg_conversation_participants DROP FOREIGN KEY FK_94416A5E9AC0396');
        $this->addSql('ALTER TABLE msg_conversation_participants DROP FOREIGN KEY FK_94416A5EA76ED395');
        $this->addSql('ALTER TABLE msg_messages DROP FOREIGN KEY FK_8A18CF2A9AC0396');
        $this->addSql('ALTER TABLE msg_messages DROP FOREIGN KEY FK_8A18CF2AF624B39D');
        $this->addSql('DROP TABLE msg_conversation_participants');
        $this->addSql('DROP TABLE msg_conversations');
        $this->addSql('DROP TABLE msg_messages');
    }
}
