<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\ChallengeController;
use App\Entity\Challenge;
use App\Entity\ChallengeTest as ChallengeTestEntity;
use App\Security\ArenaUser;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\TestCase;
use Psr\Container\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * 🔮 Fez — ChallengeController
 *
 * GomezFez = joueur qui explore les défis disponibles dans l'arène.
 */
final class ChallengeControllerTest extends TestCase
{
    // 🔮 Fez credentials
    private const USER_ID  = 7;
    private const USERNAME = 'GomezFez';

    private function makeController(ArenaUser $user): ChallengeController
    {
        $token = $this->createStub(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $storage = $this->createStub(TokenStorageInterface::class);
        $storage->method('getToken')->willReturn($token);

        $container = $this->createStub(ContainerInterface::class);
        $container->method('has')->willReturn(true);
        $container->method('get')->willReturnMap([['security.token_storage', $storage]]);

        $controller = new ChallengeController();
        $controller->setContainer($container);

        return $controller;
    }

    private function makeChallenge(string $slug, int $id = 1, array $tests = []): Challenge
    {
        $collection = new ArrayCollection($tests);
        $challenge  = $this->createStub(Challenge::class);
        $challenge->method('getId')->willReturn($id);
        $challenge->method('getSlug')->willReturn($slug);
        $challenge->method('getTitle')->willReturn('The Mysterious Cube');
        $challenge->method('getDifficulty')->willReturn('easy');
        $challenge->method('getLanguages')->willReturn(['python']);
        $challenge->method('getMaxScore')->willReturn(100);
        $challenge->method('getImage')->willReturn(null);
        $challenge->method('getStatement')->willReturn('Rotate the cube.');
        $challenge->method('getTests')->willReturn($collection);

        return $challenge;
    }

    /**
     * Connexion stubée renvoyant les lignes de badges (challenge_id, code, icon)
     * utilisées pour résoudre l'icône de médaille d'un défi.
     */
    private function makeBadgeConnection(array $rows = []): Connection
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn($rows);

        return $connection;
    }

    // ========== OK — LIST ==========

    /**
     * La liste retourne les défis avec la progression personnelle de GomezFez.
     */
    public function testListChallengesReturnsAllWithProgress(): void
    {
        $user = new ArenaUser(self::USER_ID, self::USERNAME);
        $maze = $this->makeChallenge('maze', 1);
        $cube = $this->makeChallenge('cube', 2);

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findBy')->willReturn([$maze, $cube]);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);

        $connection = $this->createStub(Connection::class);
        $connection->method('fetchFirstColumn')->willReturn([1]);         // maze résolu
        $connection->method('fetchAllKeyValue')->willReturn([1 => 100, 2 => 50]);
        $connection->method('fetchAllAssociative')->willReturn([
            ['challenge_id' => 1, 'code' => 'perfect', 'icon' => '/badges/maze-perfect.svg'],
            ['challenge_id' => 1, 'code' => 'first_solve', 'icon' => '/badges/maze.svg'],
        ]);

        $response = $this->makeController($user)->list($em, $connection);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertCount(2, $data);
        $this->assertSame('maze', $data[0]['slug']);
        $this->assertTrue($data[0]['solved']);
        $this->assertSame(100, $data[0]['successRate']);
        $this->assertFalse($data[1]['solved']);
        $this->assertSame(50, $data[1]['successRate']);
        // L'icône du badge « first_solve » prime sur celle des autres badges…
        $this->assertSame('/badges/maze.svg', $data[0]['badgeIcon']);
        // …et un défi sans badge iconographié reste à null (repli côté front).
        $this->assertNull($data[1]['badgeIcon']);
    }

    /**
     * La liste est vide si aucun défi n'existe encore.
     */
    public function testListChallengesReturnsEmptyArray(): void
    {
        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findBy')->willReturn([]);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);

        $connection = $this->createStub(Connection::class);
        $connection->method('fetchFirstColumn')->willReturn([]);
        $connection->method('fetchAllKeyValue')->willReturn([]);

        $response = $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))->list($em, $connection);

        $this->assertSame([], json_decode($response->getContent(), true));
    }

    // ========== OK — DETAIL ==========

    /**
     * Le détail d'un défi existant expose uniquement ses tests publics.
     */
    public function testDetailChallengeReturnsPublicTestsOnly(): void
    {
        $publicTest = $this->createStub(ChallengeTestEntity::class);
        $publicTest->method('isPublic')->willReturn(true);
        $publicTest->method('getStdin')->willReturn('4 4');
        $publicTest->method('getExpectedOutput')->willReturn('YES');

        $privateTest = $this->createStub(ChallengeTestEntity::class);
        $privateTest->method('isPublic')->willReturn(false);

        $challenge = $this->makeChallenge('fez', 1, [$publicTest, $privateTest]);

        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn($challenge);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);

        $connection = $this->makeBadgeConnection([
            ['challenge_id' => 1, 'code' => 'first_solve', 'icon' => '/badges/fez.svg'],
        ]);

        $response = $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))->detail('fez', $em, $connection);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertSame('fez', $data['slug']);
        $this->assertCount(1, $data['publicTests']);
        $this->assertSame('4 4', $data['publicTests'][0]['stdin']);
        $this->assertSame('/badges/fez.svg', $data['badgeIcon']);
    }

    // ========== NOK ==========

    /**
     * Le détail d'un défi introuvable lève une NotFoundHttpException (→ 404).
     */
    public function testDetailUnknownChallengeThrowsNotFound(): void
    {
        $repo = $this->createStub(EntityRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $em = $this->createStub(EntityManagerInterface::class);
        $em->method('getRepository')->willReturn($repo);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController(new ArenaUser(self::USER_ID, self::USERNAME))->detail('no-such-game', $em, $this->makeBadgeConnection());
    }
}
