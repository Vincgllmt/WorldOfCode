<?php

namespace App\Tests\Controller;

use App\Controller\GroupSuggestionController;
use App\Entity\User;
use App\Enum\SuggestionStatus;
use App\Enum\UserRole;
use App\Repository\GroupSuggestionRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 The Witcher 3 - Tests unitaires du GroupSuggestionController
 *
 * GeraltRivia       = utilisateur authentifié qui soumet des suggestions
 * YenneferVengerberg = autre utilisateur
 */
class GroupSuggestionControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'GeraltRivia'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@kaer-morhen.com')
            ->setFirstname($username)
            ->setLastname('OfRivia')
            ->setPassword('SilverSword!1337')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeContainer(User $currentUser, bool $isGranted = true): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn($isGranted);

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
        ?GroupSuggestionRepository $repo = null,
        bool $isGranted = true,
    ): GroupSuggestionController {
        $controller = new GroupSuggestionController(
            $repo ?? $this->createMock(GroupSuggestionRepository::class),
        );

        $controller->setContainer($this->makeContainer($currentUser, $isGranted));

        return $controller;
    }

    private function makeRequest(array $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data));
    }

    // ======================================================================
    //  submit()
    // ======================================================================

    public function testSubmitCreatesGroupSuggestion(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->once())->method('save');

        $request  = $this->makeRequest(['name' => 'Rust Developers']);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Rust Developers', $payload['name']);
        $this->assertSame(SuggestionStatus::PENDING->value, $payload['status']);
    }

    public function testSubmitWithDescriptionAndRssFeedUrl(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->once())->method('save');

        $request = $this->makeRequest([
            'name'        => 'PHP Enthusiasts',
            'description' => 'Groupe dédié à PHP',
            'rssFeedUrl'  => 'https://php.net/feed.xml',
        ]);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('PHP Enthusiasts', $payload['name']);
    }

    public function testSubmitReturns400WhenNameIsEmpty(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->never())->method('save');

        $request  = $this->makeRequest(['name' => '']);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testSubmitReturns400WhenNameIsTooShort(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->never())->method('save');

        $request  = $this->makeRequest(['name' => 'A']);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testSubmitReturns400WhenNameIsTooLong(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->never())->method('save');

        $request  = $this->makeRequest(['name' => str_repeat('x', 256)]);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testSubmitReturns400WhenNameIsMissing(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->never())->method('save');

        $request  = $this->makeRequest([]);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testSubmitWithMinimalValidName(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->once())->method('save');

        $request  = $this->makeRequest(['name' => 'Go']);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testSubmitWithNameAtMaxLength(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->once())->method('save');

        $request  = $this->makeRequest(['name' => str_repeat('x', 255)]);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testSubmitIgnoresEmptyDescriptionAndRssUrl(): void
    {
        $geralt = $this->buildUser(1);

        $repo = $this->createMock(GroupSuggestionRepository::class);
        $repo->expects($this->once())->method('save');

        $request  = $this->makeRequest(['name' => 'Valid Group', 'description' => '', 'rssFeedUrl' => '']);
        $response = $this->makeController($geralt, $repo)->submit($request);

        $this->assertSame(201, $response->getStatusCode());
    }
}
