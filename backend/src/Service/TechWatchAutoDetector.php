<?php

namespace App\Service;

use App\Entity\TechGroup;
use App\Entity\TechWatchSource;
use App\Repository\TechWatchSourceRepository;

class TechWatchAutoDetector
{
    private const KNOWN_FEEDS = [
        'vue'        => ['name' => 'Vue.js News',       'url' => 'https://news.vuejs.org/feed.xml'],
        'node'       => ['name' => 'Node.js News',      'url' => 'https://nodejs.github.io/nodejs-news-feeder/feed.xml'],
        'react'      => ['name' => 'React Blog',        'url' => 'https://react.dev/rss.xml'],
        'angular'    => ['name' => 'Angular Blog',      'url' => 'https://blog.angular.dev/feed'],
        'python'     => ['name' => 'Python Insider',     'url' => 'https://blog.python.org/feeds/posts/default'],
        'django'     => ['name' => 'Django Weblog',      'url' => 'https://www.djangoproject.com/rss/weblog/'],
        'symfony'    => ['name' => 'Symfony Blog',       'url' => 'https://feeds.feedburner.com/symfony/blog'],
        'laravel'    => ['name' => 'Laravel News',       'url' => 'https://feed.laravel-news.com'],
        'docker'     => ['name' => 'Docker Blog',        'url' => 'https://www.docker.com/blog/feed/'],
        'kubernetes' => ['name' => 'Kubernetes Blog',    'url' => 'https://kubernetes.io/feed.xml'],
        'aws'        => ['name' => 'AWS News Blog',      'url' => 'https://aws.amazon.com/blogs/aws/feed/'],
        'mongodb'    => ['name' => 'MongoDB Blog',       'url' => 'https://www.mongodb.com/blog/rss'],
        'postgresql' => ['name' => 'PostgreSQL News',    'url' => 'https://www.postgresql.org/news.rss'],
        'graphql'    => ['name' => 'GraphQL Blog',       'url' => 'https://graphql.org/blog/rss.xml'],
        'typescript' => ['name' => 'TypeScript Blog',    'url' => 'https://devblogs.microsoft.com/typescript/feed/'],
        'rust'       => ['name' => 'Rust Blog',          'url' => 'https://blog.rust-lang.org/feed.xml'],
        'go'         => ['name' => 'Go Blog',            'url' => 'https://go.dev/blog/feed.atom'],
        'next'       => ['name' => 'Next.js Blog',       'url' => 'https://nextjs.org/feed.xml'],
        'tailwind'   => ['name' => 'Tailwind CSS Blog',  'url' => 'https://tailwindcss.com/feeds/feed.xml'],
    ];

    public function __construct(private TechWatchSourceRepository $sourceRepo) {}

    /** @return TechWatchSource[] */
    public function detectAndCreateSources(TechGroup $group): array
    {
        $groupNameLower = mb_strtolower($group->getName());
        $created = [];

        foreach (self::KNOWN_FEEDS as $keyword => $feedInfo) {
            if (str_contains($groupNameLower, $keyword)) {
                $existing = $this->sourceRepo->findOneBy([
                    'techGroup' => $group,
                    'feedUrl' => $feedInfo['url'],
                ]);
                if (!$existing) {
                    $source = new TechWatchSource();
                    $source->setTechGroup($group);
                    $source->setFeedUrl($feedInfo['url']);
                    $source->setName($feedInfo['name']);
                    $source->setIsAutoDetected(true);
                    $this->sourceRepo->save($source, true);
                    $created[] = $source;
                }
            }
        }

        return $created;
    }
}
