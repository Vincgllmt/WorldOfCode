<?php

namespace App\Factory;

use App\Entity\TechGroup;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<TechGroup>
 */
final class TechGroupFactory extends PersistentProxyObjectFactory
{
    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#factories-as-services
     *
     * @todo inject services if required
     */
    public function __construct()
    {
    }

    #[\Override]
    public static function class(): string
    {
        return TechGroup::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $techTopics = [
            'React' => 'Communauté des développeurs React - Partagez vos composants et astuces',
            'Vue.js' => 'Groupe Vue.js - Framework progressif pour construire des interfaces',
            'Angular' => 'Développeurs Angular - Enterprise applications et TypeScript',
            'Node.js' => 'Backend JavaScript avec Node.js - API, microservices et plus',
            'Python' => 'Communauté Python - Data Science, Web et Automation',
            'Django' => 'Framework Web Python Django pour les perfectionistes',
            'Symfony' => 'PHP Symfony - Le framework professionnel pour applications web',
            'Laravel' => 'Laravel PHP - Le framework élégant pour artisans web',
            'Docker' => 'Conteneurisation avec Docker - DevOps et microservices',
            'Kubernetes' => 'Orchestration de conteneurs avec K8s',
            'AWS' => 'Amazon Web Services - Cloud computing et architecture',
            'DevOps' => 'Culture DevOps - CI/CD, automatisation et monitoring',
            'Machine Learning' => 'Intelligence artificielle et apprentissage automatique',
            'Cybersécurité' => 'Sécurité informatique et protection des données',
            'Blockchain' => 'Technologies blockchain et cryptomonnaies',
            'Mobile Dev' => 'Développement mobile - iOS, Android, React Native',
            'UI/UX Design' => 'Design d\'interface et expérience utilisateur',
            'PostgreSQL' => 'Base de données relationnelle PostgreSQL',
            'MongoDB' => 'Base de données NoSQL MongoDB',
            'GraphQL' => 'APIs GraphQL - Alternative moderne à REST',
        ];

        $topic = self::faker()->randomElement(array_keys($techTopics));

        return [
            'name' => $topic,
            'description' => $techTopics[$topic],
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(TechGroup $techGroup): void {})
        ;
    }
}
