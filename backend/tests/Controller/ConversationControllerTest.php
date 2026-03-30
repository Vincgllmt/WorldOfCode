<?php

namespace App\Tests\Controller;

use App\Controller\ConversationController;
use App\Dto\ConversationResponse;
use App\Entity\Messaging\Conversation;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\ConversationMapper;
use App\Repository\Messaging\ConversationRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Assassin's Creed - Tests unitaires du ConversationController
 *
 * EzioAuditore   = utilisateur authentifié courant
 * AltairIbnLaAhad = autre utilisateur (cible de la conversation)
 */
class ConversationControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'EzioAuditore'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@assassins.creed')
            ->setFirstname($username)
            ->setLastname('Brotherhood')
            ->setPassword('NothingIsTrue')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildConversationResponse(string $id = 'conv-uuid-1', string $otherUsername = 'AltairIbnLaAhad'): ConversationResponse
    {
        $dto = new ConversationResponse();
        $dto->id = $id;
        $dto->type = 'direct';
        $dto->title = null;
        $dto->createdAt = '2024-01-01 12:00:00';
        $dto->participants = [['id' => 2, 'username' => $otherUsername]];

        return $dto;
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
        ConversationRepository $convRepo,
        ?UserRepository $userRepo = null,
        ?ConversationMapper $mapper = null
    ): ConversationController {
        $controller = new ConversationController(
            $convRepo,
            $userRepo   ?? $this->createMock(UserRepository::class),
            $mapper     ?? $this->createMock(ConversationMapper::class),
            $this->createMock(EntityManagerInterface::class)
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateConversationSuccess(): void
    {
        $ezio   = $this->buildUser(1);
        $altair = $this->buildUser(2, 'AltairIbnLaAhad');
        $dto    = $this->buildConversationResponse();

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('findDirectConversationBetween')->willReturn(null);
        $convRepo->expects($this->once())->method('save');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($altair);

        $mapper = $this->createMock(ConversationMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $request = new Request(content: json_encode(['targetUserId' => 2], JSON_THROW_ON_ERROR));

        $response = $this->makeController($ezio, $convRepo, $userRepo, $mapper)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('conv-uuid-1', $payload['id']);
        $this->assertSame('direct', $payload['type']);
        $this->assertSame('AltairIbnLaAhad', $payload['participants'][0]['username']);
    }

    public function testCreateConversationReturnsExistingConversation(): void
    {
        $ezio        = $this->buildUser(1);
        $altair      = $this->buildUser(2, 'AltairIbnLaAhad');
        $existingConv = $this->createMock(Conversation::class);
        $dto         = $this->buildConversationResponse('conv-existing');

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('findDirectConversationBetween')->willReturn($existingConv);
        $convRepo->expects($this->never())->method('save');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($altair);

        $mapper = $this->createMock(ConversationMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $request = new Request(content: json_encode(['targetUserId' => 2], JSON_THROW_ON_ERROR));

        $response = $this->makeController($ezio, $convRepo, $userRepo, $mapper)->create($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('conv-existing', $payload['id']);
    }

    public function testCreateConversationFailsWhenTargetUserIdIsMissing(): void
    {
        $ezio = $this->buildUser(1);

        $convRepo = $this->createMock(ConversationRepository::class);

        $request = new Request(content: json_encode([], JSON_THROW_ON_ERROR));

        $response = $this->makeController($ezio, $convRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateConversationFailsWhenTargetUserNotFound(): void
    {
        $ezio = $this->buildUser(1);

        $convRepo = $this->createMock(ConversationRepository::class);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['targetUserId' => 99], JSON_THROW_ON_ERROR));

        $response = $this->makeController($ezio, $convRepo, $userRepo)->create($request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListConversationsReturnsAll(): void
    {
        $ezio = $this->buildUser(1);
        $dto1 = $this->buildConversationResponse('conv-uuid-1');
        $dto2 = $this->buildConversationResponse('conv-uuid-2');

        $conv1 = $this->createMock(Conversation::class);
        $conv2 = $this->createMock(Conversation::class);

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('findByUserId')->with(1)->willReturn([$conv1, $conv2]);

        $mapper = $this->createMock(ConversationMapper::class);
        $mapper->method('toDto')
            ->willReturnOnConsecutiveCalls($dto1, $dto2);

        $response = $this->makeController($ezio, $convRepo, mapper: $mapper)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('conv-uuid-1', $payload[0]['id']);
        $this->assertSame('conv-uuid-2', $payload[1]['id']);
    }

    public function testListConversationsReturnsEmptyArrayWhenNone(): void
    {
        $ezio = $this->buildUser(1);

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('findByUserId')->with(1)->willReturn([]);

        $response = $this->makeController($ezio, $convRepo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }
}
