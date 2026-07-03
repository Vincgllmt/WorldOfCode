<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Reset des données de seed (snapshot dev copié en devprod/prod) avant re-seed cohérent.
 *
 * Contexte : la prod a été initialisée à partir d'un dump dev incohérent (vieux groupes emoji,
 * données orphelines) et ne contient AUCUN vrai utilisateur. On repart donc sur une base propre.
 *
 * Vide les tables de données démo/utilisateur. PRÉSERVE les données de référence :
 * skill, badge, challenge, challenge_test (ainsi que le schéma et doctrine_migration_versions).
 *
 * ⚠️ Irréversible (pas de down) : ne joue ce reset qu'au lancement, avant l'arrivée de vrais users.
 */
final class Version20260616140000 extends AbstractMigration
{
    private const TABLES = [
        // messagerie
        'msg_message_reads', 'msg_messages', 'msg_conversation_participants', 'msg_conversations',
        // mentorat
        'session_note', 'session_appointment', 'mentoring_rating', 'mentoring_pin',
        'mentoring_session', 'mentoring_request', 'mentor_profile_specialties', 'mentor_profile',
        // paiements / signalements / feedback / suggestions / code-arena (données user)
        'payment', 'reports', 'feedback', 'group_suggestion', 'submission',
        // contenu social
        'comment', 'likes', 'post', 'follows',
        // veille + groupes
        'tech_watch_item', 'tech_watch_source', 'techgroup_user', 'tech_group',
        // profil / rattachements user
        'notification', 'login_history', 'trusted_device', 'user_link', 'user_skill', 'user_badge',
        // utilisateurs
        'user',
    ];

    public function getDescription(): string
    {
        return 'Reset des données de seed (démo/user), préserve les données de référence';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('SET FOREIGN_KEY_CHECKS = 0');
        foreach (self::TABLES as $table) {
            $this->addSql(sprintf('TRUNCATE TABLE `%s`', $table));
        }
        $this->addSql('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Reset de données irréversible (aucune donnée à restaurer).');
    }
}
