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
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
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
    ): AdminUserController {
        $controller = new AdminUserController(
            $userRepo    ?? $this->createMock(UserRepository::class),
            $reportRepo  ?? $this->createMock(ReportRepository::class),
            $this->createMock(SkillMapper::class),
            $this->createMock(UserLinkMapper::class),
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
        $repo->method('findAllWithCounts')->willReturn([
            [
                'id'           => 2,
                'username'     => 'GarrusVakarian',
                'email'        => 'garrus@citadel.net',
                'role'         => UserRole::ROLE_USER,
                'creationDate' => new \DateTime('2024-01-01'),
                'postCount'    => 5,
                'followerCount'=> 10,
                'avatarUrl'    => null,
            ],
        ]);

        $response = $this->makeController($admin, $repo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('GarrusVakarian', $payload[0]['username']);
        $this->assertSame(5, $payload[0]['postCount']);
    }

    public function testListReturnsEmptyWhenNoUsers(): void
    {
        $admin = $this->buildAdmin();
        $repo  = $this->createMock(UserRepository::class);
        $repo->method('findAllWithCounts')->willReturn([]);

        $response = $this->makeController($admin, $repo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list();
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
}
