<?php

declare(strict_types=1);

namespace App\Security;

use Doctrine\DBAL\Connection;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\UserProviderInterface;

/**
 * Charge l'utilisateur à partir du username (claim JWT) par une requête
 * LECTURE SEULE sur la table `user` de la base partagée projet_web.
 *
 * Code Arena ne mappe pas l'entité User : il a seulement besoin de l'id et du rôle.
 *
 * @implements UserProviderInterface<ArenaUser>
 */
final class ArenaUserProvider implements UserProviderInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, username, role FROM user WHERE username = ?',
            [$identifier],
        );

        if ($row === false) {
            throw new UserNotFoundException(sprintf('Utilisateur "%s" introuvable.', $identifier));
        }

        $roles = isset($row['role']) && $row['role'] !== null ? [(string) $row['role']] : [];

        return new ArenaUser((int) $row['id'], (string) $row['username'], $roles);
    }

    public function refreshUser(UserInterface $user): UserInterface
    {
        if (!$user instanceof ArenaUser) {
            throw new UnsupportedUserException(sprintf('Type d\'utilisateur "%s" non supporté.', $user::class));
        }

        return $this->loadUserByIdentifier($user->getUserIdentifier());
    }

    public function supportsClass(string $class): bool
    {
        return ArenaUser::class === $class || is_subclass_of($class, ArenaUser::class);
    }
}
