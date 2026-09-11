<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Security\ArenaUser;
use App\Security\ArenaUserProvider;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\InMemoryUser;

/**
 * 🍄 Super Mario Bros — ArenaUserProvider
 *
 * MarioBros  = utilisateur admin existant en base.
 * BowserKoopa = identifiant absent de la base (devrait lever UserNotFoundException).
 */
final class ArenaUserProviderTest extends TestCase
{
    public function testLoadsUserFromDatabaseRow(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAssociative')->willReturn([
            'id' => '7',
            'username' => 'MarioBros',
            'role' => 'ROLE_ADMIN',
        ]);

        $user = (new ArenaUserProvider($connection))->loadUserByIdentifier('MarioBros');

        self::assertInstanceOf(ArenaUser::class, $user);
        self::assertSame(7, $user->getId());
        self::assertSame('MarioBros', $user->getUserIdentifier());
        self::assertContains('ROLE_ADMIN', $user->getRoles());
        self::assertContains('ROLE_USER', $user->getRoles()); // toujours présent
    }

    public function testThrowsWhenUserNotFound(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAssociative')->willReturn(false);

        $this->expectException(UserNotFoundException::class);
        (new ArenaUserProvider($connection))->loadUserByIdentifier('BowserKoopa');
    }

    public function testSupportsArenaUserClassOnly(): void
    {
        $provider = new ArenaUserProvider($this->createStub(Connection::class));

        self::assertTrue($provider->supportsClass(ArenaUser::class));
        self::assertFalse($provider->supportsClass(\stdClass::class));
    }

    public function testRefreshUserReloadsFromDatabase(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAssociative')->willReturn([
            'id' => '7',
            'username' => 'MarioBros',
            'role' => 'ROLE_ADMIN',
        ]);

        $refreshed = (new ArenaUserProvider($connection))->refreshUser(new ArenaUser(7, 'MarioBros', ['ROLE_ADMIN']));

        self::assertInstanceOf(ArenaUser::class, $refreshed);
        self::assertSame('MarioBros', $refreshed->getUserIdentifier());
    }

    public function testRefreshUserThrowsForUnsupportedUserType(): void
    {
        $provider = new ArenaUserProvider($this->createStub(Connection::class));

        $this->expectException(UnsupportedUserException::class);
        $provider->refreshUser(new InMemoryUser('BowserKoopa', null));
    }
}
