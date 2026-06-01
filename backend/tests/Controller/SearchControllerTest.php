<?php

namespace App\Tests\Controller;

use App\Controller\SearchController;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\TechGroupRepository;
use App\Repository\UserRepository;
use App\Service\Elasticsearch\SearchService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Sekiro: Shadows Die Twice - Tests unitaires du SearchController
 *
 * WolfShinobi      = utilisateur authentifié courant (Dragon's Heritage)
 * KuroTheDivineHeir = autre utilisateur (recherché dans les résultats)
 */
class SearchControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'WolfShinobi'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@ashina.jp')
            ->setFirstname($username)
            ->setLastname('Ashina')
            ->setPassword('ShadowsDieTwice')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildTechGroup(int $id, string $name = 'Ashina Shinobi'): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);

        $idProp = new \ReflectionProperty(TechGroup::class, 'id');
        $idProp->setValue($group, $id);

        return $group;
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
        ?TechGroupRepository $groupRepo = null,
        ?SearchService $searchService = null,
    ): SearchController {
        // Par défaut, on simule un cluster Elasticsearch indisponible :
        // searchUsers / searchGroups throw → le controller bascule sur la recherche SQL,
        // et searchPosts retourne un tableau vide.
        if ($searchService === null) {
            $searchService = $this->createMock(SearchService::class);
            $searchService->method('searchUsers')->willThrowException(new \RuntimeException('ES down'));
            $searchService->method('searchGroups')->willThrowException(new \RuntimeException('ES down'));
            $searchService->method('searchPosts')->willReturn([]);
        }

        $controller = new SearchController(
            $userRepo      ?? $this->createMock(UserRepository::class),
            $groupRepo     ?? $this->createMock(TechGroupRepository::class),
            $searchService,
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  search()
    // ======================================================================

    public function testSearchReturnsUsersAndGroups(): void
    {
        $wolf = $this->buildUser(1);
        $kuro = $this->buildUser(2, 'KuroTheDivineHeir');
        $group = $this->buildTechGroup(1, 'Ashina Arts');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('searchByQuery')->with('kuro', 5)->willReturn([$kuro]);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('searchByQuery')->with('kuro', 5)->willReturn([$group]);

        $request  = new Request(['q' => 'kuro']);
        $response = $this->makeController($wolf, $userRepo, $groupRepo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload['users']);
        $this->assertSame('KuroTheDivineHeir', $payload['users'][0]['username']);
        $this->assertCount(1, $payload['groups']);
        $this->assertSame('Ashina Arts', $payload['groups'][0]['name']);
    }

    public function testSearchReturnsEmptyWhenQueryIsEmpty(): void
    {
        $wolf = $this->buildUser(1);

        $userRepo  = $this->createMock(UserRepository::class);
        $userRepo->expects($this->never())->method('searchByQuery');

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->expects($this->never())->method('searchByQuery');

        $request  = new Request(['q' => '']);
        $response = $this->makeController($wolf, $userRepo, $groupRepo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload['users']);
        $this->assertSame([], $payload['groups']);
    }

    public function testSearchReturnsEmptyWhenNoResults(): void
    {
        $wolf = $this->buildUser(1);

        $userRepo  = $this->createMock(UserRepository::class);
        $userRepo->method('searchByQuery')->willReturn([]);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('searchByQuery')->willReturn([]);

        $request  = new Request(['q' => 'unknown']);
        $response = $this->makeController($wolf, $userRepo, $groupRepo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload['users']);
        $this->assertSame([], $payload['groups']);
    }

    public function testSearchClampsLimitTo50(): void
    {
        $wolf = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->expects($this->once())
            ->method('searchByQuery')
            ->with('wolf', 50)
            ->willReturn([]);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->expects($this->once())
            ->method('searchByQuery')
            ->with('wolf', 50)
            ->willReturn([]);

        $request  = new Request(['q' => 'wolf', 'limit' => '999']);
        $response = $this->makeController($wolf, $userRepo, $groupRepo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
    }
}
