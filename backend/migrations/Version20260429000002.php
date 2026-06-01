<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260429000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed skills reference data (all categories)';
    }

    private function skills(): array
    {
        return [
            // LANGUAGE
            ['JavaScript', 'language'], ['TypeScript', 'language'], ['Python', 'language'],
            ['Java', 'language'], ['C', 'language'], ['C++', 'language'], ['C#', 'language'],
            ['Go', 'language'], ['Rust', 'language'], ['PHP', 'language'], ['Ruby', 'language'],
            ['Swift', 'language'], ['Kotlin', 'language'], ['Dart', 'language'], ['Scala', 'language'],
            ['R', 'language'], ['Lua', 'language'], ['Perl', 'language'], ['Haskell', 'language'],
            ['Elixir', 'language'], ['Clojure', 'language'], ['Objective-C', 'language'],
            ['Shell / Bash', 'language'], ['PowerShell', 'language'], ['SQL', 'language'],
            ['GraphQL', 'language'], ['Solidity', 'language'], ['COBOL', 'language'],
            ['Fortran', 'language'], ['Assembly', 'language'], ['Zig', 'language'],
            ['OCaml', 'language'], ['F#', 'language'], ['Groovy', 'language'],

            // FRONTEND
            ['React', 'frontend'], ['Next.js', 'frontend'], ['Vue.js', 'frontend'],
            ['Nuxt.js', 'frontend'], ['Angular', 'frontend'], ['Svelte', 'frontend'],
            ['SvelteKit', 'frontend'], ['Astro', 'frontend'], ['Remix', 'frontend'],
            ['Gatsby', 'frontend'], ['jQuery', 'frontend'], ['HTML5', 'frontend'],
            ['CSS3', 'frontend'], ['Sass / SCSS', 'frontend'], ['Less', 'frontend'],
            ['Tailwind CSS', 'frontend'], ['Bootstrap', 'frontend'], ['Material UI', 'frontend'],
            ['Chakra UI', 'frontend'], ['Ant Design', 'frontend'], ['shadcn/ui', 'frontend'],
            ['Styled Components', 'frontend'], ['Emotion', 'frontend'], ['Framer Motion', 'frontend'],
            ['GSAP', 'frontend'], ['Three.js', 'frontend'], ['D3.js', 'frontend'],
            ['Chart.js', 'frontend'], ['Storybook', 'frontend'], ['Webpack', 'frontend'],
            ['Vite', 'frontend'], ['Turbopack', 'frontend'], ['Parcel', 'frontend'],
            ['esbuild', 'frontend'], ['Rollup', 'frontend'], ['Redux', 'frontend'],
            ['Zustand', 'frontend'], ['MobX', 'frontend'], ['Recoil', 'frontend'],
            ['Jotai', 'frontend'], ['TanStack Query', 'frontend'], ['Pinia', 'frontend'],
            ['Vuex', 'frontend'], ['RxJS', 'frontend'], ['WebSocket', 'frontend'],
            ['WebRTC', 'frontend'], ['PWA', 'frontend'], ['Web Components', 'frontend'],
            ['Handlebars', 'frontend'], ['EJS', 'frontend'], ['Pug', 'frontend'],
            ['Twig', 'frontend'],

            // BACKEND
            ['Node.js', 'backend'], ['Express.js', 'backend'], ['Fastify', 'backend'],
            ['NestJS', 'backend'], ['Koa', 'backend'], ['Django', 'backend'],
            ['Flask', 'backend'], ['FastAPI', 'backend'], ['Spring Boot', 'backend'],
            ['Spring', 'backend'], ['Symfony', 'backend'], ['Laravel', 'backend'],
            ['CodeIgniter', 'backend'], ['Ruby on Rails', 'backend'], ['Sinatra', 'backend'],
            ['ASP.NET', 'backend'], ['ASP.NET Core', 'backend'], ['.NET', 'backend'],
            ['Gin', 'backend'], ['Echo', 'backend'], ['Fiber', 'backend'],
            ['Actix', 'backend'], ['Rocket', 'backend'], ['Phoenix', 'backend'],
            ['gRPC', 'backend'], ['REST API', 'backend'], ['GraphQL API', 'backend'],
            ['WebSocket API', 'backend'], ['Prisma', 'backend'], ['TypeORM', 'backend'],
            ['Sequelize', 'backend'], ['Doctrine ORM', 'backend'], ['SQLAlchemy', 'backend'],
            ['Hibernate', 'backend'], ['Mongoose', 'backend'], ['Drizzle', 'backend'],
            ['Strapi', 'backend'], ['Directus', 'backend'], ['KeystoneJS', 'backend'],
            ['WordPress', 'backend'], ['Drupal', 'backend'], ['Magento', 'backend'],
            ['PrestaShop', 'backend'],

            // MOBILE
            ['React Native', 'mobile'], ['Flutter', 'mobile'], ['Expo', 'mobile'],
            ['SwiftUI', 'mobile'], ['UIKit', 'mobile'], ['Jetpack Compose', 'mobile'],
            ['Ionic', 'mobile'], ['Capacitor', 'mobile'], ['Cordova', 'mobile'],
            ['Xamarin', 'mobile'], ['.NET MAUI', 'mobile'], ['Android SDK', 'mobile'],
            ['iOS SDK', 'mobile'], ['App Store / Play Store publishing', 'mobile'],

            // DATABASE
            ['PostgreSQL', 'database'], ['MySQL', 'database'], ['MariaDB', 'database'],
            ['SQLite', 'database'], ['MongoDB', 'database'], ['Redis', 'database'],
            ['Memcached', 'database'], ['Elasticsearch', 'database'], ['Solr', 'database'],
            ['Cassandra', 'database'], ['DynamoDB', 'database'], ['CouchDB', 'database'],
            ['Neo4j', 'database'], ['ArangoDB', 'database'], ['InfluxDB', 'database'],
            ['TimescaleDB', 'database'], ['Supabase', 'database'],
            ['Firebase Realtime DB', 'database'], ['Firestore', 'database'],
            ['PlanetScale', 'database'], ['CockroachDB', 'database'], ['TiDB', 'database'],
            ['SQL Server', 'database'], ['Oracle DB', 'database'],

            // DEVOPS
            ['Docker', 'devops'], ['Kubernetes', 'devops'], ['Docker Compose', 'devops'],
            ['Helm', 'devops'], ['Istio', 'devops'], ['Linkerd', 'devops'],
            ['Terraform', 'devops'], ['Pulumi', 'devops'], ['Ansible', 'devops'],
            ['Chef', 'devops'], ['Puppet', 'devops'], ['Jenkins', 'devops'],
            ['GitHub Actions', 'devops'], ['GitLab CI/CD', 'devops'], ['CircleCI', 'devops'],
            ['Travis CI', 'devops'], ['ArgoCD', 'devops'], ['Flux', 'devops'],
            ['Nginx', 'devops'], ['Apache', 'devops'], ['Caddy', 'devops'],
            ['HAProxy', 'devops'], ['Traefik', 'devops'], ['Prometheus', 'devops'],
            ['Grafana', 'devops'], ['Datadog', 'devops'], ['New Relic', 'devops'],
            ['ELK Stack', 'devops'], ['Loki', 'devops'], ['Jaeger', 'devops'],
            ['OpenTelemetry', 'devops'], ['Vagrant', 'devops'], ['Packer', 'devops'],
            ['Linux', 'devops'], ['Ubuntu', 'devops'], ['Debian', 'devops'],
            ['CentOS', 'devops'], ['Alpine', 'devops'], ['systemd', 'devops'],
            ['cron', 'devops'],

            // CLOUD
            ['AWS', 'cloud'], ['AWS EC2', 'cloud'], ['AWS S3', 'cloud'],
            ['AWS Lambda', 'cloud'], ['AWS RDS', 'cloud'], ['AWS CloudFront', 'cloud'],
            ['AWS ECS', 'cloud'], ['AWS EKS', 'cloud'], ['AWS SQS', 'cloud'],
            ['AWS SNS', 'cloud'], ['Google Cloud Platform', 'cloud'],
            ['GCP Cloud Run', 'cloud'], ['GCP Cloud Functions', 'cloud'],
            ['GCP BigQuery', 'cloud'], ['GCP Pub/Sub', 'cloud'],
            ['Microsoft Azure', 'cloud'], ['Azure Functions', 'cloud'],
            ['Azure DevOps', 'cloud'], ['Vercel', 'cloud'], ['Netlify', 'cloud'],
            ['Heroku', 'cloud'], ['Railway', 'cloud'], ['Render', 'cloud'],
            ['DigitalOcean', 'cloud'], ['OVH', 'cloud'], ['Scaleway', 'cloud'],
            ['Hetzner', 'cloud'], ['Cloudflare', 'cloud'], ['Cloudflare Workers', 'cloud'],
            ['Fly.io', 'cloud'],

            // DESIGN
            ['Figma', 'design'], ['Sketch', 'design'], ['Adobe XD', 'design'],
            ['InVision', 'design'], ['Adobe Photoshop', 'design'],
            ['Adobe Illustrator', 'design'], ['Adobe After Effects', 'design'],
            ['Adobe Premiere Pro', 'design'], ['Adobe InDesign', 'design'],
            ['Canva', 'design'], ['Framer', 'design'], ['Blender', 'design'],
            ['Cinema 4D', 'design'], ['Maya', 'design'], ['UI Design', 'design'],
            ['UX Design', 'design'], ['UX Research', 'design'], ['Design System', 'design'],
            ['Wireframing', 'design'], ['Prototyping', 'design'],
            ['Responsive Design', 'design'], ['Accessibility (a11y)', 'design'],
            ['Motion Design', 'design'], ['Brand Identity', 'design'],
            ['Zeplin', 'design'], ['Abstract', 'design'], ['Principle', 'design'],

            // TOOLS
            ['Git', 'tools'], ['GitHub', 'tools'], ['GitLab', 'tools'],
            ['Bitbucket', 'tools'], ['VS Code', 'tools'], ['IntelliJ IDEA', 'tools'],
            ['WebStorm', 'tools'], ['PHPStorm', 'tools'], ['Vim / Neovim', 'tools'],
            ['Emacs', 'tools'], ['Sublime Text', 'tools'], ['Postman', 'tools'],
            ['Insomnia', 'tools'], ['cURL', 'tools'], ['HTTPie', 'tools'],
            ['Jira', 'tools'], ['Trello', 'tools'], ['Asana', 'tools'],
            ['Linear', 'tools'], ['Notion', 'tools'], ['Slack', 'tools'],
            ['Discord', 'tools'], ['Microsoft Teams', 'tools'], ['Confluence', 'tools'],
            ['Miro', 'tools'], ['Excalidraw', 'tools'], ['npm', 'tools'],
            ['yarn', 'tools'], ['pnpm', 'tools'], ['Bun', 'tools'],
            ['Composer', 'tools'], ['pip', 'tools'], ['Poetry', 'tools'],
            ['Maven', 'tools'], ['Gradle', 'tools'], ['Cargo', 'tools'],
            ['Go Modules', 'tools'], ['Homebrew', 'tools'], ['apt', 'tools'],
            ['snap', 'tools'], ['SSH', 'tools'], ['GPG', 'tools'],
            ['OpenSSL', 'tools'], ['ChatGPT / Claude / AI assistants', 'tools'],
            ['Copilot', 'tools'], ['Cursor', 'tools'],

            // TESTING
            ['Jest', 'testing'], ['Vitest', 'testing'], ['Mocha', 'testing'],
            ['Chai', 'testing'], ['Jasmine', 'testing'], ['Cypress', 'testing'],
            ['Playwright', 'testing'], ['Puppeteer', 'testing'], ['Selenium', 'testing'],
            ['Testing Library', 'testing'], ['Enzyme', 'testing'], ['PHPUnit', 'testing'],
            ['Pest', 'testing'], ['pytest', 'testing'], ['unittest', 'testing'],
            ['JUnit', 'testing'], ['Mockito', 'testing'], ['RSpec', 'testing'],
            ['Minitest', 'testing'], ['Go testing', 'testing'], ['Chromatic', 'testing'],
            ['k6', 'testing'], ['Artillery', 'testing'], ['JMeter', 'testing'],
            ['Locust', 'testing'], ['SonarQube', 'testing'], ['CodeClimate', 'testing'],
            ['TDD', 'testing'], ['BDD', 'testing'], ['E2E Testing', 'testing'],

            // SECURITY
            ['OAuth 2.0', 'security'], ['OpenID Connect', 'security'], ['JWT', 'security'],
            ['SAML', 'security'], ['Keycloak', 'security'], ['Auth0', 'security'],
            ['Firebase Auth', 'security'], ['OWASP', 'security'], ['CORS', 'security'],
            ['CSP', 'security'], ['HTTPS / TLS', 'security'],
            ['Penetration Testing', 'security'], ['Vulnerability Assessment', 'security'],
            ['Burp Suite', 'security'], ['Nmap', 'security'], ['Wireshark', 'security'],
            ['Metasploit', 'security'], ['HashiCorp Vault', 'security'], ['SOPS', 'security'],
            ['WAF', 'security'], ['DDoS Protection', 'security'], ['SAST', 'security'],
            ['DAST', 'security'], ['IAST', 'security'], ['ISO 27001', 'security'],
            ['SOC 2', 'security'], ['GDPR', 'security'], ['Cryptography', 'security'],
            ['PKI', 'security'],

            // DATA
            ['Pandas', 'data'], ['NumPy', 'data'], ['SciPy', 'data'],
            ['Matplotlib', 'data'], ['Scikit-learn', 'data'], ['TensorFlow', 'data'],
            ['PyTorch', 'data'], ['Keras', 'data'], ['Jupyter Notebook', 'data'],
            ['Google Colab', 'data'], ['Apache Spark', 'data'], ['Apache Kafka', 'data'],
            ['Apache Airflow', 'data'], ['Apache Flink', 'data'], ['Apache Beam', 'data'],
            ['Hadoop', 'data'], ['Hive', 'data'], ['Presto', 'data'],
            ['dbt', 'data'], ['Snowflake', 'data'], ['Databricks', 'data'],
            ['Tableau', 'data'], ['Power BI', 'data'], ['Metabase', 'data'],
            ['Looker', 'data'], ['ETL', 'data'], ['Data Pipeline', 'data'],
            ['Data Warehouse', 'data'], ['Machine Learning', 'data'],
            ['Deep Learning', 'data'], ['NLP', 'data'], ['Computer Vision', 'data'],
            ['MLOps', 'data'], ['LangChain', 'data'], ['LlamaIndex', 'data'],
            ['OpenAI API', 'data'], ['Hugging Face', 'data'], ['Stable Diffusion', 'data'],

            // OTHER
            ['Agile / Scrum', 'other'], ['Kanban', 'other'], ['SAFe', 'other'],
            ['Microservices', 'other'], ['Monolith', 'other'],
            ['Event-Driven Architecture', 'other'],
            ['Domain-Driven Design (DDD)', 'other'], ['CQRS', 'other'],
            ['Event Sourcing', 'other'], ['Clean Architecture', 'other'],
            ['Hexagonal Architecture', 'other'], ['CI/CD', 'other'],
            ['DevSecOps', 'other'], ['GitOps', 'other'], ['SRE', 'other'],
            ['API Design', 'other'], ['OpenAPI / Swagger', 'other'],
            ['WebAssembly (WASM)', 'other'], ['Blockchain', 'other'],
            ['Web3', 'other'], ['Smart Contracts', 'other'], ['IoT', 'other'],
            ['Embedded Systems', 'other'], ['Game Development', 'other'],
            ['Unity', 'other'], ['Unreal Engine', 'other'], ['Godot', 'other'],
            ['Technical Writing', 'other'], ['Documentation', 'other'],
            ['Open Source Contributing', 'other'], ['Pair Programming', 'other'],
            ['Code Review', 'other'], ['Mentoring', 'other'],
            ['Team Leadership', 'other'],
        ];
    }

    public function up(Schema $schema): void
    {
        foreach ($this->skills() as [$name, $category]) {
            $this->addSql(
                'INSERT IGNORE INTO skill (name, category) VALUES (:name, :category)',
                ['name' => $name, 'category' => $category]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $names = array_map(fn($s) => "'" . addslashes($s[0]) . "'", $this->skills());
        $this->addSql('DELETE FROM skill WHERE name IN (' . implode(',', $names) . ')');
    }
}
