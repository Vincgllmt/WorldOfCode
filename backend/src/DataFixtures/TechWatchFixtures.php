<?php

namespace App\DataFixtures;

use App\Entity\TechGroup;
use App\Service\TechWatchAutoDetector;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class TechWatchFixtures extends Fixture implements DependentFixtureInterface
{
    public function __construct(private TechWatchAutoDetector $autoDetector) {}

    public function load(ObjectManager $manager): void
    {
        $groupNames = [
            'React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Django',
            'Symfony', 'Laravel', 'Docker', 'Kubernetes', 'AWS', 'DevOps',
            'Machine Learning', 'Cybersécurité', 'Blockchain', 'Mobile Dev',
            'UI/UX Design', 'PostgreSQL', 'MongoDB', 'GraphQL', 'TypeScript',
            'Rust', 'Go', 'Next.js', 'Tailwind CSS',
        ];

        foreach ($groupNames as $name) {
            $group = $this->getReference('group_' . $name, TechGroup::class);
            $this->autoDetector->detectAndCreateSources($group);
        }
    }

    public function getDependencies(): array
    {
        return [GroupFixtures::class];
    }
}
