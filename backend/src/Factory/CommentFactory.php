<?php

namespace App\Factory;

use App\Entity\Comment;
use Zenstruck\Foundry\Persistence\PersistentProxyObjectFactory;

/**
 * @extends PersistentProxyObjectFactory<Comment>
 */
final class CommentFactory extends PersistentProxyObjectFactory
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
        return Comment::class;
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#model-factories
     *
     * @todo add your default values here
     */
    #[\Override]
    protected function defaults(): array|callable
    {
        $comments = [
            "Excellent post ! Merci pour le partage 👍",
            "Super intéressant, j'ai appris quelque chose aujourd'hui !",
            "Complètement d'accord avec ton approche.",
            "Merci pour cette ressource, très utile !",
            "J'ai eu le même problème la semaine dernière, voici comment je l'ai résolu...",
            "Bonne idée, je vais tester ça sur mon projet 🚀",
            "Petite question : comment tu gères ce cas spécifique ?",
            "Génial ! Je cherchais exactement cette solution.",
            "Tu devrais regarder cette alternative, elle pourrait mieux correspondre à ton besoin.",
            "Attention à la performance avec cette approche, j'ai eu des soucis en prod.",
            "Merci ! Ça va me faire gagner un temps fou 💪",
            "Très bon article, bien expliqué et clair.",
            "Je recommande aussi de jeter un œil à la documentation officielle sur ce point.",
            "Quelqu'un sait si c'est compatible avec la dernière version ?",
            "Bravo pour ce travail ! La communauté en a vraiment besoin.",
        ];

        return [
            'author' => UserFactory::new(),
            'content' => self::faker()->randomElement($comments),
            'post' => PostFactory::new(),
        ];
    }

    /**
     * @see https://symfony.com/bundles/ZenstruckFoundryBundle/current/index.html#initialization
     */
    #[\Override]
    protected function initialize(): static
    {
        return $this
            // ->afterInstantiate(function(Comment $comment): void {})
        ;
    }
}
