<?php

namespace App\DataFixtures;

use App\Entity\TechGroup;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Faker\Factory;

class GroupFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $faker = Factory::create('fr_FR');
        $users = [];
        for ($i = 0; $i < 30; $i++) {
            $users[] = $this->getReference('user_' . $i, User::class);
        }
        // --- GROUPS ---
        $techNames = [

            'React',
            'Vue.js',
            'Angular',
            'Svelte',
            'Next.js',
            'Node.js',
            'Symfony',
            'Laravel',
            'Spring Boot',
            'Django',
            'Docker',
            'Kubernetes',
            'Terraform',
            'Ansible',
            'GitLab CI',
            'AWS',
            'GCP',
            'Azure',
            'Heroku',
            'Vercel',
            'PostgreSQL',
            'MongoDB',
            'ElasticSearch',
            'Redis',
            'RabbitMQ'
        ];

        $groups = [];
        foreach ($techNames as $name) {
            $group = new TechGroup();
            $group->setName($name);
            $group->setDescription($faker->sentence());
            $group->setCreator($faker->randomElement($users));
            $manager->persist($group);
            $groups[] = $group;
            $this->addReference('group_' . $name, $group);
        }

        $manager->flush();
    }

    public function getDependencies()
    {
        return [AppFixtures::class];
    }
}
