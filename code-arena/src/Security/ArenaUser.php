<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Représentation en lecture seule d'un utilisateur World of Code côté Code Arena.
 *
 * Construite à partir du claim `username` du JWT et d'une requête sur la table `user`.
 * Porte l'`id` de l'utilisateur, utilisé pour alimenter submission.user_id / user_badge.user_id.
 */
final class ArenaUser implements UserInterface
{
    /**
     * @param string[] $roles
     */
    public function __construct(
        private readonly int $id,
        private readonly string $username,
        private array $roles = [],
    ) {
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getUserIdentifier(): string
    {
        return $this->username;
    }

    /**
     * @return string[]
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';

        return array_values(array_unique($roles));
    }

    public function eraseCredentials(): void
    {
        // Aucun secret stocké : rien à effacer.
    }
}
