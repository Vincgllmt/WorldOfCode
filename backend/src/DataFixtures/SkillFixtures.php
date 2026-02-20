<?php

namespace App\DataFixtures;

use App\Entity\Skill;
use App\Enum\SkillCategory;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class SkillFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $skills = [
            // --- LANGAGES ---
            ['category' => SkillCategory::LANGUAGE, 'names' => [
                'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#',
                'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Dart', 'Scala',
                'R', 'Lua', 'Perl', 'Haskell', 'Elixir', 'Clojure', 'Objective-C',
                'Shell / Bash', 'PowerShell', 'SQL', 'GraphQL', 'Solidity',
                'COBOL', 'Fortran', 'Assembly', 'Zig', 'OCaml', 'F#', 'Groovy',
            ]],

            // --- FRONTEND ---
            ['category' => SkillCategory::FRONTEND, 'names' => [
                'React', 'Next.js', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte',
                'SvelteKit', 'Astro', 'Remix', 'Gatsby', 'jQuery',
                'HTML5', 'CSS3', 'Sass / SCSS', 'Less', 'Tailwind CSS',
                'Bootstrap', 'Material UI', 'Chakra UI', 'Ant Design', 'shadcn/ui',
                'Styled Components', 'Emotion', 'Framer Motion', 'GSAP',
                'Three.js', 'D3.js', 'Chart.js', 'Storybook', 'Webpack',
                'Vite', 'Turbopack', 'Parcel', 'esbuild', 'Rollup',
                'Redux', 'Zustand', 'MobX', 'Recoil', 'Jotai', 'TanStack Query',
                'Pinia', 'Vuex', 'RxJS',
                'WebSocket', 'WebRTC', 'PWA', 'Web Components',
                'Handlebars', 'EJS', 'Pug', 'Twig',
            ]],

            // --- BACKEND ---
            ['category' => SkillCategory::BACKEND, 'names' => [
                'Node.js', 'Express.js', 'Fastify', 'NestJS', 'Koa',
                'Django', 'Flask', 'FastAPI',
                'Spring Boot', 'Spring',
                'Symfony', 'Laravel', 'CodeIgniter',
                'Ruby on Rails', 'Sinatra',
                'ASP.NET', 'ASP.NET Core', '.NET',
                'Gin', 'Echo', 'Fiber',
                'Actix', 'Rocket',
                'Phoenix',
                'gRPC', 'REST API', 'GraphQL API', 'WebSocket API',
                'Prisma', 'TypeORM', 'Sequelize', 'Doctrine ORM', 'SQLAlchemy',
                'Hibernate', 'Mongoose', 'Drizzle',
                'Strapi', 'Directus', 'KeystoneJS',
                'WordPress', 'Drupal', 'Magento', 'PrestaShop',
            ]],

            // --- MOBILE ---
            ['category' => SkillCategory::MOBILE, 'names' => [
                'React Native', 'Flutter', 'Expo',
                'SwiftUI', 'UIKit', 'Jetpack Compose',
                'Ionic', 'Capacitor', 'Cordova',
                'Xamarin', '.NET MAUI',
                'Android SDK', 'iOS SDK',
                'App Store / Play Store publishing',
            ]],

            // --- BASE DE DONNEES ---
            ['category' => SkillCategory::DATABASE, 'names' => [
                'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite',
                'MongoDB', 'Redis', 'Memcached',
                'Elasticsearch', 'Solr',
                'Cassandra', 'DynamoDB', 'CouchDB',
                'Neo4j', 'ArangoDB',
                'InfluxDB', 'TimescaleDB',
                'Supabase', 'Firebase Realtime DB', 'Firestore',
                'PlanetScale', 'CockroachDB', 'TiDB',
                'SQL Server', 'Oracle DB',
            ]],

            // --- DEVOPS ---
            ['category' => SkillCategory::DEVOPS, 'names' => [
                'Docker', 'Kubernetes', 'Docker Compose',
                'Helm', 'Istio', 'Linkerd',
                'Terraform', 'Pulumi', 'Ansible', 'Chef', 'Puppet',
                'Jenkins', 'GitHub Actions', 'GitLab CI/CD', 'CircleCI',
                'Travis CI', 'ArgoCD', 'Flux',
                'Nginx', 'Apache', 'Caddy', 'HAProxy', 'Traefik',
                'Prometheus', 'Grafana', 'Datadog', 'New Relic',
                'ELK Stack', 'Loki', 'Jaeger', 'OpenTelemetry',
                'Vagrant', 'Packer',
                'Linux', 'Ubuntu', 'Debian', 'CentOS', 'Alpine',
                'systemd', 'cron',
            ]],

            // --- CLOUD ---
            ['category' => SkillCategory::CLOUD, 'names' => [
                'AWS', 'AWS EC2', 'AWS S3', 'AWS Lambda', 'AWS RDS',
                'AWS CloudFront', 'AWS ECS', 'AWS EKS', 'AWS SQS', 'AWS SNS',
                'Google Cloud Platform', 'GCP Cloud Run', 'GCP Cloud Functions',
                'GCP BigQuery', 'GCP Pub/Sub',
                'Microsoft Azure', 'Azure Functions', 'Azure DevOps',
                'Vercel', 'Netlify', 'Heroku', 'Railway', 'Render',
                'DigitalOcean', 'OVH', 'Scaleway', 'Hetzner',
                'Cloudflare', 'Cloudflare Workers',
                'Fly.io',
            ]],

            // --- DESIGN ---
            ['category' => SkillCategory::DESIGN, 'names' => [
                'Figma', 'Sketch', 'Adobe XD', 'InVision',
                'Adobe Photoshop', 'Adobe Illustrator', 'Adobe After Effects',
                'Adobe Premiere Pro', 'Adobe InDesign',
                'Canva', 'Framer',
                'Blender', 'Cinema 4D', 'Maya',
                'UI Design', 'UX Design', 'UX Research',
                'Design System', 'Wireframing', 'Prototyping',
                'Responsive Design', 'Accessibility (a11y)',
                'Motion Design', 'Brand Identity',
                'Zeplin', 'Abstract', 'Principle',
            ]],

            // --- OUTILS ---
            ['category' => SkillCategory::TOOLS, 'names' => [
                'Git', 'GitHub', 'GitLab', 'Bitbucket',
                'VS Code', 'IntelliJ IDEA', 'WebStorm', 'PHPStorm',
                'Vim / Neovim', 'Emacs', 'Sublime Text',
                'Postman', 'Insomnia', 'cURL', 'HTTPie',
                'Jira', 'Trello', 'Asana', 'Linear', 'Notion',
                'Slack', 'Discord', 'Microsoft Teams',
                'Confluence', 'Miro', 'Excalidraw',
                'npm', 'yarn', 'pnpm', 'Bun',
                'Composer', 'pip', 'Poetry', 'Maven', 'Gradle',
                'Cargo', 'Go Modules',
                'Homebrew', 'apt', 'snap',
                'SSH', 'GPG', 'OpenSSL',
                'ChatGPT / Claude / AI assistants',
                'Copilot', 'Cursor',
            ]],

            // --- TESTING ---
            ['category' => SkillCategory::TESTING, 'names' => [
                'Jest', 'Vitest', 'Mocha', 'Chai', 'Jasmine',
                'Cypress', 'Playwright', 'Puppeteer', 'Selenium',
                'Testing Library', 'Enzyme',
                'PHPUnit', 'Pest',
                'pytest', 'unittest',
                'JUnit', 'Mockito',
                'RSpec', 'Minitest',
                'Go testing',
                'Chromatic',
                'k6', 'Artillery', 'JMeter', 'Locust',
                'SonarQube', 'CodeClimate',
                'TDD', 'BDD', 'E2E Testing',
            ]],

            // --- SECURITE ---
            ['category' => SkillCategory::SECURITY, 'names' => [
                'OAuth 2.0', 'OpenID Connect', 'JWT', 'SAML',
                'Keycloak', 'Auth0', 'Firebase Auth',
                'OWASP', 'CORS', 'CSP', 'HTTPS / TLS',
                'Penetration Testing', 'Vulnerability Assessment',
                'Burp Suite', 'Nmap', 'Wireshark', 'Metasploit',
                'HashiCorp Vault', 'SOPS',
                'WAF', 'DDoS Protection',
                'SAST', 'DAST', 'IAST',
                'ISO 27001', 'SOC 2', 'GDPR',
                'Cryptography', 'PKI',
            ]],

            // --- DATA ---
            ['category' => SkillCategory::DATA, 'names' => [
                'Pandas', 'NumPy', 'SciPy', 'Matplotlib',
                'Scikit-learn', 'TensorFlow', 'PyTorch', 'Keras',
                'Jupyter Notebook', 'Google Colab',
                'Apache Spark', 'Apache Kafka', 'Apache Airflow',
                'Apache Flink', 'Apache Beam',
                'Hadoop', 'Hive', 'Presto',
                'dbt', 'Snowflake', 'Databricks',
                'Tableau', 'Power BI', 'Metabase', 'Looker',
                'ETL', 'Data Pipeline', 'Data Warehouse',
                'Machine Learning', 'Deep Learning', 'NLP',
                'Computer Vision', 'MLOps',
                'LangChain', 'LlamaIndex', 'OpenAI API',
                'Hugging Face', 'Stable Diffusion',
            ]],

            // --- AUTRE ---
            ['category' => SkillCategory::OTHER, 'names' => [
                'Agile / Scrum', 'Kanban', 'SAFe',
                'Microservices', 'Monolith', 'Event-Driven Architecture',
                'Domain-Driven Design (DDD)', 'CQRS', 'Event Sourcing',
                'Clean Architecture', 'Hexagonal Architecture',
                'CI/CD', 'DevSecOps', 'GitOps', 'SRE',
                'API Design', 'OpenAPI / Swagger',
                'WebAssembly (WASM)',
                'Blockchain', 'Web3', 'Smart Contracts',
                'IoT', 'Embedded Systems',
                'Game Development', 'Unity', 'Unreal Engine', 'Godot',
                'Technical Writing', 'Documentation',
                'Open Source Contributing',
                'Pair Programming', 'Code Review',
                'Mentoring', 'Team Leadership',
            ]],
        ];

        foreach ($skills as $group) {
            foreach ($group['names'] as $name) {
                $skill = new Skill();
                $skill->setName($name);
                $skill->setCategory($group['category']);
                $manager->persist($skill);
            }
        }

        $manager->flush();
    }
}
