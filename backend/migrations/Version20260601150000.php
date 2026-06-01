<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260601150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'perf: add index on post.created_at to avoid full table scan on listing';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX IDX_post_created_at ON post (created_at DESC)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX IDX_post_created_at ON post');
    }
}
