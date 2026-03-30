<?php

namespace App\Tests\Controller;

use App\Controller\SuggestionController;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\UserMapper;
use App\Service\SuggestionService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 God of War - Tests unitaires du SuggestionController
 *
 * KratosGhost = utilisateur authentifié courant (Ghost of Sparta)
 * FreyrAesir  = autre utilisateur (suggéré)
 */
class SuggestionControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'KratosGhost'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@sparta.gr')
            ->setFirstname($username)
            ->setLastname('GhostOfSparta')
            ->setPassword('BladeOfOlympus')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildSuggestion(User $user, float $score = 1.5): array
    {
        return [
            'user'               => $user,
            'score'              => $score,
            'sharedSkills'       => ['PHP', 'Symfony'],
            'sharedGroups'       => ['Backend Warriors'],
            'mutualFollowsCount' => 3,
        ];
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
        ?SuggestionService $service = null,
        ?UserMapper $mapper = null
    ): SuggestionController {
        $controller = new SuggestionController(
            $service ?? $this->createMock(SuggestionService::class),
            $mapper  ?? $this->createMock(UserMapper::class)
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  suggestedUsers()
    // ======================================================================

    public function testSuggestedUsersReturnsSuggestions(): void
    {
        $kratos = $this->buildUser(1);
        $freyr  = $this->buildUser(2, 'FreyrAesir');

        $service = $this->createMock(SuggestionService::class);
        $service->method('getSuggestedUsers')
            ->with($kratos, 5, 0)
            ->willReturn([$this->buildSuggestion($freyr, 2.5)]);

        $request  = new Request();
        $response = $this->makeController($kratos, $service)->suggestedUsers($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('FreyrAesir', $payload[0]['username']);
        $this->assertSame(2.5, $payload[0]['score']);
        $this->assertSame(['PHP', 'Symfony'], $payload[0]['sharedSkills']);
        $this->assertSame(['Backend Warriors'], $payload[0]['sharedGroups']);
        $this->assertSame(3, $payload[0]['mutualFollowsCount']);
    }

    public function testSuggestedUsersReturnsEmptyWhenNone(): void
    {
        $kratos = $this->buildUser(1);

        $service = $this->createMock(SuggestionService::class);
        $service->method('getSuggestedUsers')->willReturn([]);

        $request  = new Request();
        $response = $this->makeController($kratos, $service)->suggestedUsers($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testSuggestedUsersClampsLimitTo20(): void
    {
        $kratos = $this->buildUser(1);

        $service = $this->createMock(SuggestionService::class);
        $service->expects($this->once())
            ->method('getSuggestedUsers')
            ->with($kratos, 20, 0)
            ->willReturn([]);

        $request  = new Request(['limit' => '999']);
        $response = $this->makeController($kratos, $service)->suggestedUsers($request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testSuggestedUsersRespectsLimitAndOffset(): void
    {
        $kratos = $this->buildUser(1);

        $service = $this->createMock(SuggestionService::class);
        $service->expects($this->once())
            ->method('getSuggestedUsers')
            ->with($kratos, 10, 5)
            ->willReturn([]);

        $request  = new Request(['limit' => '10', 'offset' => '5']);
        $response = $this->makeController($kratos, $service)->suggestedUsers($request);

        $this->assertSame(200, $response->getStatusCode());
    }
}
