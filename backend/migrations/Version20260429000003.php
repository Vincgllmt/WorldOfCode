<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000003 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed tech groups reference data (45 groups with descriptions)';
    }

    private function groups(): array
    {
        return [
            ['React', 'Communauté des développeurs React. Partagez vos composants, hooks personnalisés, astuces de performance et discutez des dernières nouveautés de l\'écosystème.'],
            ['Vue.js', 'Le framework progressif. Composition API, Pinia, Nuxt... Partageons nos expériences et aidons-nous mutuellement.'],
            ['Angular', 'Framework complet pour applications enterprise. TypeScript, RxJS, et architecture solide au programme.'],
            ['Node.js', 'JavaScript côté serveur. APIs REST, GraphQL, microservices, temps réel... Tout l\'univers backend JS.'],
            ['Python', 'Le langage polyvalent. Web, data science, automation, machine learning... Python peut tout faire.'],
            ['Django', 'Framework web Python pour les perfectionistes avec deadlines. ORM puissant, admin auto-généré, sécurité intégrée.'],
            ['Symfony', 'Framework PHP professionnel et robuste. Bundles, services, events... Architecture solide pour projets ambitieux.'],
            ['Laravel', 'Le framework élégant pour artisans web. Eloquent ORM, Blade templates, queues, broadcasting... PHP moderne.'],
            ['Docker', 'Conteneurisation et portabilité. Dockerfile, docker-compose, multi-stage builds... Déployez partout.'],
            ['Kubernetes', 'Orchestration de conteneurs à grande échelle. Pods, services, deployments, helm charts... Le standard du cloud.'],
            ['AWS', 'Amazon Web Services. EC2, Lambda, S3, RDS... Maîtrisons ensemble le cloud leader.'],
            ['DevOps', 'Culture DevOps : CI/CD, infrastructure as code, monitoring, automatisation... Rapprochons dev et ops.'],
            ['Machine Learning', 'Intelligence artificielle et ML. TensorFlow, PyTorch, scikit-learn... Donnons vie aux données.'],
            ['Cybersécurité', 'Sécurité informatique et ethical hacking. Protégeons nos applications et données contre les menaces.'],
            ['Blockchain', 'Technologie blockchain, smart contracts, Web3. Ethereum, Solidity... Le futur décentralisé.'],
            ['Mobile Dev', 'Développement mobile multi-plateforme. React Native, Flutter, Swift, Kotlin... Apps iOS et Android.'],
            ['UI/UX Design', 'Design d\'interfaces et expérience utilisateur. Figma, prototypage, design systems... L\'art du pixel parfait.'],
            ['PostgreSQL', 'Base de données relationnelle la plus avancée. Performances, JSON, extensions... Le couteau suisse du SQL.'],
            ['MongoDB', 'Base de données NoSQL orientée documents. Flexibilité, scalabilité, aggregation pipeline.'],
            ['GraphQL', 'API moderne alternative à REST. Requêtes flexibles, typage fort, real-time... L\'avenir des APIs.'],
            ['TypeScript', 'JavaScript typé pour projets robustes. Interfaces, génériques, type inference... Code plus sûr.'],
            ['Rust', 'Langage systèmes moderne. Performance C++, sécurité mémoire garantie... Sans garbage collector.'],
            ['Go', 'Langage de Google pour le cloud. Concurrence native, compilation rapide, simplicité... Microservices efficaces.'],
            ['Next.js', 'Framework React avec SSR/SSG. App Router, Server Components, optimisations... React en production.'],
            ['Tailwind CSS', 'Framework CSS utility-first. Productivité maximale, design systems cohérents... Plus de CSS custom.'],
            ['Java', 'Langage enterprise incontournable. Spring Boot, JVM, microservices... Robustesse et portabilité pour projets de grande envergure.'],
            ['C# / .NET', 'Ecosystème Microsoft complet. ASP.NET Core, Blazor, Entity Framework... Du backend au desktop en passant par le cloud Azure.'],
            ['PHP', 'Le langage du web. Au-delà des frameworks, explorons PHP 8.x, ses fibres, ses enums, ses performances et son écosystème.'],
            ['Swift', 'Développement natif Apple. iOS, macOS, SwiftUI, Combine... Construisons des apps performantes pour l\'écosystème Apple.'],
            ['Kotlin', 'Le langage moderne pour Android et au-delà. Coroutines, Jetpack Compose, multiplateforme... Java sans la verbosité.'],
            ['Svelte', 'Compilateur UI sans virtual DOM. SvelteKit, transitions natives, réactivité intuitive... Une approche radicalement différente du frontend.'],
            ['HTMX', 'Hypermedia moderne pour le web. Moins de JavaScript, plus de HTML. Simplifiez vos interfaces sans sacrifier l\'interactivité.'],
            ['Redis', 'Base de données en mémoire ultra-rapide. Cache, sessions, pub/sub, queues, streams... Indispensable en production.'],
            ['Nginx', 'Serveur web et reverse proxy haute performance. Load balancing, SSL, configuration avancée... Le standard de l\'infrastructure web.'],
            ['Terraform', 'Infrastructure as code multi-cloud. Modules, state management, providers... Versionnez et automatisez votre infrastructure.'],
            ['Linux', 'Administration système et scripting. Shell, gestion de serveurs, kernel, distributions... Les fondations de l\'infrastructure moderne.'],
            ['Data Engineering', 'Pipelines de données et architecture data. ETL, Spark, Airflow, dbt, data lakes... Transformez vos données brutes en valeur.'],
            ['LLM / GenAI', 'Intelligence artificielle générative. Prompt engineering, RAG, fine-tuning, agents autonomes... Explorons les grands modèles de langage.'],
            ['Clean Code', 'Principes de code propre et maintenable. SOLID, refactoring, tests unitaires, code review... Ecrivons du code qui dure.'],
            ['Open Source', 'Contribution et maintenance de projets open source. Licences, gouvernance, communauté... Partageons et construisons ensemble.'],
            ['Freelance Dev', 'Vie de développeur indépendant. Statut juridique, tarification, prospection, gestion de projet et relation client.'],
            ['Git', 'Gestion de version avancée. Workflows, rebase interactif, monorepos, hooks, bonnes pratiques... Maîtrisez votre historique.'],
            ['VS Code', 'L\'éditeur de code le plus populaire. Extensions essentielles, configuration, raccourcis, snippets... Maximisez votre productivité.'],
            ['Figma', 'Design collaboratif et prototypage. Composants, auto-layout, design tokens, plugins... Du concept au handoff développeur.'],
            ['Flutter', 'Framework UI cross-platform par Google. Dart, widgets, animations, compilation native... Une seule codebase pour iOS, Android et web.'],
        ];
    }

    public function up(Schema $schema): void
    {
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');

        foreach ($this->groups() as [$name, $description]) {
            $this->addSql(
                'INSERT INTO tech_group (name, description, creator_id, created_at)
                 SELECT :name, :description, u.id, :now
                 FROM `user` u
                 WHERE u.username = \'admin\'
                   AND NOT EXISTS (SELECT 1 FROM tech_group tg WHERE tg.name = :name2)
                 LIMIT 1',
                ['name' => $name, 'description' => $description, 'now' => $now, 'name2' => $name]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $names = array_map(fn($g) => "'" . addslashes($g[0]) . "'", $this->groups());
        $this->addSql('DELETE FROM tech_group WHERE name IN (' . implode(',', $names) . ')');
    }
}
