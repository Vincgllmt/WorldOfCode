<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Seed de démo cohérent (joué en prod, où les fixtures ne tournent pas) :
 * 6 admins équipe (ids 1..6) + 50 faux utilisateurs (ids 7..56), 45 groupes techniques
 * (+ flux RSS), appartenances, posts, follows et commentaires. IDs explicites
 * (la table a été truncatée juste avant), génération déterministe (mt_srand).
 *
 * Les 6 admins sont recréés à l'identique de Version20260429000001 (même hash bcrypt,
 * déjà commité) pour que l'équipe garde ses accès après le reset. Aucun nouveau secret
 * n'est introduit ici. Le mot de passe admin reste à rotater (cf. SEC-1).
 */
final class Version20260616140001 extends AbstractMigration
{
    private const ADMIN_COUNT = 6;
    private const FAKE_USER_COUNT = 50;
    private const TOTAL_USERS = 56; // 6 admins équipe + 50 faux users
    private const POST_COUNT = 200;

    public function getDescription(): string
    {
        return 'Seed démo cohérent : 6 admins + 50 users, 45 groupes + flux, membres, posts, follows, commentaires';
    }

    private function groups(): array
    {
        return [
            ['React', 'Communauté des développeurs React. Partagez vos composants, hooks personnalisés et astuces de performance.'],
            ['Vue.js', 'Le framework progressif. Composition API, Pinia, Nuxt... Partageons nos expériences.'],
            ['Angular', 'Framework complet pour applications enterprise. TypeScript, RxJS, architecture solide.'],
            ['Node.js', 'JavaScript côté serveur. APIs REST, GraphQL, microservices, temps réel.'],
            ['Python', 'Le langage polyvalent. Web, data science, automation, machine learning.'],
            ['Django', 'Framework web Python pour les perfectionistes avec deadlines. ORM puissant, sécurité intégrée.'],
            ['Symfony', 'Framework PHP professionnel et robuste. Bundles, services, events.'],
            ['Laravel', 'Le framework élégant pour artisans web. Eloquent ORM, Blade, queues.'],
            ['Docker', 'Conteneurisation et portabilité. Dockerfile, docker-compose, multi-stage builds.'],
            ['Kubernetes', 'Orchestration de conteneurs à grande échelle. Pods, services, deployments, helm.'],
            ['AWS', 'Amazon Web Services. EC2, Lambda, S3, RDS... Maîtrisons ensemble le cloud leader.'],
            ['DevOps', 'Culture DevOps : CI/CD, infrastructure as code, monitoring, automatisation.'],
            ['Machine Learning', 'Intelligence artificielle et ML. TensorFlow, PyTorch, scikit-learn.'],
            ['Cybersécurité', 'Sécurité informatique et ethical hacking. Protégeons nos applications.'],
            ['Blockchain', 'Technologie blockchain, smart contracts, Web3. Ethereum, Solidity.'],
            ['Mobile Dev', 'Développement mobile multi-plateforme. React Native, Flutter, Swift, Kotlin.'],
            ['UI/UX Design', 'Design d\'interfaces et expérience utilisateur. Figma, prototypage, design systems.'],
            ['PostgreSQL', 'Base de données relationnelle la plus avancée. Performances, JSON, extensions.'],
            ['MongoDB', 'Base de données NoSQL orientée documents. Flexibilité, scalabilité.'],
            ['GraphQL', 'API moderne alternative à REST. Requêtes flexibles, typage fort, real-time.'],
            ['TypeScript', 'JavaScript typé pour projets robustes. Interfaces, génériques, type inference.'],
            ['Rust', 'Langage systèmes moderne. Performance C++, sécurité mémoire garantie.'],
            ['Go', 'Langage de Google pour le cloud. Concurrence native, compilation rapide.'],
            ['Next.js', 'Framework React avec SSR/SSG. App Router, Server Components, optimisations.'],
            ['Tailwind CSS', 'Framework CSS utility-first. Productivité maximale, design systems cohérents.'],
            ['Java', 'Langage enterprise incontournable. Spring Boot, JVM, microservices.'],
            ['C# / .NET', 'Ecosystème Microsoft complet. ASP.NET Core, Blazor, Entity Framework.'],
            ['PHP', 'Le langage du web. PHP 8.x, ses fibres, ses enums, ses performances.'],
            ['Swift', 'Développement natif Apple. iOS, macOS, SwiftUI, Combine.'],
            ['Kotlin', 'Le langage moderne pour Android et au-delà. Coroutines, Jetpack Compose.'],
            ['Svelte', 'Compilateur UI sans virtual DOM. SvelteKit, transitions natives, réactivité intuitive.'],
            ['HTMX', 'Hypermedia moderne pour le web. Moins de JavaScript, plus de HTML.'],
            ['Redis', 'Base de données en mémoire ultra-rapide. Cache, sessions, pub/sub, queues.'],
            ['Nginx', 'Serveur web et reverse proxy haute performance. Load balancing, SSL.'],
            ['Terraform', 'Infrastructure as code multi-cloud. Modules, state management, providers.'],
            ['Linux', 'Administration système et scripting. Shell, gestion de serveurs, kernel.'],
            ['Data Engineering', 'Pipelines de données et architecture data. ETL, Spark, Airflow, dbt.'],
            ['LLM / GenAI', 'Intelligence artificielle générative. Prompt engineering, RAG, fine-tuning, agents.'],
            ['Clean Code', 'Principes de code propre et maintenable. SOLID, refactoring, tests unitaires.'],
            ['Open Source', 'Contribution et maintenance de projets open source. Licences, gouvernance, communauté.'],
            ['Freelance Dev', 'Vie de développeur indépendant. Statut juridique, tarification, prospection.'],
            ['Git', 'Gestion de version avancée. Workflows, rebase interactif, monorepos, hooks.'],
            ['VS Code', 'L\'éditeur de code le plus populaire. Extensions, configuration, raccourcis.'],
            ['Figma', 'Design collaboratif et prototypage. Composants, auto-layout, design tokens.'],
            ['Flutter', 'Framework UI cross-platform par Google. Dart, widgets, animations, compilation native.'],
        ];
    }

    private function feeds(): array
    {
        return [
            ['React', 'React Blog', 'https://react.dev/rss.xml'],
            ['Vue.js', 'Vue.js News', 'https://news.vuejs.org/feed.xml'],
            ['Angular', 'Angular Blog', 'https://blog.angular.dev/feed'],
            ['Node.js', 'Node.js News', 'https://nodejs.github.io/nodejs-news-feeder/feed.xml'],
            ['Python', 'Python Insider', 'https://blog.python.org/feeds/posts/default'],
            ['Django', 'Django Weblog', 'https://www.djangoproject.com/rss/weblog/'],
            ['Symfony', 'Symfony Blog', 'https://feeds.feedburner.com/symfony/blog'],
            ['Laravel', 'Laravel News', 'https://feed.laravel-news.com'],
            ['Docker', 'Docker Blog', 'https://www.docker.com/blog/feed/'],
            ['Kubernetes', 'Kubernetes Blog', 'https://kubernetes.io/feed.xml'],
            ['AWS', 'AWS News Blog', 'https://aws.amazon.com/blogs/aws/feed/'],
            ['PostgreSQL', 'PostgreSQL News', 'https://www.postgresql.org/news.rss'],
            ['MongoDB', 'MongoDB Blog', 'https://www.mongodb.com/blog/rss'],
            ['GraphQL', 'GraphQL Blog', 'https://graphql.org/blog/rss.xml'],
            ['TypeScript', 'TypeScript Blog', 'https://devblogs.microsoft.com/typescript/feed/'],
            ['Rust', 'Rust Blog', 'https://blog.rust-lang.org/feed.xml'],
            ['Go', 'Go Blog', 'https://go.dev/blog/feed.atom'],
            ['Next.js', 'Next.js Blog', 'https://nextjs.org/feed.xml'],
            ['Tailwind CSS', 'Tailwind CSS Blog', 'https://tailwindcss.com/feeds/feed.xml'],
            ['Java', 'Inside Java', 'https://inside.java/feed.xml'],
            ['C# / .NET', '.NET Blog', 'https://devblogs.microsoft.com/dotnet/feed/'],
            ['PHP', 'PHP.net News', 'https://www.php.net/feed.atom'],
            ['Swift', 'Swift.org Blog', 'https://www.swift.org/atom.xml'],
            ['Kotlin', 'Kotlin Blog', 'https://blog.jetbrains.com/kotlin/feed/'],
            ['Svelte', 'Svelte Blog', 'https://svelte.dev/blog/rss.xml'],
            ['Redis', 'Redis Blog', 'https://redis.io/blog/feed/'],
            ['Nginx', 'Nginx Blog', 'https://www.nginx.com/blog/feed/'],
            ['Terraform', 'HashiCorp Blog', 'https://www.hashicorp.com/blog/feed.xml'],
            ['VS Code', 'VS Code Blog', 'https://code.visualstudio.com/feed.xml'],
            ['Figma', 'Figma Blog', 'https://www.figma.com/blog/feed/'],
            ['Flutter', 'Flutter Blog', 'https://medium.com/feed/flutter'],
        ];
    }

    /** Slug ASCII pour usernames/emails (sans accents ni caractères spéciaux). */
    private function slug(string $s): string
    {
        $map = ['à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i', 'í' => 'i', 'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ù' => 'u', 'û' => 'u',
            'ü' => 'u', 'ú' => 'u', 'ç' => 'c', 'ÿ' => 'y', 'ñ' => 'n'];
        $s = strtr(mb_strtolower($s, 'UTF-8'), $map);
        return preg_replace('/[^a-z0-9]/', '', $s) ?: 'user';
    }

    /**
     * Avatar déterministe parmi les avatars préexistants de l'app (public/avatars, même origine) :
     * avatar1/2 = hommes, avatar3/4 = femmes, avatar5 = chien.
     * Fille → avatar3/4 ou chien (~25%) ; garçon → avatar1/2 ou chien (~25%).
     */
    private function avatarFor(string $firstname, int $seed): string
    {
        $female = ['Alice', 'Anaïs', 'Camille', 'Chloé', 'Clara', 'Elena', 'Emma', 'Fatou', 'Hana', 'Inès',
            'Iris', 'Jade', 'Julie', 'Léa', 'Léna', 'Maëlys', 'Manon', 'Margaux', 'Marion', 'Nina',
            'Noémie', 'Pauline', 'Rania', 'Sofia', 'Valentine', 'Yasmine', 'Zoé', 'Giulia', 'Nadia', 'Eugénie'];

        if (($seed % 4) === 0) {
            return '/avatars/avatar5.png'; // ~25% : chien
        }
        if (in_array($firstname, $female, true)) {
            return '/avatars/avatar' . ((($seed % 2) === 0) ? '3' : '4') . '.png';
        }
        return '/avatars/avatar' . ((($seed % 2) === 0) ? '1' : '2') . '.png';
    }

    public function up(Schema $schema): void
    {
        mt_srand(20260616);

        $firstnames = [
            'Alice', 'Alexandre', 'Amir', 'Anaïs', 'Antoine', 'Baptiste', 'Bilal', 'Camille', 'Chloé', 'Clara',
            'Clément', 'David', 'Dylan', 'Elena', 'Emma', 'Enzo', 'Fatou', 'Gabriel', 'Hana', 'Hugo',
            'Inès', 'Iris', 'Jade', 'Jonas', 'Julie', 'Karim', 'Léa', 'Léna', 'Louis', 'Lucas',
            'Maëlys', 'Malik', 'Manon', 'Margaux', 'Marion', 'Mehdi', 'Nathan', 'Nina', 'Noémie', 'Omar',
            'Paul', 'Pauline', 'Quentin', 'Rania', 'Rayan', 'Sacha', 'Sofia', 'Théo', 'Thomas', 'Tom',
            'Valentine', 'Wassim', 'Yanis', 'Yasmine', 'Youssef', 'Zoé', 'Adam', 'Bruno', 'Giulia', 'Nadia',
        ];
        $lastnames = [
            'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon',
            'Laurent', 'Lefèvre', 'Michel', 'Garcia', 'Roux', 'Fontaine', 'Chevalier', 'Girard', 'Bonnet', 'Dupont',
            'Lambert', 'Fournier', 'Mercier', 'Blanc', 'Guérin', 'Boyer', 'Garnier', 'Faure', 'Rousseau', 'Gauthier',
            'Perrin', 'Morel', 'Lemaire', 'Roussel', 'Renard', 'Barbier', 'Benoît', 'Marchand', 'Nguyen', 'Diallo',
            'Traoré', 'Benali', 'Haddad', 'Marino', 'Costa', 'Silva', 'Lopez', 'Ferreira', 'Schmitt', 'Colin',
        ];
        $bios = [
            'Passionnée par le dev web et les nouvelles technos',
            'Fullstack developer, amateur de clean code et de DDD',
            'Backend engineer, Go et microservices',
            'Frontend dev React/Next.js, UI/UX enthusiast',
            'DevOps engineer, fan de Kubernetes et Terraform',
            'Data engineer en reconversion depuis le dev web',
            'Développeur mobile Flutter/React Native',
            'Tech lead avec 5 ans d\'expérience en startup',
            'Junior dev motivé·e, en alternance',
            'Freelance fullstack, spécialisé e-commerce',
            'Ingénieur cloud, passionné d\'observabilité',
            'Étudiant en informatique, curieux de tout',
            'QA / test automation, la qualité avant tout',
            'Développeur backend Java/Spring, amateur d\'archi hexagonale',
            null,
        ];
        $locations = [
            'Paris, France', 'Lyon, France', 'Marseille, France', 'Bordeaux, France', 'Toulouse, France',
            'Nantes, France', 'Lille, France', 'Strasbourg, France', 'Rennes, France', 'Grenoble, France',
            'Montpellier, France', 'Remote, France', 'Bruxelles, Belgique', 'Genève, Suisse', 'Montréal, Canada', null,
        ];

        // ── 1a) Admins équipe (ids 1..6) — mêmes comptes/hash que Version20260429000001,
        //        recréés à l'identique pour que l'équipe garde ses accès après le reset.
        $adminHash = '$2y$13$p9Rbc2zz01sY66eJq4880OH4.eFGKKFWd9R.wQ58DoDJcImybpJV.';
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s');
        $admins = [
            ['admin', 'Admin', 'System', 'admin@woc.dev', 'Paris, France'],
            ['amine', 'Amine', 'Admin', 'amine@woc.dev', 'Paris, France'],
            ['eugenie', 'Eugénie', 'Admin', 'eugenie@woc.dev', 'Lyon, France'],
            ['vincent', 'Vincent', 'Admin', 'vincent@woc.dev', 'Bordeaux, France'],
            ['hichem', 'Hichem', 'Admin', 'hichem@woc.dev', 'Marseille, France'],
            ['theo', 'Théo', 'Admin', 'theo@woc.dev', 'Nantes, France'],
        ];
        $usedUsernames = [];
        $adminId = 1;
        foreach ($admins as [$username, $firstname, $lastname, $email, $location]) {
            $usedUsernames[$username] = true;
            $this->addSql(
                'INSERT INTO `user` (id, username, password, firstname, lastname, email, role, creation_date, updated_date, bio, location, availability, avatar_url)
                 VALUES (:id, :username, :pwd, :fn, :ln, :email, :role, :now, :now2, :bio, :loc, :av, :avatar)',
                [
                    'id' => $adminId, 'username' => $username, 'pwd' => $adminHash,
                    'fn' => $firstname, 'ln' => $lastname, 'email' => $email, 'role' => 'ROLE_ADMIN',
                    'now' => $now, 'now2' => $now, 'bio' => 'Administrateur de la plateforme World of Code',
                    'loc' => $location, 'av' => 'employed', 'avatar' => $this->avatarFor($firstname, $adminId),
                ]
            );
            $adminId++;
        }

        // ── 1b) Faux utilisateurs (ids 7..56), mot de passe démo commun "Demo1234!" ──
        $passwordHash = password_hash('Demo1234!', PASSWORD_BCRYPT);
        for ($i = 1; $i <= self::FAKE_USER_COUNT; $i++) {
            $id = self::ADMIN_COUNT + $i;
            $fn = $firstnames[array_rand($firstnames)];
            $ln = $lastnames[array_rand($lastnames)];

            $base = $this->slug($fn) . '.' . $this->slug($ln);
            $username = $base;
            $n = 1;
            while (isset($usedUsernames[$username])) {
                $username = $base . (++$n);
            }
            $usedUsernames[$username] = true;

            $bio = $bios[array_rand($bios)];
            $loc = $locations[array_rand($locations)];
            $created = (new \DateTimeImmutable('-' . mt_rand(30, 400) . ' days'))->format('Y-m-d H:i:s');

            $avPool = ['open_to_work', 'employed', 'freelance', 'student'];
            $availability = mt_rand(1, 100) <= 75 ? $avPool[array_rand($avPool)] : null;

            $experiences = null;
            if (mt_rand(1, 100) <= 60) {
                $jobTitles = ['Développeur fullstack', 'Développeur frontend', 'Développeur backend', 'DevOps engineer', 'Tech lead', 'Data engineer'];
                $companies = ['Acme Corp', 'TechStartup', 'DataFlow', 'CloudNine', 'DevFactory', 'CodeCraft'];
                $experiences = json_encode([[
                    'title' => $jobTitles[array_rand($jobTitles)],
                    'company' => $companies[array_rand($companies)],
                    'startDate' => sprintf('%04d-%02d', mt_rand(2018, 2023), mt_rand(1, 12)),
                    'endDate' => null,
                    'description' => 'Conception et développement d\'applications web.',
                ]], JSON_UNESCAPED_UNICODE);
            }

            $this->addSql(
                'INSERT INTO `user` (id, username, password, firstname, lastname, email, role, creation_date, updated_date, bio, location, availability, experiences, avatar_url)
                 VALUES (:id, :username, :pwd, :fn, :ln, :email, :role, :created, :created2, :bio, :loc, :av, :exp, :avatar)',
                [
                    'id' => $id, 'username' => $username, 'pwd' => $passwordHash,
                    'fn' => $fn, 'ln' => $ln, 'email' => $username . '@woc.demo', 'role' => 'ROLE_USER',
                    'created' => $created, 'created2' => $created, 'bio' => $bio, 'loc' => $loc,
                    'av' => $availability, 'exp' => $experiences, 'avatar' => $this->avatarFor($fn, $id),
                ]
            );
        }

        // ── 2) Groupes (id 1..N) + map nom → id ─────────────────────────────
        $groups = $this->groups();
        $groupIdByName = [];
        $gid = 1;
        foreach ($groups as [$name, $description]) {
            $created = (new \DateTimeImmutable('-' . mt_rand(60, 400) . ' days'))->format('Y-m-d H:i:s');
            $this->addSql(
                'INSERT INTO tech_group (id, creator_id, name, description, created_at)
                 VALUES (:id, :creator, :name, :description, :created)',
                ['id' => $gid, 'creator' => mt_rand(1, self::TOTAL_USERS), 'name' => $name, 'description' => $description, 'created' => $created]
            );
            $groupIdByName[$name] = $gid;
            $gid++;
        }

        // ── 3) Flux RSS de veille (tech_watch_source) ───────────────────────
        foreach ($this->feeds() as [$groupName, $feedName, $url]) {
            if (!isset($groupIdByName[$groupName])) {
                continue;
            }
            $this->addSql(
                'INSERT INTO tech_watch_source (tech_group_id, feed_url, name, created_at)
                 VALUES (:gid, :url, :name, :now)',
                ['gid' => $groupIdByName[$groupName], 'url' => $url, 'name' => $feedName,
                 'now' => (new \DateTimeImmutable())->format('Y-m-d H:i:s')]
            );
        }

        // ── 4) Appartenances aux groupes (techgroup_user) ───────────────────
        foreach ($groupIdByName as $gId) {
            $count = mt_rand(5, 30);
            $userIds = range(1, self::TOTAL_USERS);
            shuffle($userIds);
            foreach (array_slice($userIds, 0, $count) as $uid) {
                $this->addSql(
                    'INSERT INTO techgroup_user (tech_group_id, user_id) VALUES (:gid, :uid)',
                    ['gid' => $gId, 'uid' => $uid]
                );
            }
        }

        // ── 5) Posts : mix de posts liés à une techno (%s) et de posts génériques ──
        $techTemplates = [
            "Premier projet en prod avec %s, l'expérience est top et les performances au rendez-vous.",
            "Astuce %s du jour : une fonctionnalité méconnue qui m'a fait gagner des heures. Je détaille en commentaire.",
            "Comment gérez-vous la scalabilité avec %s ? Mon projet grossit et je cherche les bonnes pratiques.",
            "Nouvel article sur mon blog à propos de %s : 2 ans d'expérience condensés. Vos retours m'intéressent !",
            "La nouvelle version majeure de %s vient de sortir, plein de nouveautés. Qui a déjà migré ?",
            "Bug tordu rencontré avec %s dans une config précise. Je partage le workaround en attendant le fix.",
            "Mon top des libs indispensables autour de %s. Ça change vraiment le quotidien.",
            "Je viens d'open-sourcer un petit package pour %s. Contributions et feedbacks bienvenus !",
            "Migration vers %s terminée : les galères rencontrées et comment on les a surmontées.",
            "Après 6 mois sur %s, je me sens enfin à l'aise. Mes conseils pour les débutants.",
            "Petit benchmark %s vs les alternatives, les résultats m'ont surpris.",
            "3h de debug sur %s pour au final une bêtise... voilà ce que j'en retiens.",
            "Pourquoi j'ai choisi %s pour mon dernier projet (et pourquoi je ne regrette pas).",
            "Je teste %s sur un side-project ce mois-ci, je posterai un retour honnête.",
            "Je cherche des contributeurs pour un projet basé sur %s, qui est motivé ?",
        ];
        $genericPosts = [
            "Après 3 jours de galère en prod, c'était un simple problème de fuseau horaire 🤦. Toujours vérifier les timezones !",
            "Rappel du vendredi : commitez souvent, poussez tôt, et écrivez des messages de commit clairs. Votre futur vous dira merci.",
            "Le syndrome de l'imposteur ne part jamais vraiment, on apprend juste à faire avec. Courage aux juniors 💪",
            "Question carrière : rester expert technique ou évoluer vers du management ? Je suis à un carrefour...",
            "La code review, ce n'est pas pour critiquer mais pour apprendre ensemble. Changez de mindset, tout devient plus fluide.",
            "TIL : on peut faire énormément avec juste du CSS moderne aujourd'hui. On sous-estime la plateforme web.",
            "Nouvelle équipe cette semaine, super onboarding. Une bonne doc interne, ça change la vie 📚",
            "Débat éternel : tabs ou spaces ? 😅 Perso je laisse le formatter décider et je dors tranquille.",
            "Certif cloud validée ce week-end ! Beaucoup de boulot mais ça valait le coup. Prochaine étape : la pratique.",
            "Le meilleur code, c'est celui qu'on n'écrit pas. Supprimer du code mort est aussi productif que d'en ajouter.",
            "La technique Pomodoro m'a vraiment aidé à rester concentré sur les tâches complexes. Vous utilisez quoi ?",
            "On recrute un·e dev fullstack dans mon équipe ! Ambiance bienveillante, télétravail flexible. MP si intéressé·e.",
            "Première conf tech en présentiel depuis longtemps, tellement inspirant de rencontrer la communauté IRL 🙌",
            "Rappel : le burnout est réel. Prenez vos congés, déconnectez le week-end. La santé passe avant le sprint.",
            "J'ai enfin écrit des tests sur mon side-project. La sérénité que ça procure est incroyable.",
            "Quel est votre setup de dev préféré ? Je pense passer sur un clavier ergonomique, des retours ?",
            "Le mentorat marche dans les deux sens : en expliquant aux autres, on consolide ses propres bases.",
            "Refacto terminée après deux semaines. Zéro régression grâce aux tests. Fier de l'équipe 🎉",
        ];
        $additions = [
            "\n\nÀ retenir :\n• un point clé\n• un piège fréquent\n• une bonne pratique",
            "\n\nJe détaille dans le fil ci-dessous 🧵",
            "\n\n#dev #coding #tech",
            "\n\nN'hésitez pas à poser vos questions, je réponds avec plaisir !",
            "\n\nVous en pensez quoi ? Des expériences similaires ?",
            "\n\nEdit : merci pour tous vos retours, je mets à jour au fur et à mesure.",
        ];

        $groupNames = array_keys($groupIdByName);
        for ($p = 1; $p <= self::POST_COUNT; $p++) {
            $gName = $groupNames[array_rand($groupNames)];
            if (mt_rand(1, 100) <= 55) {
                $content = sprintf($techTemplates[array_rand($techTemplates)], $gName);
            } else {
                $content = $genericPosts[array_rand($genericPosts)];
            }
            if (mt_rand(0, 10) > 6) {
                $content .= $additions[array_rand($additions)];
            }
            $created = (new \DateTimeImmutable('-' . mt_rand(0, 90) . ' days -' . mt_rand(0, 1439) . ' minutes'))->format('Y-m-d H:i:s');
            $this->addSql(
                'INSERT INTO post (id, author_id, tech_group_id, content, created_at)
                 VALUES (:id, :author, :gid, :content, :created)',
                ['id' => $p, 'author' => mt_rand(1, self::TOTAL_USERS), 'gid' => $groupIdByName[$gName], 'content' => $content, 'created' => $created]
            );
        }

        // ── 6) Follows (relations de suivi, uniques) ────────────────────────
        $seen = [];
        for ($follower = 1; $follower <= self::TOTAL_USERS; $follower++) {
            $n = mt_rand(3, 15);
            $candidates = range(1, self::TOTAL_USERS);
            shuffle($candidates);
            $done = 0;
            foreach ($candidates as $followed) {
                if ($followed === $follower) {
                    continue;
                }
                $key = $follower . '_' . $followed;
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $this->addSql(
                    'INSERT INTO follows (follower_id, followed_id, created_at) VALUES (:f, :t, :now)',
                    ['f' => $follower, 't' => $followed, 'now' => (new \DateTimeImmutable('-' . mt_rand(0, 120) . ' days'))->format('Y-m-d H:i:s')]
                );
                if (++$done >= $n) {
                    break;
                }
            }
        }

        // ── 7) Commentaires (0 à 5 par post), variés ────────────────────────
        $commentTexts = [
            'Super retour, merci du partage !', 'Totalement d\'accord avec toi.',
            'Très intéressant, merci !', 'Je vais tester ça, ça a l\'air prometteur.',
            'Perso je préfère une autre approche, mais bien vu.', 'Excellent, hâte de voir la suite !',
            'Attention quand même aux perfs sur les gros volumes.', 'Bien expliqué, même pour un débutant.',
            'Génial, exactement ce que je cherchais 🙏', 'Bon courage pour la suite, tiens-nous au courant !',
            'Première fois que je vois cette approche, malin.', 'On en a discuté à la dernière conf, sujet passionnant.',
            'Clair et concis, j\'adhère.', 'Merci, ça va m\'être utile !',
            'Belle initiative 👏', 'C\'est noté, je garde ça sous le coude.',
            'Complètement d\'accord, +1.', 'Top, continue comme ça !',
            'Ça résonne avec mon expérience.', 'Franchement bien vu, merci.',
        ];
        foreach (range(1, self::POST_COUNT) as $postId) {
            $n = mt_rand(0, 5);
            for ($c = 0; $c < $n; $c++) {
                $created = (new \DateTimeImmutable('-' . mt_rand(0, 60) . ' days -' . mt_rand(0, 1439) . ' minutes'))->format('Y-m-d H:i:s');
                $this->addSql(
                    'INSERT INTO comment (author_id, post_id, content, created_at)
                     VALUES (:author, :post, :content, :created)',
                    ['author' => mt_rand(1, self::TOTAL_USERS), 'post' => $postId, 'content' => $commentTexts[array_rand($commentTexts)], 'created' => $created]
                );
            }
        }

        // ── 8) Skills sur les users (user_skill) : 3 à 8 skills existants par user ──
        //     On pioche des skills réels (SELECT ... ORDER BY RAND()) pour ne dépendre
        //     ni du nombre ni des ids de skills (aucun risque de FK).
        for ($uid = 1; $uid <= self::TOTAL_USERS; $uid++) {
            $k = mt_rand(3, 8);
            $this->addSql("INSERT INTO user_skill (user_id, skill_id) SELECT $uid, id FROM skill ORDER BY RAND() LIMIT $k");
        }

        // ── 9) Profils mentors : les 6 admins + 10 users, avec spécialités (tech_group) ──
        $mentorUserIds = array_merge(range(1, self::ADMIN_COUNT), [10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        $teachingStyles = ['guided', 'direct', 'socratic', 'collaborative']; // valeurs de App\Enum\TeachingStyle
        $mentorProfileId = 1;
        $mentorProfileIds = [];
        $groupCount = count($groups);
        foreach ($mentorUserIds as $uid) {
            $this->addSql(
                'INSERT INTO mentor_profile (id, user_id, is_available, teaching_style, max_active_mentees, mentor_bio, total_sessions, created_at, updated_at)
                 VALUES (:id, :uid, 1, :style, :max, :bio, 0, :now, :now2)',
                ['id' => $mentorProfileId, 'uid' => $uid, 'style' => $teachingStyles[array_rand($teachingStyles)],
                 'max' => mt_rand(2, 5), 'bio' => 'Mentor expérimenté, ravi d\'aider les juniors à progresser.', 'now' => $now, 'now2' => $now]
            );
            $specialties = range(1, $groupCount);
            shuffle($specialties);
            foreach (array_slice($specialties, 0, mt_rand(2, 4)) as $gid2) {
                $this->addSql('INSERT INTO mentor_profile_specialties (mentor_profile_id, tech_group_id) VALUES (:m, :g)', ['m' => $mentorProfileId, 'g' => $gid2]);
            }
            $mentorProfileIds[] = $mentorProfileId;
            $mentorProfileId++;
        }

        // ── 11) Demandes de mentorat (mentoring_request) : 20 publiques, statut pending ──
        $reqTypes = ['debug', 'one_to_one', 'exercise', 'code_review'];
        $reqTitles = ['Bug de CORS impossible à résoudre', 'Revue de mon architecture', 'Aide sur les tests unitaires',
            'Comprendre les promesses JS', 'Optimiser une requête SQL lente', 'Mettre en place la CI/CD',
            'Débuter avec Docker', 'Structurer un projet React', 'Gérer l\'authentification JWT', 'Déployer sur Kubernetes'];
        $juniorPool = range(self::ADMIN_COUNT + 1, self::TOTAL_USERS);
        for ($r = 0; $r < 20; $r++) {
            $created = (new \DateTimeImmutable('-' . mt_rand(0, 40) . ' days'))->format('Y-m-d H:i:s');
            $this->addSql(
                'INSERT INTO mentoring_request (junior_id, type, status, title, tech_stack, description, is_public, created_at, updated_at)
                 VALUES (:j, :type, :status, :title, :stack, :desc, 1, :now, :now2)',
                ['j' => $juniorPool[array_rand($juniorPool)], 'type' => $reqTypes[array_rand($reqTypes)], 'status' => 'pending',
                 'title' => $reqTitles[array_rand($reqTitles)], 'stack' => $groupNames[array_rand($groupNames)],
                 'desc' => 'Je bloque depuis un moment et j\'aimerais l\'avis d\'un mentor sur le sujet.', 'now' => $created, 'now2' => $created]
            );
        }

        // ── 12) Sessions de mentorat : 10 (mentor_id = mentor_profile.id, junior_id = user.id) ──
        $sessionStatuses = ['scheduled', 'completed'];
        $formats = ['text', 'video', 'hybrid'];
        for ($s = 0; $s < 10; $s++) {
            $created = (new \DateTimeImmutable('-' . mt_rand(0, 30) . ' days'))->format('Y-m-d H:i:s');
            $this->addSql(
                'INSERT INTO mentoring_session (mentor_id, junior_id, status, format, created_at, updated_at)
                 VALUES (:m, :j, :status, :fmt, :now, :now2)',
                ['m' => $mentorProfileIds[array_rand($mentorProfileIds)], 'j' => $juniorPool[array_rand($juniorPool)],
                 'status' => $sessionStatuses[array_rand($sessionStatuses)], 'fmt' => $formats[array_rand($formats)], 'now' => $created, 'now2' => $created]
            );
        }

        // ── 13) Suggestions de groupes (group_suggestion) : 8, statut IN_PROGRESS ──
        $suggestions = [
            ['Deno', 'Runtime JavaScript/TypeScript moderne, alternative à Node.', 'https://deno.com/feed'],
            ['Astro', 'Framework web orienté contenu, zéro JS par défaut.', 'https://astro.build/rss.xml'],
            ['Zig', 'Langage système bas niveau, alternative à C.', null],
            ['Elixir', 'Langage fonctionnel sur la BEAM, temps réel et concurrence.', null],
            ['Bun', 'Runtime et toolkit JavaScript ultra-rapide.', null],
            ['Qwik', 'Framework front resumable, chargement instantané.', null],
            ['Playwright', 'Tests end-to-end multi-navigateurs.', null],
            ['Observabilité', 'Logs, métriques, traces : OpenTelemetry, Grafana, Prometheus.', null],
        ];
        foreach ($suggestions as [$sName, $sDesc, $sUrl]) {
            $created = (new \DateTimeImmutable('-' . mt_rand(0, 25) . ' days'))->format('Y-m-d H:i:s');
            $this->addSql(
                'INSERT INTO group_suggestion (suggested_by_id, name, description, rss_feed_url, status, created_at)
                 VALUES (:by, :name, :desc, :url, :status, :now)',
                ['by' => $juniorPool[array_rand($juniorPool)], 'name' => $sName, 'desc' => $sDesc, 'url' => $sUrl,
                 'status' => 'IN_PROGRESS', 'now' => $created]
            );
        }

        // ── 14) Posts partagés (shared_from_id) : 15, ids 201..215 ──
        $shareMessages = ['À lire absolument !', 'Totalement d\'accord avec ce post.', 'Super ressource à partager.',
            'Exactement ce dont j\'avais besoin.', 'Important pour la communauté.'];
        for ($k = 0; $k < 15; $k++) {
            $created = (new \DateTimeImmutable('-' . mt_rand(0, 45) . ' days'))->format('Y-m-d H:i:s');
            $this->addSql(
                'INSERT INTO post (id, author_id, tech_group_id, shared_from_id, content, created_at)
                 VALUES (:id, :author, :gid, :from, :content, :created)',
                ['id' => self::POST_COUNT + 1 + $k, 'author' => mt_rand(1, self::TOTAL_USERS),
                 'gid' => mt_rand(1, $groupCount), 'from' => mt_rand(1, self::POST_COUNT),
                 'content' => $shareMessages[array_rand($shareMessages)], 'created' => $created]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Seed de démo irréversible (utiliser le reset dédié si besoin).');
    }
}
