<?php

namespace App\Tests\Controller;

use App\Controller\AdminPostController;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Portal — Tests unitaires AdminPostController
 *
 * Chell    = admin authentifié
 * GLaDOS   = auteur du post testé
 */
class AdminPostControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildAdmin(int $id = 1, string $username = 'Chell'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@aperture.science')
            ->setFirstname('Chell')
            ->setLastname('Lab01')
            ->setPassword('PortalGun')
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
        ?PostRepository $repo = null,
        ?ReportRepository $reportRepo = null,
        bool $isAdmin = true,
    ): AdminPostController {
        $controller = new AdminPostController(
            $repo       ?? $this->createMock(PostRepository::class),
            $reportRepo ?? $this->createMock(ReportRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsPosts(): void
    {
        $admin = $this->buildAdmin();
        $repo  = $this->createMock(PostRepository::class);
        $repo->method('findPaginatedWithCounts')->willReturn([
            'items' => [[
                'id'             => 1,
                'content'        => 'Hello Aperture world post content here',
                'authorUsername' => 'GLaDOS',
                'techGroupName'  => 'Science',
                'likesCount'     => 4,
                'commentsCount'  => 2,
                'reportsCount'   => 0,
                'createdAt'      => new \DateTime('2024-06-01'),
            ]],
            'total' => 1,
        ]);

        $response = $this->makeController($admin, $repo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['total']);
        $this->assertCount(1, $payload['items']);
        $this->assertSame('GLaDOS', $payload['items'][0]['authorUsername']);
        $this->assertSame(4, $payload['items'][0]['likesCount']);
    }

    public function testListTruncatesExcerptAt100Chars(): void
    {
        $admin   = $this->buildAdmin();
        $longStr = str_repeat('A', 150);
        $repo    = $this->createMock(PostRepository::class);
        $repo->method('findPaginatedWithCounts')->willReturn([
            'items' => [[
                'id'             => 1,
                'content'        => $longStr,
                'authorUsername' => 'GLaDOS',
                'techGroupName'  => null,
                'likesCount'     => 0,
                'commentsCount'  => 0,
                'reportsCount'   => 0,
                'createdAt'      => new \DateTime(),
            ]],
            'total' => 1,
        ]);

        $response = $this->makeController($admin, $repo)->list(new Request());
        $payload  = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);

        $this->assertStringEndsWith('…', $payload['items'][0]['excerpt']);
        $this->assertSame(101, mb_strlen($payload['items'][0]['excerpt'])); // 100 chars + '…'
    }

    public function testListReturnsEmptyWhenNoPosts(): void
    {
        $admin = $this->buildAdmin();
        $repo  = $this->createMock(PostRepository::class);
        $repo->method('findPaginatedWithCounts')->willReturn(['items' => [], 'total' => 0]);

        $response = $this->makeController($admin, $repo)->list(new Request());

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
}
