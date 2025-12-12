<?php

namespace App\DataFixtures;

use App\Entity\TechGroup;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;

class GroupFixtures extends Fixture implements DependentFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        // Récupération des utilisateurs
        $users = [];
        for ($i = 0; $i < 50; $i++) {
            $users[] = $this->getReference('user_' . $i, User::class);
        }

        // Groupes technologiques avec descriptions détaillées
        $techGroups = [
            'React' => [
                'description' => '🚀 Communauté des développeurs React ! Partagez vos composants, hooks personnalisés, astuces de performance et discutez des dernières nouveautés de l\'écosystème.',
                'icon' => '⚛️'
            ],
            'Vue.js' => [
                'description' => '💚 Le framework progressif ! Composition API, Pinia, Nuxt... Partageons nos expériences et aidons-nous mutuellement.',
                'icon' => '🖖'
            ],
            'Angular' => [
                'description' => '🅰️ Framework complet pour applications enterprise. TypeScript, RxJS, et architecture solide au programme.',
                'icon' => '🔺'
            ],
            'Node.js' => [
                'description' => '🟢 JavaScript côté serveur ! APIs REST, GraphQL, microservices, temps réel... Tout l\'univers backend JS.',
                'icon' => '📦'
            ],
            'Python' => [
                'description' => '🐍 Le langage polyvalent ! Web, data science, automation, machine learning... Python peut tout faire.',
                'icon' => '🐍'
            ],
            'Django' => [
                'description' => '🎸 Framework web Python pour les perfectionistes avec deadlines. ORM puissant, admin auto-généré, sécurité intégrée.',
                'icon' => '🎸'
            ],
            'Symfony' => [
                'description' => '🎼 Framework PHP professionnel et robuste. Bundles, services, events... Architecture solide pour projets ambitieux.',
                'icon' => '🎼'
            ],
            'Laravel' => [
                'description' => '🔥 Le framework élégant pour artisans web. Eloquent ORM, Blade templates, queues, broadcasting... PHP moderne.',
                'icon' => '🔥'
            ],
            'Docker' => [
                'description' => '🐳 Conteneurisation et portabilité. Dockerfile, docker-compose, multi-stage builds... Déployez partout.',
                'icon' => '🐳'
            ],
            'Kubernetes' => [
                'description' => '☸️ Orchestration de conteneurs à grande échelle. Pods, services, deployments, helm charts... Le standard du cloud.',
                'icon' => '☸️'
            ],
            'AWS' => [
                'description' => '☁️ Amazon Web Services ! EC2, Lambda, S3, RDS... Maîtrisons ensemble le cloud leader.',
                'icon' => '☁️'
            ],
            'DevOps' => [
                'description' => '🔄 Culture DevOps : CI/CD, infrastructure as code, monitoring, automatisation... Rapprochons dev et ops.',
                'icon' => '🔄'
            ],
            'Machine Learning' => [
                'description' => '🤖 Intelligence artificielle et ML. TensorFlow, PyTorch, scikit-learn... Donnons vie aux données.',
                'icon' => '🤖'
            ],
            'Cybersécurité' => [
                'description' => '🔒 Sécurité informatique et ethical hacking. Protégeons nos applications et données contre les menaces.',
                'icon' => '🔒'
            ],
            'Blockchain' => [
                'description' => '⛓️ Technologie blockchain, smart contracts, Web3. Ethereum, Solidity... Le futur décentralisé.',
                'icon' => '⛓️'
            ],
            'Mobile Dev' => [
                'description' => '📱 Développement mobile multi-plateforme. React Native, Flutter, Swift, Kotlin... Apps iOS et Android.',
                'icon' => '📱'
            ],
            'UI/UX Design' => [
                'description' => '🎨 Design d\'interfaces et expérience utilisateur. Figma, prototypage, design systems... L\'art du pixel parfait.',
                'icon' => '🎨'
            ],
            'PostgreSQL' => [
                'description' => '🐘 Base de données relationnelle la plus avancée. Performances, JSON, extensions... Le couteau suisse du SQL.',
                'icon' => '🐘'
            ],
            'MongoDB' => [
                'description' => '🍃 Base de données NoSQL orientée documents. Flexibilité, scalabilité, aggregation pipeline... Le moderne.',
                'icon' => '🍃'
            ],
            'GraphQL' => [
                'description' => '📊 API moderne alternative à REST. Requêtes flexibles, typage fort, real-time... L\'avenir des APIs.',
                'icon' => '📊'
            ],
            'TypeScript' => [
                'description' => '💙 JavaScript typé pour projets robustes. Interfaces, génériques, type inference... Code plus sûr.',
                'icon' => '💙'
            ],
            'Rust' => [
                'description' => '🦀 Langage systèmes moderne. Performance C++, sécurité mémoire garantie... Sans garbage collector.',
                'icon' => '🦀'
            ],
            'Go' => [
                'description' => '🐹 Langage de Google pour le cloud. Concurrence native, compilation rapide, simplicité... Microservices efficaces.',
                'icon' => '🐹'
            ],
            'Next.js' => [
                'description' => '▲ Framework React avec SSR/SSG. App Router, Server Components, optimisations... React en production.',
                'icon' => '▲'
            ],
            'Tailwind CSS' => [
                'description' => '🎨 Framework CSS utility-first. Productivité maximale, design systems cohérents... Plus de CSS custom.',
                'icon' => '🎨'
            ],
        ];

        foreach ($techGroups as $name => $data) {
            $group = new TechGroup();
            $group->setName($name);
            $group->setDescription($data['description']);

            // Créateur aléatoire
            $creator = $users[array_rand($users)];
            $group->setCreator($creator);

            // Ajouter des membres au groupe (entre 5 et 30)
            $memberCount = rand(5, 30);
            $selectedUsers = array_rand($users, min($memberCount, count($users)));
            if (!is_array($selectedUsers)) {
                $selectedUsers = [$selectedUsers];
            }

            foreach ($selectedUsers as $userIndex) {
                $group->addUser($users[$userIndex]);
            }

            $manager->persist($group);
            $this->addReference('group_' . $name, $group);
        }

        $manager->flush();
    }

    public function getDependencies(): array
    {
        return [AppFixtures::class];
    }
}
