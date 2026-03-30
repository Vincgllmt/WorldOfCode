<?php

namespace App\Tests\Controller;

use App\Controller\NotificationController;
use App\Dto\NotificationResponse;
use App\Entity\Notification;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\NotificationMapper;
use App\Repository\NotificationRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Undertale - Tests unitaires du NotificationController
 *
 * FriskDreemurr  = utilisateur authentifié courant (recipient)
 * TorielDreemurr = autre utilisateur (sender)
 */
class NotificationControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'FriskDreemurr'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@underground.mt')
            ->setFirstname($username)
            ->setLastname('Dreemurr')
            ->setPassword('DeterminedSoul')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildNotificationResponse(int $id = 1, string $message = 'TorielDreemurr a commenté votre post'): NotificationResponse
    {
        $dto = new NotificationResponse();
        $dto->id = $id;
        $dto->type = 'comment';
        $dto->message = $message;
        $dto->relatedEntityId = null;
        $dto->isRead = false;
        $dto->createdAt = '2024-01-01 12:00:00';
        $dto->senderId = 2;
        $dto->senderUsername = 'TorielDreemurr';

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
        ?NotificationRepository $repo = null,
        ?NotificationMapper $mapper = null
    ): NotificationController {
        $controller = new NotificationController(
            $repo   ?? $this->createMock(NotificationRepository::class),
            $mapper ?? $this->createMock(NotificationMapper::class)
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsNotifications(): void
    {
        $frisk = $this->buildUser(1);
        $dto1  = $this->buildNotificationResponse(1, 'You received a follow.');
        $dto2  = $this->buildNotificationResponse(2, 'Someone liked your post.');

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('findPaginatedByRecipient')
            ->with($frisk, 1, 20)
            ->willReturn([
                'items'      => [$this->createMock(Notification::class), $this->createMock(Notification::class)],
                'totalItems' => 2,
            ]);

        $mapper = $this->createMock(NotificationMapper::class);
        $mapper->method('toDto')->willReturnOnConsecutiveCalls($dto1, $dto2);

        $request  = new Request();
        $response = $this->makeController($frisk, $repo, $mapper)->list($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload['items']);
        $this->assertSame(1, $payload['page']);
        $this->assertSame(20, $payload['limit']);
        $this->assertSame(2, $payload['totalItems']);
        $this->assertSame(1, $payload['totalPages']);
        $this->assertSame('You received a follow.', $payload['items'][0]['message']);
    }

    public function testListRespectsPageAndLimitParams(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->once())
            ->method('findPaginatedByRecipient')
            ->with($frisk, 2, 10)
            ->willReturn(['items' => [], 'totalItems' => 0]);

        $request = new Request(['page' => '2', 'limit' => '10']);
        $response = $this->makeController($frisk, $repo)->list($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(2, $payload['page']);
        $this->assertSame(10, $payload['limit']);
    }

    public function testListClampsLimitToMax50(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->once())
            ->method('findPaginatedByRecipient')
            ->with($frisk, 1, 50)
            ->willReturn(['items' => [], 'totalItems' => 0]);

        $request  = new Request(['limit' => '999']);
        $response = $this->makeController($frisk, $repo)->list($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(50, $payload['limit']);
    }

    public function testListReturnsTotalPagesCorrectly(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('findPaginatedByRecipient')
            ->willReturn(['items' => [], 'totalItems' => 45]);

        $request  = new Request(['limit' => '20']);
        $response = $this->makeController($frisk, $repo)->list($request);

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(3, $payload['totalPages']); // ceil(45/20) = 3
    }

    // ======================================================================
    //  unreadCount()
    // ======================================================================

    public function testUnreadCountReturnsCount(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('countUnreadByRecipient')->willReturn(7);

        $response = $this->makeController($frisk, $repo)->unreadCount();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(7, $payload['count']);
    }

    public function testUnreadCountReturnsZeroWhenNone(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('countUnreadByRecipient')->willReturn(0);

        $response = $this->makeController($frisk, $repo)->unreadCount();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(0, $payload['count']);
    }

    // ======================================================================
    //  markAllRead()
    // ======================================================================

    public function testMarkAllReadSuccess(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->once())->method('markAllReadByRecipient');

        $response = $this->makeController($frisk, $repo)->markAllRead();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    // ======================================================================
    //  markRead()
    // ======================================================================

    public function testMarkReadSuccess(): void
    {
        $frisk        = $this->buildUser(1);
        $notification = $this->createMock(Notification::class);
        $dto          = $this->buildNotificationResponse(1);

        $notification->method('getRecipient')->willReturn($frisk);
        $notification->expects($this->once())->method('setIsRead')->with(true);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('find')->with(1)->willReturn($notification);
        $repo->expects($this->once())->method('save');

        $mapper = $this->createMock(NotificationMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $response = $this->makeController($frisk, $repo, $mapper)->markRead(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['id']);
    }

    public function testMarkReadFailsWhenNotificationNotFound(): void
    {
        $frisk = $this->buildUser(1);

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($frisk, $repo)->markRead(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testMarkReadFailsWhenNotificationBelongsToAnotherUser(): void
    {
        $frisk  = $this->buildUser(1);
        $toriel = $this->buildUser(2, 'TorielDreemurr');

        $notification = $this->createMock(Notification::class);
        $notification->method('getRecipient')->willReturn($toriel); // appartient à Toriel, pas Frisk

        $repo = $this->createMock(NotificationRepository::class);
        $repo->method('find')->with(1)->willReturn($notification);

        $response = $this->makeController($frisk, $repo)->markRead(1);

        $this->assertSame(403, $response->getStatusCode());
    }
}
