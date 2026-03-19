<?php

namespace App\DataFixtures;

use App\Factory\UserFactory;
use App\Entity\User;
use App\Entity\UserLink;
use App\Enum\UserRole;
use App\Enum\Availability;
use App\Enum\LinkType;
use App\Repository\SkillRepository;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture implements DependentFixtureInterface
{
    public function __construct(
        private UserPasswordHasherInterface $hasher,
        private SkillRepository $skillRepo,
    ) {}

    public function getDependencies(): array
    {
        return [SkillFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $allSkills = $this->skillRepo->findAll();
        $availabilities = Availability::cases();
        $linkTypes = [LinkType::GITHUB, LinkType::GITLAB, LinkType::LINKEDIN, LinkType::PORTFOLIO];

        $bios = [
            'Passionnee par le dev web et les nouvelles technos',
            'Fullstack developer, amateur de clean code et de DDD',
            'Backend engineer, Go et microservices',
            'Frontend dev React/Next.js, UI/UX enthusiast',
            'DevOps engineer, fan de Kubernetes et Terraform',
            'Data engineer en reconversion depuis le dev web',
            'Developpeur mobile Flutter/React Native',
            'Tech lead avec 5 ans d\'experience en startup',
            'Junior dev motivee, en alternance',
            'Freelance fullstack, specialise e-commerce',
        ];

        $locations = [
            'Paris, France', 'Lyon, France', 'Marseille, France',
            'Bordeaux, France', 'Toulouse, France', 'Nantes, France',
            'Lille, France', 'Strasbourg, France', 'Remote, France',
            'Montreal, Canada',
        ];

        $companies = ['Acme Corp', 'TechStartup', 'DataFlow', 'CloudNine', 'DevFactory', 'CodeCraft', 'PixelPerfect'];
        $titles = ['Developpeur fullstack', 'Developpeur frontend', 'Developpeur backend', 'DevOps engineer', 'Tech lead', 'Stagiaire dev', 'CTO', 'Data engineer'];

        // --- ADMIN ---
        $admin = new User();
        $admin->setUsername('admin');
        $admin->setFirstname('Admin');
        $admin->setLastname('System');
        $admin->setEmail('admin@woc.dev');
        $admin->setRole(UserRole::ROLE_ADMIN);
        $admin->setPassword($this->hasher->hashPassword($admin, 'Woc@Admin2026!$'));
        $admin->setBio('Administrateur de la plateforme World of Code');
        $admin->setLocation('Paris, France');
        $admin->setAvailability(Availability::EMPLOYED);
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

            // Profil CV
            $user->setBio($bios[$i]);
            $user->setLocation($locations[$i]);
            $user->setAvailability($availabilities[array_rand($availabilities)]);

            // Experiences (1 a 3)
            $nbExp = rand(1, 3);
            $experiences = [];
            for ($e = 0; $e < $nbExp; $e++) {
                $startYear = rand(2019, 2024);
                $startMonth = str_pad((string) rand(1, 12), 2, '0', STR_PAD_LEFT);
                $endYear = $startYear + rand(0, 2);
                $endMonth = str_pad((string) rand(1, 12), 2, '0', STR_PAD_LEFT);
                $isCurrent = ($e === 0 && rand(0, 1) === 1);

                $experiences[] = [
                    'title' => $titles[array_rand($titles)],
                    'company' => $companies[array_rand($companies)],
                    'startDate' => "{$startYear}-{$startMonth}",
                    'endDate' => $isCurrent ? null : "{$endYear}-{$endMonth}",
                    'description' => 'Developpement et maintenance d\'applications web',
                ];
            }
            $user->setExperiences($experiences);

            // Skills (3 a 8 random)
            $nbSkills = rand(3, 8);
            $skillKeys = (array) array_rand($allSkills, $nbSkills);
            foreach ($skillKeys as $key) {
                $user->addSkill($allSkills[$key]);
            }

            // Links (1 a 3)
            $usedTypes = [];
            $nbLinks = rand(1, 3);
            for ($l = 0; $l < $nbLinks; $l++) {
                $type = $linkTypes[array_rand($linkTypes)];
                if (in_array($type, $usedTypes)) {
                    continue;
                }
                $usedTypes[] = $type;

                $link = new UserLink();
                $link->setUser($user);
                $link->setType($type);
                $link->setUrl('https://' . strtolower($type->value) . '.com/' . $userData['username']);
                $user->addLink($link);
            }

            $manager->persist($user);
            $this->addReference('user_' . $i, $user);
        }

        // --- AUTRES UTILISATEURS GENERES ---
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
