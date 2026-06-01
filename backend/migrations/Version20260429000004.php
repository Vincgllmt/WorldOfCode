<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000004 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed TechWatch RSS feed sources for tech groups';
    }

    private function feeds(): array
    {
        return [
            ['React',        'React Blog',         'https://react.dev/rss.xml'],
            ['Vue.js',       'Vue.js News',         'https://news.vuejs.org/feed.xml'],
            ['Angular',      'Angular Blog',        'https://blog.angular.dev/feed'],
            ['Node.js',      'Node.js News',        'https://nodejs.github.io/nodejs-news-feeder/feed.xml'],
            ['Python',       'Python Insider',      'https://blog.python.org/feeds/posts/default'],
            ['Django',       'Django Weblog',       'https://www.djangoproject.com/rss/weblog/'],
            ['Symfony',      'Symfony Blog',        'https://feeds.feedburner.com/symfony/blog'],
            ['Laravel',      'Laravel News',        'https://feed.laravel-news.com'],
            ['Docker',       'Docker Blog',         'https://www.docker.com/blog/feed/'],
            ['Kubernetes',   'Kubernetes Blog',     'https://kubernetes.io/feed.xml'],
            ['AWS',          'AWS News Blog',       'https://aws.amazon.com/blogs/aws/feed/'],
            ['PostgreSQL',   'PostgreSQL News',     'https://www.postgresql.org/news.rss'],
            ['MongoDB',      'MongoDB Blog',        'https://www.mongodb.com/blog/rss'],
            ['GraphQL',      'GraphQL Blog',        'https://graphql.org/blog/rss.xml'],
            ['TypeScript',   'TypeScript Blog',     'https://devblogs.microsoft.com/typescript/feed/'],
            ['Rust',         'Rust Blog',           'https://blog.rust-lang.org/feed.xml'],
            ['Go',           'Go Blog',             'https://go.dev/blog/feed.atom'],
            ['Next.js',      'Next.js Blog',        'https://nextjs.org/feed.xml'],
            ['Tailwind CSS', 'Tailwind CSS Blog',   'https://tailwindcss.com/feeds/feed.xml'],
            ['Java',         'Inside Java',         'https://inside.java/feed.xml'],
            ['C# / .NET',    '.NET Blog',           'https://devblogs.microsoft.com/dotnet/feed/'],
            ['PHP',          'PHP.net News',        'https://www.php.net/feed.atom'],
            ['Swift',        'Swift.org Blog',      'https://www.swift.org/atom.xml'],
            ['Kotlin',       'Kotlin Blog',         'https://blog.jetbrains.com/kotlin/feed/'],
            ['Svelte',       'Svelte Blog',         'https://svelte.dev/blog/rss.xml'],
            ['Redis',        'Redis Blog',          'https://redis.io/blog/feed/'],
            ['Nginx',        'Nginx Blog',          'https://www.nginx.com/blog/feed/'],
            ['Terraform',    'HashiCorp Blog',      'https://www.hashicorp.com/blog/feed.xml'],
            ['VS Code',      'VS Code Blog',        'https://code.visualstudio.com/feed.xml'],
            ['Figma',        'Figma Blog',          'https://www.figma.com/blog/feed/'],
            ['Flutter',      'Flutter Blog',        'https://medium.com/feed/flutter'],
        ];
    }

    public function up(Schema $schema): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        foreach ($this->feeds() as [$groupName, $feedName, $feedUrl]) {
            $this->addSql(
                'INSERT INTO tech_watch_source (tech_group_id, name, feed_url, created_at)
                 SELECT tg.id, :name, :feed_url, :now
                 FROM tech_group tg
                 WHERE tg.name = :group_name
                   AND NOT EXISTS (SELECT 1 FROM tech_watch_source WHERE feed_url = :feed_url2)
                 LIMIT 1',
                [
                    'name'       => $feedName,
                    'feed_url'   => $feedUrl,
                    'now'        => $now,
                    'group_name' => $groupName,
                    'feed_url2'  => $feedUrl,
                ]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $urls = array_map(fn($f) => "'" . addslashes($f[2]) . "'", $this->feeds());
        $this->addSql('DELETE FROM tech_watch_source WHERE feed_url IN (' . implode(',', $urls) . ')');
    }
}
