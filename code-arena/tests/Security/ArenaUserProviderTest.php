<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Security\ArenaUser;
use App\Security\ArenaUserProvider;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;

final class ArenaUserProviderTest extends TestCase
{
    public function testLoadsUserFromDatabaseRow(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAssociative')->willReturn([
            'id' => '7',
            'username' => 'alice',
            'role' => 'ROLE_ADMIN',
        ]);

        $user = (new ArenaUserProvider($connection))->loadUserByIdentifier('alice');

        self::assertInstanceOf(ArenaUser::class, $user);
        self::assertSame(7, $user->getId());
        self::assertSame('alice', $user->getUserIdentifier());
        self::assertContains('ROLE_ADMIN', $user->getRoles());
        self::assertContains('ROLE_USER', $user->getRoles()); // toujours présent
    }

    public function testThrowsWhenUserNotFound(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAssociative')->willReturn(false);

        $this->expectException(UserNotFoundException::class);
        (new ArenaUserProvider($connection))->loadUserByIdentifier('inconnu');
    }

    public function testSupportsArenaUserClassOnly(): void
    {
        $provider = new ArenaUserProvider($this->createStub(Connection::class));

        self::assertTrue($provider->supportsClass(ArenaUser::class));
        self::assertFalse($provider->supportsClass(\stdClass::class));
    }
}
