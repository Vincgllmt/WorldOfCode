<?php

namespace App\Tests\Controller;

use App\Controller\FeedController;
use App\Entity\User;
use App\Enum\UserRole;
use App\Service\FeedService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Portal - Tests unitaires du FeedController
 *
 * Chell = utilisateur authentifié qui consulte son feed
 */
class FeedControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'Chell'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@aperturescience.com')
            ->setFirstname($username)
            ->setLastname('TestSubject')
            ->setPassword('hashed')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
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

    private function makeController(User $currentUser, FeedService $feedService): FeedController
    {
        $controller = new FeedController($feedService);
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    private function makeServiceResult(int $page = 1, int $limit = 20, int $total = 0): array
    {
        return [
            'items'      => [],
            'page'       => $page,
            'limit'      => $limit,
            'totalItems' => $total,
            'totalPages' => $total > 0 ? (int) ceil($total / $limit) : 0,
        ];
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturns200(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->method('getFeed')->willReturn($this->makeServiceResult());

        $response = $this->makeController($chell, $feedService)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testListResponseHasExpectedStructureKeys(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->method('getFeed')->willReturn($this->makeServiceResult(1, 20, 42));

        $response = $this->makeController($chell, $feedService)->list(new Request());
        $payload  = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);

        $this->assertArrayHasKey('items', $payload);
        $this->assertArrayHasKey('page', $payload);
        $this->assertArrayHasKey('limit', $payload);
        $this->assertArrayHasKey('totalItems', $payload);
        $this->assertArrayHasKey('totalPages', $payload);
    }

    public function testListUsesDefaultPage1AndLimit20(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->expects($this->once())
            ->method('getFeed')
            ->with($chell, 1, 20)
            ->willReturn($this->makeServiceResult(1, 20));

        $this->makeController($chell, $feedService)->list(new Request());
    }

    public function testListForwardsCustomPageAndLimit(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->expects($this->once())
            ->method('getFeed')
            ->with($chell, 3, 5)
            ->willReturn($this->makeServiceResult(3, 5));

        $request = new Request(query: ['page' => '3', 'limit' => '5']);

        $this->makeController($chell, $feedService)->list($request);
    }

    public function testListCapsLimitAt100(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->expects($this->once())
            ->method('getFeed')
            ->with($chell, 1, 100)
            ->willReturn($this->makeServiceResult(1, 100));

        $request = new Request(query: ['limit' => '999']);

        $this->makeController($chell, $feedService)->list($request);
    }

    public function testListForcesPageToMinimum1(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->expects($this->once())
            ->method('getFeed')
            ->with($chell, 1, 20)
            ->willReturn($this->makeServiceResult(1, 20));

        $request = new Request(query: ['page' => '0']);

        $this->makeController($chell, $feedService)->list($request);
    }

    public function testListForcesNegativePageToMinimum1(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->expects($this->once())
            ->method('getFeed')
            ->with($chell, 1, 20)
            ->willReturn($this->makeServiceResult(1, 20));

        $request = new Request(query: ['page' => '-5']);

        $this->makeController($chell, $feedService)->list($request);
    }

    public function testListForcesLimitToMinimum1(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->expects($this->once())
            ->method('getFeed')
            ->with($chell, 1, 1)
            ->willReturn($this->makeServiceResult(1, 1));

        $request = new Request(query: ['limit' => '0']);

        $this->makeController($chell, $feedService)->list($request);
    }

    public function testListResponseValuesMatchFeedServiceOutput(): void
    {
        $chell = $this->buildUser(1);

        $feedService = $this->createMock(FeedService::class);
        $feedService->method('getFeed')->willReturn($this->makeServiceResult(2, 10, 35));

        $request  = new Request(query: ['page' => '2', 'limit' => '10']);
        $response = $this->makeController($chell, $feedService)->list($request);
        $payload  = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);

        $this->assertSame(2, $payload['page']);
        $this->assertSame(10, $payload['limit']);
        $this->assertSame(35, $payload['totalItems']);
        $this->assertSame(4, $payload['totalPages']); // ceil(35/10) = 4
    }
}
