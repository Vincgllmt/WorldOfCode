<?php

namespace App\DataFixtures;

use App\Entity\GroupSuggestion;
use App\Entity\User;
use App\Enum\SuggestionStatus;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Common\DataFixtures\DependentFixtureInterface;
use Doctrine\Persistence\ObjectManager;

class GroupSuggestionFixtures extends Fixture implements DependentFixtureInterface
{
    public function getDependencies(): array
    {
        return [AppFixtures::class];
    }

    public function load(ObjectManager $manager): void
    {
        $admin  = $this->getReference('admin',  User::class);
        $admin2 = $this->getReference('admin2', User::class);

        $suggestions = [
            // PENDING — en attente de modération
            [
                'name'        => 'Astro',
                'description' => 'Framework web orienté contenu. Islands architecture, zéro JS par défaut, intégration React/Vue/Svelte... Le futur du web statique.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_0',
            ],
            [
                'name'        => 'Bun',
                'description' => 'Runtime JavaScript ultra-rapide. Remplacement de Node.js, bundler intégré, gestion de packages... L\'alternative qui bouscule l\'écosystème JS.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_1',
            ],
            [
                'name'        => 'Elixir / Phoenix',
                'description' => 'Langage fonctionnel sur la VM Erlang. Scalabilité massive, tolérance aux pannes, LiveView pour des interfaces temps réel sans JavaScript.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_2',
            ],
            [
                'name'        => 'Deno',
                'description' => 'Runtime TypeScript/JavaScript sécurisé par Ryan Dahl. Permissions granulaires, modules ES natifs, toolchain intégré.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_3',
            ],
            [
                'name'        => 'WebAssembly',
                'description' => 'Bytecode portable pour le web. Performances natives dans le navigateur, interop multi-langages... Le futur du calcul côté client.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_4',
            ],
            [
                'name'        => 'Hono',
                'description' => 'Framework web ultra-léger pour edge runtimes. Compatible Bun, Deno, Cloudflare Workers... API ergonomique inspirée d\'Express.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_5',
            ],
            [
                'name'        => 'Tauri',
                'description' => 'Alternative à Electron pour les apps desktop. Rust en backend, webview natif, bundle ultra-léger... Desktop apps modernes et performantes.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::PENDING,
                'userRef'     => 'user_6',
            ],

            // IN_PROGRESS — prise en charge par un admin
            [
                'name'        => 'NestJS',
                'description' => 'Framework Node.js progressif inspiré d\'Angular. TypeScript natif, modules, injection de dépendances, Swagger intégré... Architecture backend solide.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::IN_PROGRESS,
                'userRef'     => 'user_7',
                'claimedBy'   => $admin,
                'claimedAt'   => new \DateTime('-2 days'),
            ],
            [
                'name'        => 'tRPC',
                'description' => 'RPC typé de bout en bout entre client et serveur TypeScript. Plus de schéma, plus de codegen... L\'API type-safe ultime pour projets full-stack.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::IN_PROGRESS,
                'userRef'     => 'user_8',
                'claimedBy'   => $admin2,
                'claimedAt'   => new \DateTime('-1 day'),
            ],

            // APPROVED — validées
            [
                'name'        => 'Prisma',
                'description' => 'ORM TypeScript nouvelle génération. Schéma déclaratif, migrations, client typé... La couche base de données moderne pour projets Node/TS.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::APPROVED,
                'userRef'     => 'user_9',
                'approvedBy'  => $admin,
                'approvedAt'  => new \DateTime('-5 days'),
            ],
            [
                'name'        => 'Vite',
                'description' => 'Build tool ultra-rapide pour le frontend moderne. HMR instantané, ESM natif, plugins écosystème riche... Le standard qui remplace Webpack.',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::APPROVED,
                'userRef'     => 'user_0',
                'approvedBy'  => $admin2,
                'approvedAt'  => new \DateTime('-3 days'),
            ],

            // REJECTED — rejetées
            [
                'name'        => 'CoffeeScript',
                'description' => 'Syntaxe alternative à JavaScript. Compilé vers JS, syntaxe concise...',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::REJECTED,
                'userRef'     => 'user_1',
                'rejectedBy'  => $admin,
                'rejectedAt'  => new \DateTime('-7 days'),
                'resolutionNote' => 'Technologie obsolète, remplacée par TypeScript. Un groupe CoffeeScript n\'apporterait pas de valeur à la communauté.',
            ],
            [
                'name'        => 'Flash / ActionScript',
                'description' => 'Développement Flash et ActionScript 3...',
                'rssFeedUrl'  => null,
                'status'      => SuggestionStatus::REJECTED,
                'userRef'     => 'user_2',
                'rejectedBy'  => $admin2,
                'rejectedAt'  => new \DateTime('-10 days'),
                'resolutionNote' => 'Technologie abandonnée depuis 2020. Hors périmètre de la plateforme.',
            ],
        ];

        foreach ($suggestions as $data) {
            $suggestedBy = $this->getReference($data['userRef'], User::class);

            $suggestion = new GroupSuggestion();
            $suggestion->setSuggestedBy($suggestedBy);
            $suggestion->setName($data['name']);
            $suggestion->setDescription($data['description']);
            $suggestion->setRssFeedUrl($data['rssFeedUrl'] ?? null);
            $suggestion->setStatus($data['status']);

            if (isset($data['claimedBy'])) {
                $suggestion->setClaimedBy($data['claimedBy']);
                $suggestion->setClaimedAt($data['claimedAt']);
            }
            if (isset($data['approvedBy'])) {
                $suggestion->setApprovedBy($data['approvedBy']);
                $suggestion->setApprovedAt($data['approvedAt']);
            }
            if (isset($data['rejectedBy'])) {
                $suggestion->setRejectedBy($data['rejectedBy']);
                $suggestion->setRejectedAt($data['rejectedAt']);
                $suggestion->setResolutionNote($data['resolutionNote'] ?? null);
            }

            $manager->persist($suggestion);
        }

        $manager->flush();
    }
}
