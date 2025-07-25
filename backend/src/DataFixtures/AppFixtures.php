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
        for ($i = 0; $i < 30; $i++) {
            $user = new User();
            $user->setUsername($faker->userName);
            $user->setRole(UserRole::ROLE_USER);
            $hashed = $this->hasher->hashPassword($user, 'password');
            $user->setPassword($hashed);
            $manager->persist($user);
            $users[] = $user;
            $this->addReference('user_' . $i, $user);
        }

        $manager->flush();
    }
}
