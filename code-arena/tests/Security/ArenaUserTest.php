<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Security\ArenaUser;
use PHPUnit\Framework\TestCase;

/**
 * 🦔 Sonic the Hedgehog — ArenaUser
 *
 * SonicMobian   = utilisateur avec rôle admin.
 * TailsMiles    = utilisateur sans rôle supplémentaire.
 * KnucklesEchidna = utilisateur avec ROLE_USER passé explicitement en doublon.
 */
final class ArenaUserTest extends TestCase
{
    public function testGetIdAndUserIdentifier(): void
    {
        $user = new ArenaUser(7, 'SonicMobian', ['ROLE_ADMIN']);

        self::assertSame(7, $user->getId());
        self::assertSame('SonicMobian', $user->getUserIdentifier());
    }

    public function testRolesAlwaysContainRoleUser(): void
    {
        $user = new ArenaUser(1, 'TailsMiles', []);

        self::assertContains('ROLE_USER', $user->getRoles());
    }

    public function testRolesAreDeduplicatedWhenRoleUserPassedExplicitly(): void
    {
        $user = new ArenaUser(1, 'KnucklesEchidna', ['ROLE_USER', 'ROLE_ADMIN']);
        $roles = $user->getRoles();

        self::assertCount(2, $roles);
        self::assertContains('ROLE_USER', $roles);
        self::assertContains('ROLE_ADMIN', $roles);
    }

    public function testCustomRolesAreIncluded(): void
    {
        $user = new ArenaUser(1, 'SonicMobian', ['ROLE_ADMIN']);

        self::assertContains('ROLE_ADMIN', $user->getRoles());
        self::assertContains('ROLE_USER', $user->getRoles());
    }

    public function testEraseCredentialsDoesNothing(): void
    {
        $user = new ArenaUser(1, 'TailsMiles', []);
        $user->eraseCredentials();

        // Aucune exception et les données ne changent pas.
        self::assertSame('TailsMiles', $user->getUserIdentifier());
    }
}
