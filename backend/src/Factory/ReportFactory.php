<?php

namespace App\Factory;

use App\Entity\Report;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<Report>
 */
final class ReportFactory extends PersistentProxyObjectFactory
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
        return Report::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $reasons = [
            'Spam ou contenu promotionnel',
            'Contenu offensant ou harcèlement',
            'Informations fausses ou trompeuses',
            'Violation de droits d\'auteur',
            'Contenu inapproprié',
            'Hors sujet',
        ];

        return [
            'post' => PostFactory::new(),
            'user' => UserFactory::new(),
            'reason' => self::faker()->randomElement($reasons),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
        ;
    }
}
