<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260821090000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Corrige mentor_profile.teaching_style : les libellés français semés par Version20260616140001 ne sont pas des valeurs de App\Enum\TeachingStyle et font échouer l\'hydratation Doctrine (500 sur tout le mentorat)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE mentor_profile SET teaching_style = 'guided'        WHERE teaching_style = 'Pédagogue et patient'");
        $this->addSql("UPDATE mentor_profile SET teaching_style = 'direct'        WHERE teaching_style = 'Direct et pragmatique'");
        $this->addSql("UPDATE mentor_profile SET teaching_style = 'collaborative' WHERE teaching_style = 'Orienté pratique'");
        $this->addSql("UPDATE mentor_profile SET teaching_style = 'socratic'      WHERE teaching_style = \"Bienveillant, à l'écoute\"");

        // Filet de sécurité : toute autre valeur hors enum retombe sur le style par défaut.
        $this->addSql("UPDATE mentor_profile SET teaching_style = 'guided'
                       WHERE teaching_style NOT IN ('guided', 'direct', 'socratic', 'collaborative')");
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Les libellés d\'origine ne sont pas des valeurs valides de TeachingStyle.');
    }
}
