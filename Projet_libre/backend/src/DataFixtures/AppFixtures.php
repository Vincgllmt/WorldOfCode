<?php

namespace App\DataFixtures;

use App\Entity\User;
use App\Entity\TechGroup;
use App\Entity\Post;
use App\Entity\Comment;
use App\Enum\UserRole;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Faker\Factory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[\Doctrine\Bundle\FixturesBundle\Fixture]
class AppFixtures extends Fixture
{
    public function __construct(private UserPasswordHasherInterface $hasher) {}
    public function load(ObjectManager $manager): void
    {

        $faker = Factory::create('fr_FR');

        // --- ADMIN ---
        $admin = new User();
        $admin->setUsername('admin');
        $admin->setRole(UserRole::ROLE_ADMIN);

        $hashed = $this->hasher->hashPassword($admin, 'admin');
        $admin->setPassword($hashed);

        $manager->persist($admin);

        $users = [$admin];

        // --- AUTRES USERS ---
        for ($i = 0; $i < 90; $i++) {
            $user = new User();
            $user->setUsername($faker->userName);
            $user->setRole(UserRole::ROLE_USER);
            $hashed = $this->hasher->hashPassword($user, 'password');
            $user->setPassword($hashed);
            $manager->persist($user);
            $users[] = $user;
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
        }


        // --- POSTS ---
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

        // --- COMMENTS ---
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
}
