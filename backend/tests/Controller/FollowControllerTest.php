<?php

namespace App\Tests\Controller;

use App\Controller\FollowController;
use App\Entity\Follow;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\FollowRepository;
use App\Repository\UserRepository;
use App\Service\NotificationService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Metal Gear Solid - Tests unitaires du FollowController
 *
 * SolidSnake    = utilisateur authentifié courant (le follower)
 * OtaconEmmerich = autre utilisateur (la cible du follow)
 */
class FollowControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'SolidSnake'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@foxhound.mil')
            ->setFirstname($username)
            ->setLastname('Foxhound')
            ->setPassword('ShadowMoses1998')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildFollow(User $follower, User $followed): Follow
    {
        $follow = new Follow();
        $follow->setFollower($follower);
        $follow->setFollowed($followed);

        return $follow;
    }

    private function makeContainer(User $currentUser): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn(true);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'         => $tokenStorage,
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function makeController(
        User $currentUser,
        ?UserRepository $userRepo = null,
        ?FollowRepository $followRepo = null,
        ?NotificationService $notifService = null
    ): FollowController {
        $controller = new FollowController(
            $userRepo     ?? $this->createMock(UserRepository::class),
            $followRepo   ?? $this->createMock(FollowRepository::class),
            $notifService ?? $this->createMock(NotificationService::class)
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  follow()
    // ======================================================================

    public function testFollowUserSuccess(): void
    {
        $snake  = $this->buildUser(1);
        $otacon = $this->buildUser(2, 'OtaconEmmerich');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($otacon);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findOneBy')->willReturn(null);
        $followRepo->expects($this->once())->method('save');

        $notifService = $this->createMock(NotificationService::class);
        $notifService->expects($this->once())->method('createAndPush');

        $response = $this->makeController($snake, $userRepo, $followRepo, $notifService)->follow(2);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testFollowUserFailsWhenUserNotFound(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($snake, $userRepo)->follow(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testFollowUserFailsWhenFollowingYourself(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(1)->willReturn($snake);

        $response = $this->makeController($snake, $userRepo)->follow(1);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('yourself', $payload['error']);
    }

    public function testFollowUserFailsWhenAlreadyFollowing(): void
    {
        $snake      = $this->buildUser(1);
        $otacon     = $this->buildUser(2, 'OtaconEmmerich');
        $existing   = $this->buildFollow($snake, $otacon);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($otacon);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findOneBy')->willReturn($existing);

        $response = $this->makeController($snake, $userRepo, $followRepo)->follow(2);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Already following', $payload['error']);
    }

    // ======================================================================
    //  unfollow()
    // ======================================================================

    public function testUnfollowUserSuccess(): void
    {
        $snake  = $this->buildUser(1);
        $otacon = $this->buildUser(2, 'OtaconEmmerich');
        $follow = $this->buildFollow($snake, $otacon);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($otacon);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findOneBy')->willReturn($follow);
        $followRepo->expects($this->once())->method('remove');

        $response = $this->makeController($snake, $userRepo, $followRepo)->unfollow(2);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testUnfollowUserFailsWhenUserNotFound(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($snake, $userRepo)->unfollow(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUnfollowUserFailsWhenNotFollowing(): void
    {
        $snake  = $this->buildUser(1);
        $otacon = $this->buildUser(2, 'OtaconEmmerich');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($otacon);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($snake, $userRepo, $followRepo)->unfollow(2);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  followers()
    // ======================================================================

    public function testFollowersReturnsListOfFollowers(): void
    {
        $snake      = $this->buildUser(1);
        $otacon     = $this->buildUser(2, 'OtaconEmmerich');
        $meryl      = $this->buildUser(3, 'MerylSilverburgh');
        $follow1    = $this->buildFollow($otacon, $snake);
        $follow2    = $this->buildFollow($meryl, $snake);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(1)->willReturn($snake);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$follow1, $follow2]);

        $response = $this->makeController($snake, $userRepo, $followRepo)->followers(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('OtaconEmmerich', $payload[0]['username']);
        $this->assertSame('MerylSilverburgh', $payload[1]['username']);
    }

    public function testFollowersReturnsEmptyArrayWhenNone(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(1)->willReturn($snake);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($snake, $userRepo, $followRepo)->followers(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testFollowersFailsWhenUserNotFound(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($snake, $userRepo)->followers(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  following()
    // ======================================================================

    public function testFollowingReturnsListOfFollowedUsers(): void
    {
        $snake  = $this->buildUser(1);
        $otacon = $this->buildUser(2, 'OtaconEmmerich');
        $meryl  = $this->buildUser(3, 'MerylSilverburgh');
        $follow1 = $this->buildFollow($snake, $otacon);
        $follow2 = $this->buildFollow($snake, $meryl);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(1)->willReturn($snake);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$follow1, $follow2]);

        $response = $this->makeController($snake, $userRepo, $followRepo)->following(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('OtaconEmmerich', $payload[0]['username']);
        $this->assertSame('MerylSilverburgh', $payload[1]['username']);
    }

    public function testFollowingReturnsEmptyArrayWhenNone(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(1)->willReturn($snake);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($snake, $userRepo, $followRepo)->following(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testFollowingFailsWhenUserNotFound(): void
    {
        $snake = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($snake, $userRepo)->following(99);

        $this->assertSame(404, $response->getStatusCode());
    }
}
