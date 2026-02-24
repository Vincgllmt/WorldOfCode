<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251124145043 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE comment (id INT AUTO_INCREMENT NOT NULL, author_id INT NOT NULL, post_id INT NOT NULL, content LONGTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, INDEX IDX_9474526CF675F31B (author_id), INDEX IDX_9474526C4B89032C (post_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE follows (id INT AUTO_INCREMENT NOT NULL, follower_id INT NOT NULL, followed_id INT NOT NULL, created_at DATETIME NOT NULL, INDEX IDX_4B638A73AC24F853 (follower_id), INDEX IDX_4B638A73D956F010 (followed_id), UNIQUE INDEX UNIQ_4B638A73AC24F853D956F010 (follower_id, followed_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE likes (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, post_id INT NOT NULL, created_at DATETIME NOT NULL, INDEX IDX_49CA4E7DA76ED395 (user_id), INDEX IDX_49CA4E7D4B89032C (post_id), UNIQUE INDEX UNIQ_49CA4E7DA76ED3954B89032C (user_id, post_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE msg_conversation_participants (conversation_id VARCHAR(36) NOT NULL, user_id INT NOT NULL, role VARCHAR(16) DEFAULT \'member\' NOT NULL, joined_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_94416A5E9AC0396 (conversation_id), INDEX IDX_94416A5EA76ED395 (user_id), PRIMARY KEY(conversation_id, user_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE msg_conversations (id VARCHAR(36) NOT NULL, type VARCHAR(16) NOT NULL, title VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE msg_message_reads (message_id VARCHAR(36) NOT NULL, user_id INT NOT NULL, read_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_CE28E200537A1329 (message_id), INDEX IDX_CE28E200A76ED395 (user_id), PRIMARY KEY(message_id, user_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE msg_messages (id VARCHAR(36) NOT NULL, conversation_id VARCHAR(36) NOT NULL, sender_id INT NOT NULL, body LONGTEXT NOT NULL, type VARCHAR(16) DEFAULT \'text\' NOT NULL, created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\', edited_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', deleted_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', INDEX IDX_8A18CF2A9AC0396 (conversation_id), INDEX IDX_8A18CF2AF624B39D (sender_id), INDEX idx_msg_conv_created (conversation_id, created_at), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE post (id INT AUTO_INCREMENT NOT NULL, author_id INT NOT NULL, tech_group_id INT NOT NULL, shared_from_id INT DEFAULT NULL, content LONGTEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME DEFAULT NULL, INDEX IDX_5A8A6C8DF675F31B (author_id), INDEX IDX_5A8A6C8DF85377BC (tech_group_id), INDEX IDX_5A8A6C8D5919D5BC (shared_from_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE reports (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, post_id INT NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, INDEX IDX_F11FA745A76ED395 (user_id), INDEX IDX_F11FA7454B89032C (post_id), UNIQUE INDEX UNIQ_F11FA745A76ED3954B89032C (user_id, post_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE tech_group (id INT AUTO_INCREMENT NOT NULL, creator_id INT DEFAULT NULL, name VARCHAR(255) NOT NULL, description LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, INDEX IDX_BADB255F61220EA6 (creator_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE techgroup_user (tech_group_id INT NOT NULL, user_id INT NOT NULL, INDEX IDX_C33C001EF85377BC (tech_group_id), INDEX IDX_C33C001EA76ED395 (user_id), PRIMARY KEY(tech_group_id, user_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, username VARCHAR(255) NOT NULL, password VARCHAR(255) NOT NULL, firstname VARCHAR(100) NOT NULL, lastname VARCHAR(100) NOT NULL, email VARCHAR(255) NOT NULL, role VARCHAR(255) NOT NULL, creation_date DATETIME NOT NULL, updated_date DATETIME NOT NULL, reset_token VARCHAR(255) DEFAULT NULL, UNIQUE INDEX UNIQ_8D93D649F85E0677 (username), UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526CF675F31B FOREIGN KEY (author_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE comment ADD CONSTRAINT FK_9474526C4B89032C FOREIGN KEY (post_id) REFERENCES post (id)');
        $this->addSql('ALTER TABLE follows ADD CONSTRAINT FK_4B638A73AC24F853 FOREIGN KEY (follower_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE follows ADD CONSTRAINT FK_4B638A73D956F010 FOREIGN KEY (followed_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE likes ADD CONSTRAINT FK_49CA4E7DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE likes ADD CONSTRAINT FK_49CA4E7D4B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_conversation_participants ADD CONSTRAINT FK_94416A5E9AC0396 FOREIGN KEY (conversation_id) REFERENCES msg_conversations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_conversation_participants ADD CONSTRAINT FK_94416A5EA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_message_reads ADD CONSTRAINT FK_CE28E200537A1329 FOREIGN KEY (message_id) REFERENCES msg_messages (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_message_reads ADD CONSTRAINT FK_CE28E200A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_messages ADD CONSTRAINT FK_8A18CF2A9AC0396 FOREIGN KEY (conversation_id) REFERENCES msg_conversations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE msg_messages ADD CONSTRAINT FK_8A18CF2AF624B39D FOREIGN KEY (sender_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8DF675F31B FOREIGN KEY (author_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8DF85377BC FOREIGN KEY (tech_group_id) REFERENCES tech_group (id)');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8D5919D5BC FOREIGN KEY (shared_from_id) REFERENCES post (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE reports ADD CONSTRAINT FK_F11FA745A76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE reports ADD CONSTRAINT FK_F11FA7454B89032C FOREIGN KEY (post_id) REFERENCES post (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE tech_group ADD CONSTRAINT FK_BADB255F61220EA6 FOREIGN KEY (creator_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE techgroup_user ADD CONSTRAINT FK_C33C001EF85377BC FOREIGN KEY (tech_group_id) REFERENCES tech_group (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE techgroup_user ADD CONSTRAINT FK_C33C001EA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE comment DROP FOREIGN KEY FK_9474526CF675F31B');
        $this->addSql('ALTER TABLE comment DROP FOREIGN KEY FK_9474526C4B89032C');
        $this->addSql('ALTER TABLE follows DROP FOREIGN KEY FK_4B638A73AC24F853');
        $this->addSql('ALTER TABLE follows DROP FOREIGN KEY FK_4B638A73D956F010');
        $this->addSql('ALTER TABLE likes DROP FOREIGN KEY FK_49CA4E7DA76ED395');
        $this->addSql('ALTER TABLE likes DROP FOREIGN KEY FK_49CA4E7D4B89032C');
        $this->addSql('ALTER TABLE msg_conversation_participants DROP FOREIGN KEY FK_94416A5E9AC0396');
        $this->addSql('ALTER TABLE msg_conversation_participants DROP FOREIGN KEY FK_94416A5EA76ED395');
        $this->addSql('ALTER TABLE msg_message_reads DROP FOREIGN KEY FK_CE28E200537A1329');
        $this->addSql('ALTER TABLE msg_message_reads DROP FOREIGN KEY FK_CE28E200A76ED395');
        $this->addSql('ALTER TABLE msg_messages DROP FOREIGN KEY FK_8A18CF2A9AC0396');
        $this->addSql('ALTER TABLE msg_messages DROP FOREIGN KEY FK_8A18CF2AF624B39D');
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8DF675F31B');
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8DF85377BC');
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8D5919D5BC');
        $this->addSql('ALTER TABLE reports DROP FOREIGN KEY FK_F11FA745A76ED395');
        $this->addSql('ALTER TABLE reports DROP FOREIGN KEY FK_F11FA7454B89032C');
        $this->addSql('ALTER TABLE tech_group DROP FOREIGN KEY FK_BADB255F61220EA6');
        $this->addSql('ALTER TABLE techgroup_user DROP FOREIGN KEY FK_C33C001EF85377BC');
        $this->addSql('ALTER TABLE techgroup_user DROP FOREIGN KEY FK_C33C001EA76ED395');
        $this->addSql('DROP TABLE comment');
        $this->addSql('DROP TABLE follows');
        $this->addSql('DROP TABLE likes');
        $this->addSql('DROP TABLE msg_conversation_participants');
        $this->addSql('DROP TABLE msg_conversations');
        $this->addSql('DROP TABLE msg_message_reads');
        $this->addSql('DROP TABLE msg_messages');
        $this->addSql('DROP TABLE post');
        $this->addSql('DROP TABLE reports');
        $this->addSql('DROP TABLE tech_group');
        $this->addSql('DROP TABLE techgroup_user');
        $this->addSql('DROP TABLE user');
    }
}
