<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\LeaderboardController;
use App\Security\ArenaUser;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * 🥊 Street Fighter II — LeaderboardController
 *
 * RyuHadouken = combattant classé 1er au tableau des scores.
 * KenMasters  = combattant classé 2e, rival de Ryu.
 */
final class LeaderboardControllerTest extends TestCase
{
    // 🥊 Street Fighter credentials
    private const RYU_ID       = 1;
    private const RYU_USERNAME = 'RyuHadouken';
    private const KEN_ID       = 2;
    private const KEN_USERNAME = 'KenMasters';

    private function makeController(ArenaUser $user): LeaderboardController
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createStub(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('has')->willReturn(true);
        $container->method('get')->willReturnMap([['security.token_storage', $storage]]);

        $controller = new LeaderboardController();
        $controller->setContainer($container);

        return $controller;
    }

    // ========== OK ==========

    /**
     * Ryu est 1er et voit isCurrentUser=true ; Ken est 2e avec isCurrentUser=false.
     */
    public function testLeaderboardReturnsRankedPlayers(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn([
            ['user_id' => (string) self::RYU_ID, 'username' => self::RYU_USERNAME, 'total_score' => '500'],
            ['user_id' => (string) self::KEN_ID, 'username' => self::KEN_USERNAME, 'total_score' => '350'],
        ]);
        $connection->method('fetchAllKeyValue')->willReturn([self::RYU_ID => '3', self::KEN_ID => '1']);

        $response = $this->makeController(new ArenaUser(self::RYU_ID, self::RYU_USERNAME))->index($connection);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertCount(2, $data);
        $this->assertSame(1, $data[0]['rank']);
        $this->assertSame(self::RYU_USERNAME, $data[0]['username']);
        $this->assertSame(500, $data[0]['totalScore']);
        $this->assertSame(3, $data[0]['badgesCount']);
        $this->assertTrue($data[0]['isCurrentUser']);
        $this->assertSame(2, $data[1]['rank']);
        $this->assertFalse($data[1]['isCurrentUser']);
    }

    /**
     * Le leaderboard est vide quand aucune soumission passée n'existe.
     */
    public function testLeaderboardEmptyWhenNoPassedSubmissions(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn([]);
        $connection->method('fetchAllKeyValue')->willReturn([]);

        $response = $this->makeController(new ArenaUser(self::RYU_ID, self::RYU_USERNAME))->index($connection);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], json_decode($response->getContent(), true));
    }

    // ========== NOK ==========

    /**
     * isCurrentUser est false pour tous les joueurs si l'utilisateur courant est absent du classement.
     */
    public function testLeaderboardIsCurrentUserFalseForUnrankedUser(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn([
            ['user_id' => (string) self::RYU_ID, 'username' => self::RYU_USERNAME, 'total_score' => '500'],
        ]);
        $connection->method('fetchAllKeyValue')->willReturn([]);

        // ZangiefsUnranked n'est pas dans la liste
        $response = $this->makeController(new ArenaUser(99, 'ZangiefsUnranked'))->index($connection);

        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data[0]['isCurrentUser']);
    }
}
