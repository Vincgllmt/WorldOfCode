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
                'description' => 'Communauté des développeurs React. Partagez vos composants, hooks personnalisés, astuces de performance et discutez des dernières nouveautés de l\'écosystème.',
            ],
            'Vue.js' => [
                'description' => 'Le framework progressif. Composition API, Pinia, Nuxt... Partageons nos expériences et aidons-nous mutuellement.',
            ],
            'Angular' => [
                'description' => 'Framework complet pour applications enterprise. TypeScript, RxJS, et architecture solide au programme.',
            ],
            'Node.js' => [
                'description' => 'JavaScript côté serveur. APIs REST, GraphQL, microservices, temps réel... Tout l\'univers backend JS.',
            ],
            'Python' => [
                'description' => 'Le langage polyvalent. Web, data science, automation, machine learning... Python peut tout faire.',
            ],
            'Django' => [
                'description' => 'Framework web Python pour les perfectionistes avec deadlines. ORM puissant, admin auto-généré, sécurité intégrée.',
            ],
            'Symfony' => [
                'description' => 'Framework PHP professionnel et robuste. Bundles, services, events... Architecture solide pour projets ambitieux.',
            ],
            'Laravel' => [
                'description' => 'Le framework élégant pour artisans web. Eloquent ORM, Blade templates, queues, broadcasting... PHP moderne.',
            ],
            'Docker' => [
                'description' => 'Conteneurisation et portabilité. Dockerfile, docker-compose, multi-stage builds... Déployez partout.',
            ],
            'Kubernetes' => [
                'description' => 'Orchestration de conteneurs à grande échelle. Pods, services, deployments, helm charts... Le standard du cloud.',
            ],
            'AWS' => [
                'description' => 'Amazon Web Services. EC2, Lambda, S3, RDS... Maîtrisons ensemble le cloud leader.',
            ],
            'DevOps' => [
                'description' => 'Culture DevOps : CI/CD, infrastructure as code, monitoring, automatisation... Rapprochons dev et ops.',
            ],
            'Machine Learning' => [
                'description' => 'Intelligence artificielle et ML. TensorFlow, PyTorch, scikit-learn... Donnons vie aux données.',
            ],
            'Cybersécurité' => [
                'description' => 'Sécurité informatique et ethical hacking. Protégeons nos applications et données contre les menaces.',
            ],
            'Blockchain' => [
                'description' => 'Technologie blockchain, smart contracts, Web3. Ethereum, Solidity... Le futur décentralisé.',
            ],
            'Mobile Dev' => [
                'description' => 'Développement mobile multi-plateforme. React Native, Flutter, Swift, Kotlin... Apps iOS et Android.',
            ],
            'UI/UX Design' => [
                'description' => 'Design d\'interfaces et expérience utilisateur. Figma, prototypage, design systems... L\'art du pixel parfait.',
            ],
            'PostgreSQL' => [
                'description' => 'Base de données relationnelle la plus avancée. Performances, JSON, extensions... Le couteau suisse du SQL.',
            ],
            'MongoDB' => [
                'description' => 'Base de données NoSQL orientée documents. Flexibilité, scalabilité, aggregation pipeline.',
            ],
            'GraphQL' => [
                'description' => 'API moderne alternative à REST. Requêtes flexibles, typage fort, real-time... L\'avenir des APIs.',
            ],
            'TypeScript' => [
                'description' => 'JavaScript typé pour projets robustes. Interfaces, génériques, type inference... Code plus sûr.',
            ],
            'Rust' => [
                'description' => 'Langage systèmes moderne. Performance C++, sécurité mémoire garantie... Sans garbage collector.',
            ],
            'Go' => [
                'description' => 'Langage de Google pour le cloud. Concurrence native, compilation rapide, simplicité... Microservices efficaces.',
            ],
            'Next.js' => [
                'description' => 'Framework React avec SSR/SSG. App Router, Server Components, optimisations... React en production.',
            ],
            'Tailwind CSS' => [
                'description' => 'Framework CSS utility-first. Productivité maximale, design systems cohérents... Plus de CSS custom.',
            ],
            'Java' => [
                'description' => 'Langage enterprise incontournable. Spring Boot, JVM, microservices... Robustesse et portabilité pour projets de grande envergure.',
            ],
            'C# / .NET' => [
                'description' => 'Ecosystème Microsoft complet. ASP.NET Core, Blazor, Entity Framework... Du backend au desktop en passant par le cloud Azure.',
            ],
            'PHP' => [
                'description' => 'Le langage du web. Au-delà des frameworks, explorons PHP 8.x, ses fibres, ses enums, ses performances et son écosystème.',
            ],
            'Swift' => [
                'description' => 'Développement natif Apple. iOS, macOS, SwiftUI, Combine... Construisons des apps performantes pour l\'écosystème Apple.',
            ],
            'Kotlin' => [
                'description' => 'Le langage moderne pour Android et au-delà. Coroutines, Jetpack Compose, multiplateforme... Java sans la verbosité.',
            ],
            'Svelte' => [
                'description' => 'Compilateur UI sans virtual DOM. SvelteKit, transitions natives, réactivité intuitive... Une approche radicalement différente du frontend.',
            ],
            'HTMX' => [
                'description' => 'Hypermedia moderne pour le web. Moins de JavaScript, plus de HTML. Simplifiez vos interfaces sans sacrifier l\'interactivité.',
            ],
            'Redis' => [
                'description' => 'Base de données en mémoire ultra-rapide. Cache, sessions, pub/sub, queues, streams... Indispensable en production.',
            ],
            'Nginx' => [
                'description' => 'Serveur web et reverse proxy haute performance. Load balancing, SSL, configuration avancée... Le standard de l\'infrastructure web.',
            ],
            'Terraform' => [
                'description' => 'Infrastructure as code multi-cloud. Modules, state management, providers... Versionnez et automatisez votre infrastructure.',
            ],
            'Linux' => [
                'description' => 'Administration système et scripting. Shell, gestion de serveurs, kernel, distributions... Les fondations de l\'infrastructure moderne.',
            ],
            'Data Engineering' => [
                'description' => 'Pipelines de données et architecture data. ETL, Spark, Airflow, dbt, data lakes... Transformez vos données brutes en valeur.',
            ],
            'LLM / GenAI' => [
                'description' => 'Intelligence artificielle générative. Prompt engineering, RAG, fine-tuning, agents autonomes... Explorons les grands modèles de langage.',
            ],
            'Clean Code' => [
                'description' => 'Principes de code propre et maintenable. SOLID, refactoring, tests unitaires, code review... Ecrivons du code qui dure.',
            ],
            'Open Source' => [
                'description' => 'Contribution et maintenance de projets open source. Licences, gouvernance, communauté... Partageons et construisons ensemble.',
            ],
            'Freelance Dev' => [
                'description' => 'Vie de développeur indépendant. Statut juridique, tarification, prospection, gestion de projet et relation client.',
            ],
            'Git' => [
                'description' => 'Gestion de version avancée. Workflows, rebase interactif, monorepos, hooks, bonnes pratiques... Maîtrisez votre historique.',
            ],
            'VS Code' => [
                'description' => 'L\'éditeur de code le plus populaire. Extensions essentielles, configuration, raccourcis, snippets... Maximisez votre productivité.',
            ],
            'Figma' => [
                'description' => 'Design collaboratif et prototypage. Composants, auto-layout, design tokens, plugins... Du concept au handoff développeur.',
            ],
            'Flutter' => [
                'description' => 'Framework UI cross-platform par Google. Dart, widgets, animations, compilation native... Une seule codebase pour iOS, Android et web.',
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
