<?php

namespace App\DataFixtures;

use App\Entity\Post;
use App\Entity\Comment;
use App\Entity\User;
use App\Entity\TechGroup;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Faker\Factory;

class PostFixtures extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        $faker = Factory::create('fr_FR');
        $users = [];
        for ($i = 0; $i < 30; $i++) {
            $users[] = $this->getReference('user_' . $i, User::class);
        }

        $groups = [];
        $techNames = [
            'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Node.js', 'Symfony', 'Laravel',
            'Spring Boot', 'Django', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'GitLab CI',
            'AWS', 'GCP', 'Azure', 'Heroku', 'Vercel', 'PostgreSQL', 'MongoDB', 'ElasticSearch',
            'Redis', 'RabbitMQ'
        ];
        foreach ($techNames as $name) {
            $groups[] = $this->getReference('group_' . $name, TechGroup::class);
        }

        $posts = [];
        foreach ($groups as $group) {
            for ($i = 0; $i < rand(3, 15); $i++) {
                $post = new Post();
                $post->setContent($faker->paragraph);
                $post->setAuthor($faker->randomElement($users));
                $post->setTechGroup($group);
                $manager->persist($post);
                $posts[] = $post;
            }
        }

        foreach ($posts as $post) {
            for ($i = 0; $i < rand(2, 15); $i++) {
                $comment = new Comment();
                $comment->setContent($faker->sentence);
                $comment->setAuthor($faker->randomElement($users));
                $comment->setPost($post);
                $manager->persist($comment);
            }
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [
            AppFixtures::class,
            GroupFixtures::class,
        ];
    }
}