<?php

namespace App\DataFixtures;

use App\Entity\TechGroup;
use App\Entity\TechWatchSource;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class TechWatchFixtures extends Fixture implements DependentFixtureInterface
{
    private const RSS_FEEDS = [
        'React' => [
            ['name' => 'React Blog', 'url' => 'https://react.dev/rss.xml'],
        ],
        'Vue.js' => [
            ['name' => 'Vue.js News', 'url' => 'https://news.vuejs.org/feed.xml'],
        ],
        'Angular' => [
            ['name' => 'Angular Blog', 'url' => 'https://blog.angular.dev/feed'],
        ],
        'Node.js' => [
            ['name' => 'Node.js News', 'url' => 'https://nodejs.github.io/nodejs-news-feeder/feed.xml'],
        ],
        'Python' => [
            ['name' => 'Python Insider', 'url' => 'https://blog.python.org/feeds/posts/default'],
        ],
        'Django' => [
            ['name' => 'Django Weblog', 'url' => 'https://www.djangoproject.com/rss/weblog/'],
        ],
        'Symfony' => [
            ['name' => 'Symfony Blog', 'url' => 'https://feeds.feedburner.com/symfony/blog'],
        ],
        'Laravel' => [
            ['name' => 'Laravel News', 'url' => 'https://feed.laravel-news.com'],
        ],
        'Docker' => [
            ['name' => 'Docker Blog', 'url' => 'https://www.docker.com/blog/feed/'],
        ],
        'Kubernetes' => [
            ['name' => 'Kubernetes Blog', 'url' => 'https://kubernetes.io/feed.xml'],
        ],
        'AWS' => [
            ['name' => 'AWS News Blog', 'url' => 'https://aws.amazon.com/blogs/aws/feed/'],
        ],
        'PostgreSQL' => [
            ['name' => 'PostgreSQL News', 'url' => 'https://www.postgresql.org/news.rss'],
        ],
        'MongoDB' => [
            ['name' => 'MongoDB Blog', 'url' => 'https://www.mongodb.com/blog/rss'],
        ],
        'GraphQL' => [
            ['name' => 'GraphQL Blog', 'url' => 'https://graphql.org/blog/rss.xml'],
        ],
        'TypeScript' => [
            ['name' => 'TypeScript Blog', 'url' => 'https://devblogs.microsoft.com/typescript/feed/'],
        ],
        'Rust' => [
            ['name' => 'Rust Blog', 'url' => 'https://blog.rust-lang.org/feed.xml'],
        ],
        'Go' => [
            ['name' => 'Go Blog', 'url' => 'https://go.dev/blog/feed.atom'],
        ],
        'Next.js' => [
            ['name' => 'Next.js Blog', 'url' => 'https://nextjs.org/feed.xml'],
        ],
        'Tailwind CSS' => [
            ['name' => 'Tailwind CSS Blog', 'url' => 'https://tailwindcss.com/feeds/feed.xml'],
        ],
        'Java' => [
            ['name' => 'Inside Java', 'url' => 'https://inside.java/feed.xml'],
        ],
        'C# / .NET' => [
            ['name' => '.NET Blog', 'url' => 'https://devblogs.microsoft.com/dotnet/feed/'],
        ],
        'PHP' => [
            ['name' => 'PHP.net News', 'url' => 'https://www.php.net/feed.atom'],
        ],
        'Swift' => [
            ['name' => 'Swift.org Blog', 'url' => 'https://www.swift.org/atom.xml'],
        ],
        'Kotlin' => [
            ['name' => 'Kotlin Blog', 'url' => 'https://blog.jetbrains.com/kotlin/feed/'],
        ],
        'Svelte' => [
            ['name' => 'Svelte Blog', 'url' => 'https://svelte.dev/blog/rss.xml'],
        ],
        'Redis' => [
            ['name' => 'Redis Blog', 'url' => 'https://redis.io/blog/feed/'],
        ],
        'Nginx' => [
            ['name' => 'Nginx Blog', 'url' => 'https://www.nginx.com/blog/feed/'],
        ],
        'Terraform' => [
            ['name' => 'HashiCorp Blog', 'url' => 'https://www.hashicorp.com/blog/feed.xml'],
        ],
        'VS Code' => [
            ['name' => 'VS Code Blog', 'url' => 'https://code.visualstudio.com/feed.xml'],
        ],
        'Figma' => [
            ['name' => 'Figma Blog', 'url' => 'https://www.figma.com/blog/feed/'],
        ],
        'Flutter' => [
            ['name' => 'Flutter Blog', 'url' => 'https://medium.com/feed/flutter'],
        ],
    ];

    public function load(ObjectManager $manager): void
    {
        foreach (self::RSS_FEEDS as $groupName => $feeds) {
            if (!$this->hasReference('group_' . $groupName, TechGroup::class)) {
                continue;
            }

            $group = $this->getReference('group_' . $groupName, TechGroup::class);

            foreach ($feeds as $feedInfo) {
                $source = new TechWatchSource();
                $source->setTechGroup($group);
                $source->setFeedUrl($feedInfo['url']);
                $source->setName($feedInfo['name']);
                $manager->persist($source);
            }
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [GroupFixtures::class];
    }
}
