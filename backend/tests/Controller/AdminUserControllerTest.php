<?php

namespace App\Tests\Controller;

use App\Controller\AdminUserController;
use App\Dto\AdminPostSummaryDto;
use App\Entity\Post;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\SkillMapper;
use App\Mapper\UserLinkMapper;
use App\Repository\ReportRepository;
use App\Repository\UserRepository;
use App\Service\UserBanNotificationService;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Mass Effect — Tests unitaires AdminUserController
 *
 * ShepardN7   = admin authentifié
 * GarrusVakarian = utilisateur cible
 */
class AdminUserControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id = 2, string $username = 'GarrusVakarian'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@normandy.sr2')
            ->setFirstname('Garrus')
            ->setLastname('Vakarian')
            ->setPassword('Turian42')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildAdmin(int $id = 1, string $username = 'ShepardN7'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@normandy.sr2')
            ->setFirstname('Commander')
            ->setLastname('Shepard')
            ->setPassword('N7Special')
            ->setRole(UserRole::ROLE_ADMIN);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeContainer(User $currentUser, bool $isAdmin = true): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturnCallback(
            fn(string $attr) => match ($attr) {
                'ROLE_ADMIN' => $isAdmin,
                default      => true,
            }
        );

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
        ?ReportRepository $reportRepo = null,
        bool $isAdmin = true,
        ?UserBanNotificationService $banNotification = null,
    ): AdminUserController {
        $controller = new AdminUserController(
            $userRepo         ?? $this->createMock(UserRepository::class),
            $reportRepo       ?? $this->createMock(ReportRepository::class),
            $this->createMock(SkillMapper::class),
            $this->createMock(UserLinkMapper::class),
            $banNotification  ?? $this->createMock(UserBanNotificationService::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsUsers(): void
    {
        $admin = $this->buildAdmin();
        $repo  = $this->createMock(UserRepository::class);
        $repo->method('findPaginatedWithCounts')->willReturn([
            'items' => [[
                'id'           => 2,
                'username'     => 'GarrusVakarian',
                'email'        => 'garrus@citadel.net',
                'role'         => UserRole::ROLE_USER,
                'creationDate' => new \DateTime('2024-01-01'),
                'postCount'    => 5,
                'followerCount'=> 10,
                'avatarUrl'    => null,
            ]],
            'total' => 1,
        ]);

        $response = $this->makeController($admin, $repo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['total']);
        $this->assertCount(1, $payload['items']);
        $this->assertSame('GarrusVakarian', $payload['items'][0]['username']);
        $this->assertSame(5, $payload['items'][0]['postCount']);
    }

    public function testListReturnsEmptyWhenNoUsers(): void
    {
        $admin = $this->buildAdmin();
        $repo  = $this->createMock(UserRepository::class);
        $repo->method('findPaginatedWithCounts')->willReturn(['items' => [], 'total' => 0]);

        $response = $this->makeController($admin, $repo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(0, $payload['total']);
        $this->assertSame([], $payload['items']);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list(new Request());
    }

    // ======================================================================
    //  detail()
    // ======================================================================

    public function testDetailReturnsUserProfile(): void
    {
        $admin = $this->buildAdmin();
        $user  = $this->createMock(User::class);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, 42);

        $user->method('getId')->willReturn(42);
        $user->method('getUsername')->willReturn('GarrusVakarian');
        $user->method('getFirstname')->willReturn('Garrus');
        $user->method('getLastname')->willReturn('Vakarian');
        $user->method('getEmail')->willReturn('garrus@citadel.net');
        $user->method('getRole')->willReturn(UserRole::ROLE_USER);
        $user->method('getCreationDate')->willReturn(new \DateTime('2024-01-01'));
        $user->method('getAvatarUrl')->willReturn(null);
        $user->method('getBio')->willReturn(null);
        $user->method('getLocation')->willReturn(null);
        $user->method('getAvailability')->willReturn(null);
        $user->method('getExperiences')->willReturn([]);
        $user->method('getPosts')->willReturn(new ArrayCollection([]));
        $user->method('getSkills')->willReturn(new ArrayCollection([]));
        $user->method('getLinks')->willReturn(new ArrayCollection([]));

        $userRepo   = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(42)->willReturn($user);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('countByAuthorId')->with(42)->willReturn(3);

        $response = $this->makeController($admin, $userRepo, $reportRepo)->detail(42);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('GarrusVakarian', $payload['username']);
        $this->assertSame(3, $payload['reportCountOnPosts']);
    }

    public function testDetailThrowsWhenUserNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $userRepo)->detail(999);
    }

    public function testDetailDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->detail(1);
    }

    public function testDetailTruncatesPostContentOver80Characters(): void
    {
        $admin       = $this->buildAdmin();
        $longContent = str_repeat('G', 100); // 100 chars > 80

        $post = $this->createMock(Post::class);
        $post->method('getContent')->willReturn($longContent);
        $post->method('getId')->willReturn(10);
        $post->method('getCreatedAt')->willReturn(new \DateTime('2024-06-01'));
        $post->method('getLikes')->willReturn(new ArrayCollection([]));
        $post->method('getComments')->willReturn(new ArrayCollection([]));

        $user = $this->createMock(User::class);
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, 42);
        $user->method('getId')->willReturn(42);
        $user->method('getUsername')->willReturn('GarrusVakarian');
        $user->method('getFirstname')->willReturn('Garrus');
        $user->method('getLastname')->willReturn('Vakarian');
        $user->method('getEmail')->willReturn('garrus@citadel.net');
        $user->method('getRole')->willReturn(UserRole::ROLE_USER);
        $user->method('getCreationDate')->willReturn(new \DateTime('2024-01-01'));
        $user->method('getAvatarUrl')->willReturn(null);
        $user->method('getBio')->willReturn(null);
        $user->method('getLocation')->willReturn(null);
        $user->method('getAvailability')->willReturn(null);
        $user->method('getExperiences')->willReturn([]);
        $user->method('getPosts')->willReturn(new ArrayCollection([$post]));
        $user->method('getSkills')->willReturn(new ArrayCollection([]));
        $user->method('getLinks')->willReturn(new ArrayCollection([]));

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($user);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('countByAuthorId')->willReturn(0);

        $response = $this->makeController($admin, $userRepo, $reportRepo)->detail(42);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload['lastFivePosts']);
        $this->assertSame(mb_substr($longContent, 0, 80) . '…', $payload['lastFivePosts'][0]['excerpt']);
    }

    public function testDetailKeepsShortPostContentAsIs(): void
    {
        $admin        = $this->buildAdmin();
        $shortContent = 'Garrus calibrating weapons systems.'; // < 80 chars

        $post = $this->createMock(Post::class);
        $post->method('getContent')->willReturn($shortContent);
        $post->method('getId')->willReturn(11);
        $post->method('getCreatedAt')->willReturn(new \DateTime('2024-06-01'));
        $post->method('getLikes')->willReturn(new ArrayCollection([]));
        $post->method('getComments')->willReturn(new ArrayCollection([]));

        $user = $this->createMock(User::class);
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, 42);
        $user->method('getId')->willReturn(42);
        $user->method('getUsername')->willReturn('GarrusVakarian');
        $user->method('getFirstname')->willReturn('Garrus');
        $user->method('getLastname')->willReturn('Vakarian');
        $user->method('getEmail')->willReturn('garrus@citadel.net');
        $user->method('getRole')->willReturn(UserRole::ROLE_USER);
        $user->method('getCreationDate')->willReturn(new \DateTime('2024-01-01'));
        $user->method('getAvatarUrl')->willReturn(null);
        $user->method('getBio')->willReturn(null);
        $user->method('getLocation')->willReturn(null);
        $user->method('getAvailability')->willReturn(null);
        $user->method('getExperiences')->willReturn([]);
        $user->method('getPosts')->willReturn(new ArrayCollection([$post]));
        $user->method('getSkills')->willReturn(new ArrayCollection([]));
        $user->method('getLinks')->willReturn(new ArrayCollection([]));

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($user);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('countByAuthorId')->willReturn(0);

        $response = $this->makeController($admin, $userRepo, $reportRepo)->detail(42);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame($shortContent, $payload['lastFivePosts'][0]['excerpt']);
    }

    // ======================================================================
    //  updateRole()
    // ======================================================================

    private function makeJsonRequest(array $payload): Request
    {
        return Request::create('', 'PUT', [], [], [], [], json_encode($payload) ?: '');
    }

    public function testUpdateRolePromotesToAdmin(): void
    {
        $admin = $this->buildAdmin();

        $target = new User();
        $target->setUsername('GarrusVakarian')
            ->setEmail('garrus@citadel.net')
            ->setFirstname('Garrus')
            ->setLastname('Vakarian')
            ->setPassword('hash')
            ->setRole(UserRole::ROLE_USER);
        (new \ReflectionProperty(User::class, 'id'))->setValue($target, 42);
        $target->onCreate();

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(42)->willReturn($target);
        $userRepo->expects($this->once())->method('save')->with($target, true);

        $response = $this->makeController($admin, $userRepo)
            ->updateRole(42, $this->makeJsonRequest(['role' => 'ROLE_ADMIN']));

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
        $this->assertSame(UserRole::ROLE_ADMIN, $target->getRole());
    }

    public function testUpdateRoleDemotesToUser(): void
    {
        $admin = $this->buildAdmin();

        $target = new User();
        $target->setUsername('GarrusVakarian')
            ->setEmail('garrus@citadel.net')
            ->setFirstname('Garrus')
            ->setLastname('Vakarian')
            ->setPassword('hash')
            ->setRole(UserRole::ROLE_ADMIN);
        (new \ReflectionProperty(User::class, 'id'))->setValue($target, 42);
        $target->onCreate();

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(42)->willReturn($target);
        $userRepo->expects($this->once())->method('save');

        $response = $this->makeController($admin, $userRepo)
            ->updateRole(42, $this->makeJsonRequest(['role' => 'ROLE_USER']));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(UserRole::ROLE_USER, $target->getRole());
    }

    public function testUpdateRoleReturns404WhenUserNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $userRepo)
            ->updateRole(999, $this->makeJsonRequest(['role' => 'ROLE_ADMIN']));
    }

    public function testUpdateRoleReturns400WhenRoleMissing(): void
    {
        $admin  = $this->buildAdmin();
        $target = new User();
        $target->setUsername('GarrusVakarian')
            ->setEmail('garrus@citadel.net')
            ->setFirstname('Garrus')
            ->setLastname('Vakarian')
            ->setPassword('hash')
            ->setRole(UserRole::ROLE_USER);
        (new \ReflectionProperty(User::class, 'id'))->setValue($target, 42);
        $target->onCreate();

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($target);

        $response = $this->makeController($admin, $userRepo)
            ->updateRole(42, $this->makeJsonRequest([]));

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testUpdateRoleReturns400WhenRoleInvalid(): void
    {
        $admin  = $this->buildAdmin();
        $target = new User();
        $target->setUsername('GarrusVakarian')
            ->setEmail('garrus@citadel.net')
            ->setFirstname('Garrus')
            ->setLastname('Vakarian')
            ->setPassword('hash')
            ->setRole(UserRole::ROLE_USER);
        (new \ReflectionProperty(User::class, 'id'))->setValue($target, 42);
        $target->onCreate();

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($target);

        $response = $this->makeController($admin, $userRepo)
            ->updateRole(42, $this->makeJsonRequest(['role' => 'ROLE_SUPERVILLAIN']));

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testUpdateRoleDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)
            ->updateRole(1, $this->makeJsonRequest(['role' => 'ROLE_ADMIN']));
    }

    // ======================================================================
    //  ban()
    // ======================================================================

    public function testBanUserSuccess(): void
    {
        $admin  = $this->buildAdmin();
        $target = $this->buildUser();

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($target);
        $userRepo->expects($this->once())->method('save')->with($target, true);

        $banNotification = $this->createMock(UserBanNotificationService::class);
        $banNotification->expects($this->once())->method('sendBanEmail')->with($target, null);

        $request  = $this->makeJsonRequest([]);
        $response = $this->makeController($admin, $userRepo, banNotification: $banNotification)->ban(2, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
        $this->assertTrue($target->isBanned());
    }

    public function testBanUserWithReason(): void
    {
        $admin  = $this->buildAdmin();
        $target = $this->buildUser();

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($target);

        $banNotification = $this->createMock(UserBanNotificationService::class);
        $banNotification->expects($this->once())->method('sendBanEmail')->with($target, 'Spam répété');

        $request  = $this->makeJsonRequest(['reason' => 'Spam répété']);
        $response = $this->makeController($admin, $userRepo, banNotification: $banNotification)->ban(2, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Spam répété', $target->getBannedReason());
    }

    public function testBanUserReturns404WhenNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $userRepo)->ban(999, $this->makeJsonRequest([]));
    }

    public function testBanUserReturns400WhenTargetIsAdmin(): void
    {
        $admin  = $this->buildAdmin();
        $target = $this->buildAdmin(2, 'TalisZorah'); // autre admin

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($target);

        $response = $this->makeController($admin, $userRepo)->ban(2, $this->makeJsonRequest([]));

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testBanUserReturns400WhenAlreadyBanned(): void
    {
        $admin  = $this->buildAdmin();
        $target = $this->buildUser();
        $target->setIsBanned(true);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($target);

        $response = $this->makeController($admin, $userRepo)->ban(2, $this->makeJsonRequest([]));

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    // ======================================================================
    //  unban()
    // ======================================================================

    public function testUnbanUserSuccess(): void
    {
        $admin  = $this->buildAdmin();
        $target = $this->buildUser();
        $target->setIsBanned(true)->setBannedAt(new \DateTime())->setBannedReason('Spam');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($target);
        $userRepo->expects($this->once())->method('save')->with($target, true);

        $banNotification = $this->createMock(UserBanNotificationService::class);
        $banNotification->expects($this->once())->method('sendUnbanEmail')->with($target);

        $response = $this->makeController($admin, $userRepo, banNotification: $banNotification)->unban(2);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
        $this->assertFalse($target->isBanned());
        $this->assertNull($target->getBannedAt());
        $this->assertNull($target->getBannedReason());
    }

    public function testUnbanUserReturns404WhenNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $userRepo)->unban(999);
    }

    public function testUnbanUserReturns400WhenNotBanned(): void
    {
        $admin  = $this->buildAdmin();
        $target = $this->buildUser(); // isBanned = false par défaut

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($target);

        $response = $this->makeController($admin, $userRepo)->unban(2);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }
}
