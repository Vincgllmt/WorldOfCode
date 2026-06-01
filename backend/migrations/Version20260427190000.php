<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260427190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add codeSnippet and codeLanguage to mentoring_request';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentoring_request ADD code_snippet LONGTEXT NULL, ADD code_language VARCHAR(50) NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE mentoring_request DROP code_snippet, DROP code_language');
    }
}
