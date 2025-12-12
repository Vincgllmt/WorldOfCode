<?php

namespace App\DataFixtures;

use App\Factory\UserFactory;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(private UserPasswordHasherInterface $hasher) {}

    public function load(ObjectManager $manager): void
    {
        // --- ADMIN ---
        $admin = new User();
        $admin->setUsername('admin');
        $admin->setFirstname('Admin');
        $admin->setLastname('System');
        $admin->setEmail('admin@woc.dev');
        $admin->setRole(UserRole::ROLE_ADMIN);
        $admin->setPassword($this->hasher->hashPassword($admin, 'admin123'));
        $manager->persist($admin);
        $this->addReference('admin', $admin);

        // --- UTILISATEURS DE TEST ---
        $testUsers = [
            ['username' => 'sarah.dev', 'firstname' => 'Sarah', 'lastname' => 'Martin', 'email' => 'sarah.martin@woc.dev'],
            ['username' => 'julien_tech', 'firstname' => 'Julien', 'lastname' => 'Dubois', 'email' => 'julien.dubois@woc.dev'],
            ['username' => 'marie.code', 'firstname' => 'Marie', 'lastname' => 'Lefevre', 'email' => 'marie.lefevre@woc.dev'],
            ['username' => 'thomas_dev', 'firstname' => 'Thomas', 'lastname' => 'Bernard', 'email' => 'thomas.bernard@woc.dev'],
            ['username' => 'emma.fullstack', 'firstname' => 'Emma', 'lastname' => 'Petit', 'email' => 'emma.petit@woc.dev'],
            ['username' => 'lucas.react', 'firstname' => 'Lucas', 'lastname' => 'Roux', 'email' => 'lucas.roux@woc.dev'],
            ['username' => 'chloe_backend', 'firstname' => 'Chloé', 'lastname' => 'Moreau', 'email' => 'chloe.moreau@woc.dev'],
            ['username' => 'hugo.devops', 'firstname' => 'Hugo', 'lastname' => 'Simon', 'email' => 'hugo.simon@woc.dev'],
            ['username' => 'lea.frontend', 'firstname' => 'Léa', 'lastname' => 'Laurent', 'email' => 'lea.laurent@woc.dev'],
            ['username' => 'maxime_py', 'firstname' => 'Maxime', 'lastname' => 'Girard', 'email' => 'maxime.girard@woc.dev'],
        ];

        foreach ($testUsers as $i => $userData) {
            $user = new User();
            $user->setUsername($userData['username']);
            $user->setFirstname($userData['firstname']);
            $user->setLastname($userData['lastname']);
            $user->setEmail($userData['email']);
            $user->setRole(UserRole::ROLE_USER);
            $user->setPassword($this->hasher->hashPassword($user, 'password123'));
            $manager->persist($user);
            $this->addReference('user_' . $i, $user);
        }

        // --- AUTRES UTILISATEURS GÉNÉRÉS ---
        for ($i = 10; $i < 50; $i++) {
            $user = UserFactory::createOne([
                'password' => $this->hasher->hashPassword(new User(), 'password123'),
                'role' => UserRole::ROLE_USER,
            ])->_real();
            $this->addReference('user_' . $i, $user);
        }

        $manager->flush();
    }
}
