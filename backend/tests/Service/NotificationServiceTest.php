<?php

namespace App\Tests\Service;

use App\Dto\NotificationResponse;
use App\Entity\Notification;
use App\Entity\User;
use App\Enum\NotificationType;
use App\Enum\UserRole;
use App\Mapper\NotificationMapper;
use App\Repository\NotificationRepository;
use App\Service\NotificationService;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * 🎮 Overwatch - Tests unitaires du NotificationService
 *
 * TraceOxton    = destinataire de la notification (Tracer)
 * SoldiersGabe  = expéditeur de la notification (Reaper)
 */
class NotificationServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@overwatch.gg')
            ->setFirstname($username)
            ->setLastname('Hero')
            ->setPassword('hashed')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeService(
        ?NotificationRepository $repo = null,
        ?NotificationMapper $mapper = null,
        ?HttpClientInterface $httpClient = null,
        string $messagerieUrl = 'http://messagerie.test',
        string $internalSecret = 'test-internal-secret'
    ): NotificationService {
        return new NotificationService(
            $repo       ?? $this->createMock(NotificationRepository::class),
            $mapper     ?? $this->createMock(NotificationMapper::class),
            $httpClient ?? $this->createMock(HttpClientInterface::class),
            $messagerieUrl,
            $internalSecret
        );
    }

    // ======================================================================
    //  createAndPush()
    // ======================================================================

    public function testCreateAndPushSavesNotificationAndCallsHttp(): void
    {
        $tracer = $this->buildUser(1, 'TraceOxton');
        $reaper = $this->buildUser(2, 'SoldiersGabe');

        $dto = new NotificationResponse();
        $dto->id = 0;
        $dto->type = 'follow';
        $dto->message = 'SoldiersGabe vous suit';
        $dto->isRead = false;
        $dto->createdAt = '2026-01-01 00:00:00';
        $dto->senderId = 2;
        $dto->senderUsername = 'SoldiersGabe';
        $dto->relatedEntityId = null;

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->once())->method('save');

        $mapper = $this->createMock(NotificationMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $httpResponse = $this->createMock(ResponseInterface::class);
        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->expects($this->once())
            ->method('request')
            ->with('POST', 'http://messagerie.test/api/notify')
            ->willReturn($httpResponse);

        $service = $this->makeService($repo, $mapper, $httpClient);
        $service->createAndPush($tracer, $reaper, NotificationType::FOLLOW, 'SoldiersGabe vous suit');
    }

    public function testCreateAndPushWithRelatedEntityId(): void
    {
        $tracer = $this->buildUser(1, 'TraceOxton');
        $reaper = $this->buildUser(2, 'SoldiersGabe');

        $dto = new NotificationResponse();
        $dto->id = 0;
        $dto->type = 'like';
        $dto->message = 'SoldiersGabe a liké votre post';
        $dto->isRead = false;
        $dto->createdAt = '2026-01-01 00:00:00';
        $dto->senderId = 2;
        $dto->senderUsername = 'SoldiersGabe';
        $dto->relatedEntityId = 42;

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->once())->method('save');

        $mapper = $this->createMock(NotificationMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->expects($this->once())->method('request');

        $service = $this->makeService($repo, $mapper, $httpClient);
        $service->createAndPush($tracer, $reaper, NotificationType::LIKE, 'SoldiersGabe a liké votre post', 42);
    }

    public function testCreateAndPushSkipsSelfNotification(): void
    {
        $tracer = $this->buildUser(1, 'TraceOxton');

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->never())->method('save');

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->expects($this->never())->method('request');

        $service = $this->makeService($repo, null, $httpClient);
        $service->createAndPush($tracer, $tracer, NotificationType::COMMENT, 'Test auto-notif');
    }

    public function testCreateAndPushContinuesWhenHttpFails(): void
    {
        $tracer = $this->buildUser(1, 'TraceOxton');
        $reaper = $this->buildUser(2, 'SoldiersGabe');

        $dto = new NotificationResponse();
        $dto->id = 0;
        $dto->type = 'comment';
        $dto->message = 'SoldiersGabe a commenté';
        $dto->isRead = false;
        $dto->createdAt = '2026-01-01 00:00:00';
        $dto->senderId = 2;
        $dto->senderUsername = 'SoldiersGabe';
        $dto->relatedEntityId = null;

        $repo = $this->createMock(NotificationRepository::class);
        $repo->expects($this->once())->method('save');

        $mapper = $this->createMock(NotificationMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willThrowException(new \RuntimeException('Connection refused'));

        $service = $this->makeService($repo, $mapper, $httpClient);

        // Ne doit pas lever d'exception
        $service->createAndPush($tracer, $reaper, NotificationType::COMMENT, 'SoldiersGabe a commenté');
    }
}
