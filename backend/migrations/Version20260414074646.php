<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260414074646 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE mentor_profile (id INT AUTO_INCREMENT NOT NULL, user_id INT NOT NULL, is_available TINYINT(1) NOT NULL, teaching_style VARCHAR(255) DEFAULT NULL, max_active_mentees INT NOT NULL, mentor_bio LONGTEXT DEFAULT NULL, average_rating DOUBLE PRECISION DEFAULT NULL, total_sessions INT NOT NULL, reliability_rate DOUBLE PRECISION DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_185C512AA76ED395 (user_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE mentor_profile_specialties (mentor_profile_id INT NOT NULL, skill_id INT NOT NULL, INDEX IDX_E0BC519C92E677D4 (mentor_profile_id), INDEX IDX_E0BC519C5585C142 (skill_id), PRIMARY KEY(mentor_profile_id, skill_id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE mentoring_pin (id INT AUTO_INCREMENT NOT NULL, mentor_id INT NOT NULL, request_id INT NOT NULL, pinned_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, is_active TINYINT(1) NOT NULL, INDEX IDX_B89D80AADB403044 (mentor_id), INDEX IDX_B89D80AA427EB8A5 (request_id), UNIQUE INDEX uniq_mentor_request (mentor_id, request_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE mentoring_rating (id INT AUTO_INCREMENT NOT NULL, session_id INT NOT NULL, rater_id INT NOT NULL, ratee_id INT NOT NULL, score SMALLINT NOT NULL, comment LONGTEXT DEFAULT NULL, submitted_at DATETIME DEFAULT NULL, is_visible TINYINT(1) NOT NULL, created_at DATETIME NOT NULL, INDEX IDX_B32169E2613FECDF (session_id), INDEX IDX_B32169E23FC1CD0A (rater_id), INDEX IDX_B32169E2F20FA22C (ratee_id), UNIQUE INDEX uniq_session_rater (session_id, rater_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE mentoring_request (id INT AUTO_INCREMENT NOT NULL, junior_id INT NOT NULL, target_mentor_id INT DEFAULT NULL, type VARCHAR(255) NOT NULL, status VARCHAR(255) NOT NULL, title VARCHAR(255) NOT NULL, tech_stack VARCHAR(100) NOT NULL, blocked_since VARCHAR(255) DEFAULT NULL, already_tried LONGTEXT DEFAULT NULL, expected_behavior LONGTEXT DEFAULT NULL, observed_behavior LONGTEXT DEFAULT NULL, description LONGTEXT NOT NULL, is_public TINYINT(1) NOT NULL, compatibility_score INT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, expires_at DATETIME DEFAULT NULL, INDEX IDX_A098E5607CD27DE3 (junior_id), INDEX IDX_A098E560EFF44268 (target_mentor_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('CREATE TABLE mentoring_session (id INT AUTO_INCREMENT NOT NULL, mentor_id INT NOT NULL, junior_id INT NOT NULL, request_id INT DEFAULT NULL, status VARCHAR(255) NOT NULL, scheduled_at DATETIME DEFAULT NULL, started_at DATETIME DEFAULT NULL, completed_at DATETIME DEFAULT NULL, format VARCHAR(255) NOT NULL, conversation_id VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, INDEX IDX_4B4BBF2BDB403044 (mentor_id), INDEX IDX_4B4BBF2B7CD27DE3 (junior_id), UNIQUE INDEX UNIQ_4B4BBF2B427EB8A5 (request_id), PRIMARY KEY(id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');
        $this->addSql('ALTER TABLE mentor_profile ADD CONSTRAINT FK_185C512AA76ED395 FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentor_profile_specialties ADD CONSTRAINT FK_E0BC519C92E677D4 FOREIGN KEY (mentor_profile_id) REFERENCES mentor_profile (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentor_profile_specialties ADD CONSTRAINT FK_E0BC519C5585C142 FOREIGN KEY (skill_id) REFERENCES skill (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_pin ADD CONSTRAINT FK_B89D80AADB403044 FOREIGN KEY (mentor_id) REFERENCES mentor_profile (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_pin ADD CONSTRAINT FK_B89D80AA427EB8A5 FOREIGN KEY (request_id) REFERENCES mentoring_request (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_rating ADD CONSTRAINT FK_B32169E2613FECDF FOREIGN KEY (session_id) REFERENCES mentoring_session (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_rating ADD CONSTRAINT FK_B32169E23FC1CD0A FOREIGN KEY (rater_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_rating ADD CONSTRAINT FK_B32169E2F20FA22C FOREIGN KEY (ratee_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_request ADD CONSTRAINT FK_A098E5607CD27DE3 FOREIGN KEY (junior_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_request ADD CONSTRAINT FK_A098E560EFF44268 FOREIGN KEY (target_mentor_id) REFERENCES mentor_profile (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE mentoring_session ADD CONSTRAINT FK_4B4BBF2BDB403044 FOREIGN KEY (mentor_id) REFERENCES mentor_profile (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_session ADD CONSTRAINT FK_4B4BBF2B7CD27DE3 FOREIGN KEY (junior_id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE mentoring_session ADD CONSTRAINT FK_4B4BBF2B427EB8A5 FOREIGN KEY (request_id) REFERENCES mentoring_request (id) ON DELETE SET NULL');
        $this->addSql('DROP INDEX IDX_group_suggestion_status ON group_suggestion');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX idx_group_suggestion_suggested_by TO IDX_A4D92A966290AB1');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX idx_group_suggestion_claimed_by TO IDX_A4D92A9F67E7A38');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX fk_group_suggestion_approved_by TO IDX_A4D92A92D234F6A');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX fk_group_suggestion_rejected_by TO IDX_A4D92A9CBF05FC9');
        $this->addSql('CREATE INDEX idx_participant_user_conv ON msg_conversation_participants (user_id, conversation_id)');
        $this->addSql('DROP INDEX idx_msg_body_fulltext ON msg_messages');
        $this->addSql('ALTER TABLE payment CHANGE status status VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE payment RENAME INDEX uniq_6d28840d1a9504de TO UNIQ_6D28840DFC72F97E');
        $this->addSql('ALTER TABLE payment RENAME INDEX idx_6d28840d8a3c68e0 TO IDX_6D28840DC17AD9A9');
        $this->addSql('ALTER TABLE payment RENAME INDEX idx_6d28840df09e2198 TO IDX_6D28840DDB403044');
        $this->addSql('ALTER TABLE reports CHANGE status status VARCHAR(255) DEFAULT \'PENDING\' NOT NULL');
        $this->addSql('ALTER TABLE reports RENAME INDEX fk_reports_claimed_by TO IDX_F11FA745F67E7A38');
        $this->addSql('ALTER TABLE reports RENAME INDEX fk_reports_resolved_by TO IDX_F11FA7456713A32B');
        $this->addSql('ALTER TABLE tech_watch_item DROP FOREIGN KEY FK_TWI_SOURCE');
        $this->addSql('ALTER TABLE tech_watch_item ADD CONSTRAINT FK_88DE35D3953C1C61 FOREIGN KEY (source_id) REFERENCES tech_watch_source (id)');
        $this->addSql('ALTER TABLE tech_watch_item RENAME INDEX idx_twi_source TO IDX_88DE35D3953C1C61');
        $this->addSql('ALTER TABLE tech_watch_source RENAME INDEX idx_tws_group TO IDX_3C6951D1F85377BC');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE mentor_profile DROP FOREIGN KEY FK_185C512AA76ED395');
        $this->addSql('ALTER TABLE mentor_profile_specialties DROP FOREIGN KEY FK_E0BC519C92E677D4');
        $this->addSql('ALTER TABLE mentor_profile_specialties DROP FOREIGN KEY FK_E0BC519C5585C142');
        $this->addSql('ALTER TABLE mentoring_pin DROP FOREIGN KEY FK_B89D80AADB403044');
        $this->addSql('ALTER TABLE mentoring_pin DROP FOREIGN KEY FK_B89D80AA427EB8A5');
        $this->addSql('ALTER TABLE mentoring_rating DROP FOREIGN KEY FK_B32169E2613FECDF');
        $this->addSql('ALTER TABLE mentoring_rating DROP FOREIGN KEY FK_B32169E23FC1CD0A');
        $this->addSql('ALTER TABLE mentoring_rating DROP FOREIGN KEY FK_B32169E2F20FA22C');
        $this->addSql('ALTER TABLE mentoring_request DROP FOREIGN KEY FK_A098E5607CD27DE3');
        $this->addSql('ALTER TABLE mentoring_request DROP FOREIGN KEY FK_A098E560EFF44268');
        $this->addSql('ALTER TABLE mentoring_session DROP FOREIGN KEY FK_4B4BBF2BDB403044');
        $this->addSql('ALTER TABLE mentoring_session DROP FOREIGN KEY FK_4B4BBF2B7CD27DE3');
        $this->addSql('ALTER TABLE mentoring_session DROP FOREIGN KEY FK_4B4BBF2B427EB8A5');
        $this->addSql('DROP TABLE mentor_profile');
        $this->addSql('DROP TABLE mentor_profile_specialties');
        $this->addSql('DROP TABLE mentoring_pin');
        $this->addSql('DROP TABLE mentoring_rating');
        $this->addSql('DROP TABLE mentoring_request');
        $this->addSql('DROP TABLE mentoring_session');
        $this->addSql('CREATE INDEX IDX_group_suggestion_status ON group_suggestion (status)');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX idx_a4d92a966290ab1 TO IDX_group_suggestion_suggested_by');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX idx_a4d92a9cbf05fc9 TO FK_group_suggestion_rejected_by');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX idx_a4d92a92d234f6a TO FK_group_suggestion_approved_by');
        $this->addSql('ALTER TABLE group_suggestion RENAME INDEX idx_a4d92a9f67e7a38 TO IDX_group_suggestion_claimed_by');
        $this->addSql('DROP INDEX idx_participant_user_conv ON msg_conversation_participants');
        $this->addSql('CREATE FULLTEXT INDEX idx_msg_body_fulltext ON msg_messages (body)');
        $this->addSql('ALTER TABLE payment CHANGE status status VARCHAR(20) NOT NULL');
        $this->addSql('ALTER TABLE payment RENAME INDEX idx_6d28840ddb403044 TO IDX_6D28840DF09E2198');
        $this->addSql('ALTER TABLE payment RENAME INDEX idx_6d28840dc17ad9a9 TO IDX_6D28840D8A3C68E0');
        $this->addSql('ALTER TABLE payment RENAME INDEX uniq_6d28840dfc72f97e TO UNIQ_6D28840D1A9504DE');
        $this->addSql('ALTER TABLE reports CHANGE status status VARCHAR(20) DEFAULT \'PENDING\' NOT NULL');
        $this->addSql('ALTER TABLE reports RENAME INDEX idx_f11fa7456713a32b TO FK_reports_resolved_by');
        $this->addSql('ALTER TABLE reports RENAME INDEX idx_f11fa745f67e7a38 TO FK_reports_claimed_by');
        $this->addSql('ALTER TABLE tech_watch_item DROP FOREIGN KEY FK_88DE35D3953C1C61');
        $this->addSql('ALTER TABLE tech_watch_item ADD CONSTRAINT FK_TWI_SOURCE FOREIGN KEY (source_id) REFERENCES tech_watch_source (id) ON UPDATE NO ACTION ON DELETE CASCADE');
        $this->addSql('ALTER TABLE tech_watch_item RENAME INDEX idx_88de35d3953c1c61 TO IDX_TWI_SOURCE');
        $this->addSql('ALTER TABLE tech_watch_source RENAME INDEX idx_3c6951d1f85377bc TO IDX_TWS_GROUP');
    }
}
