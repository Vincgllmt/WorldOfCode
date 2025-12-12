<?php

namespace App\Factory;

use App\Entity\Post;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<Post>
 */
final class PostFactory extends PersistentProxyObjectFactory
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
        return Post::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $techContents = [
            "Venez de terminer un projet avec cette techno ! 🚀 Vraiment impressionné par la performance et la facilité d'utilisation.",
            "Quelqu'un a-t-il des recommandations pour optimiser les performances ? Je cherche des bonnes pratiques.",
            "Nouveau tutoriel disponible sur mon blog ! J'explique comment démarrer de zéro avec cette stack.",
            "Quelle est votre expérience avec cette technologie en production ? Des retours d'expérience à partager ?",
            "Je viens de publier ma dernière création open source ! N'hésitez pas à contribuer 💻",
            "Astuce du jour : cette fonctionnalité méconnue peut vous faire gagner des heures de développement !",
            "Qui sera au prochain meetup ? Hâte de rencontrer la communauté IRL ! 🎉",
            "Débat : cette approche est-elle toujours d'actualité ou devrait-on migrer vers des solutions plus modernes ?",
            "Retour d'expérience après 2 ans en production : voici ce que j'aurais aimé savoir au départ.",
            "Besoin d'aide ! Comment gérer ce cas d'usage spécifique ? Merci d'avance pour vos suggestions 🙏",
            "La nouvelle version majeure vient de sortir ! Quelles sont les fonctionnalités qui vous excitent le plus ?",
            "Comparaison avec les alternatives : voici pourquoi j'ai choisi cette solution pour mon projet.",
            "Configuration de base pour un projet professionnel : voici mon setup optimisé après plusieurs itérations.",
            "Architecture clean et maintenable : mes patterns préférés pour structurer le code.",
            "Tests automatisés : voici comment j'ai atteint 90% de couverture sans perdre en productivité.",
        ];

        return [
            'author' => UserFactory::new(),
            'content' => self::faker()->randomElement($techContents) . "\n\n" . self::faker()->optional(0.7)->paragraph(),
            'techGroup' => TechGroupFactory::new(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Post $post): void {})
        ;
    }
}
