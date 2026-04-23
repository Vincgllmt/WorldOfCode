<?php

namespace App\Tests\Controller;

use App\Controller\MessageController;
use App\Dto\MessageResponse;
use App\Entity\Messaging\Conversation;
use App\Entity\Messaging\ConversationParticipant;
use App\Entity\Messaging\Message;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\MessageMapper;
use App\Repository\Messaging\ConversationRepository;
use App\Repository\Messaging\MessageReadRepository;
use App\Repository\Messaging\MessageRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Yakuza - Tests unitaires du MessageController
 *
 * KiryuKazuma = utilisateur authentifié courant (Dragon of Dojima)
 * MajimaGoro  = autre utilisateur (Mad Dog of Shimano)
 */
class MessageControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'KiryuKazuma'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@kamurocho.jp')
            ->setFirstname($username)
            ->setLastname('Dojima')
            ->setPassword('DragonOfDojima')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildMessageResponse(string $id = 'msg-uuid-1', string $body = 'Ore wa yakuza da.'): MessageResponse
    {
        $dto = new MessageResponse();
        $dto->id = $id;
        $dto->body = $body;
        $dto->type = 'text';
        $dto->createdAt = '2024-01-01 12:00:00';
        $dto->sender = ['id' => '1', 'username' => 'KiryuKazuma'];
        $dto->conversationId = 'conv-uuid-1';
        $dto->read = false;

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
        ?MessageRepository $messageRepo = null,
        ?ConversationRepository $convRepo = null,
        ?MessageMapper $mapper = null
    ): MessageController {
        $controller = new MessageController(
            $messageRepo ?? $this->createMock(MessageRepository::class),
            $convRepo    ?? $this->createMock(ConversationRepository::class),
            $mapper      ?? $this->createMock(MessageMapper::class)
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListMessagesSuccess(): void
    {
        $kiryu = $this->buildUser(1);
        $dto1  = $this->buildMessageResponse('msg-uuid-1', 'Yakuza nante ni naritakunakatta.');
        $dto2  = $this->buildMessageResponse('msg-uuid-2', 'Sore ga ore no tsumi da.');

        $conv = $this->createMock(Conversation::class);

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('find')->with('conv-uuid-1')->willReturn($conv);

        $messageRepo = $this->createMock(MessageRepository::class);
        $messageRepo->method('findByConversationOrdered')->with('conv-uuid-1')
            ->willReturn([
                $this->createMock(Message::class),
                $this->createMock(Message::class),
            ]);

        $mapper = $this->createMock(MessageMapper::class);
        $mapper->method('toDto')->willReturnOnConsecutiveCalls($dto1, $dto2);

        $response = $this->makeController($kiryu, $messageRepo, $convRepo, $mapper)->list('conv-uuid-1');

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('msg-uuid-1', $payload[0]['id']);
        $this->assertSame('Yakuza nante ni naritakunakatta.', $payload[0]['body']);
        $this->assertSame('msg-uuid-2', $payload[1]['id']);
    }

    public function testListMessagesReturnsEmptyArrayWhenNoMessages(): void
    {
        $kiryu = $this->buildUser(1);
        $conv  = $this->createMock(Conversation::class);

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('find')->with('conv-uuid-1')->willReturn($conv);

        $messageRepo = $this->createMock(MessageRepository::class);
        $messageRepo->method('findByConversationOrdered')->willReturn([]);

        $response = $this->makeController($kiryu, $messageRepo, $convRepo)->list('conv-uuid-1');

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testListMessagesFailsWhenConversationNotFound(): void
    {
        $kiryu = $this->buildUser(1);

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('find')->willReturn(null);

        $response = $this->makeController($kiryu, convRepo: $convRepo)->list('unknown-conv');

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  markConversationAsRead()
    // ======================================================================

    public function testMarkConversationAsReadSuccess(): void
    {
        $kiryu  = $this->buildUser(1);
        $msg1   = $this->createMock(Message::class);
        $msg2   = $this->createMock(Message::class);

        $messageRepo = $this->createMock(MessageRepository::class);
        $messageRepo->method('findByConversationOrdered')->with('conv-uuid-1')
            ->willReturn([$msg1, $msg2]);

        $messageReadRepo = $this->createMock(MessageReadRepository::class);
        $messageReadRepo->expects($this->exactly(2))->method('markAsRead');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($kiryu)
            ->markConversationAsRead('conv-uuid-1', $messageRepo, $messageReadRepo, $em);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('ok', $payload['status']);
    }

    public function testMarkConversationAsReadWithNoMessages(): void
    {
        $kiryu = $this->buildUser(1);

        $messageRepo = $this->createMock(MessageRepository::class);
        $messageRepo->method('findByConversationOrdered')->willReturn([]);

        $messageReadRepo = $this->createMock(MessageReadRepository::class);
        $messageReadRepo->expects($this->never())->method('markAsRead');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($kiryu)
            ->markConversationAsRead('conv-uuid-1', $messageRepo, $messageReadRepo, $em);

        $this->assertSame(200, $response->getStatusCode());
    }

    // ======================================================================
    //  search()
    // ======================================================================

    public function testSearchFailsWhenQueryIsTooShort(): void
    {
        $kiryu    = $this->buildUser(1);
        $request  = Request::create('/api/messaging/messages/search', 'GET', ['q' => 'x']);
        $response = $this->makeController($kiryu)->search($request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testSearchReturnsEmptyArrayWhenNoResults(): void
    {
        $kiryu = $this->buildUser(1);

        $messageRepo = $this->createMock(MessageRepository::class);
        $messageRepo->method('searchByUserAndQuery')->willReturn([]);

        $request  = Request::create('/api/messaging/messages/search', 'GET', ['q' => 'nothingfound']);
        $response = $this->makeController($kiryu, $messageRepo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testSearchReturnsResultsWithConversationInfo(): void
    {
        $kiryu  = $this->buildUser(1);
        $majima = $this->buildUser(2, 'MajimaGoro');

        $participant = $this->createMock(ConversationParticipant::class);
        $participant->method('getUser')->willReturn($majima);

        $conv = $this->createMock(Conversation::class);
        $conv->method('getType')->willReturn('private');
        $conv->method('getParticipants')->willReturn(new ArrayCollection([$participant]));

        $convRepo = $this->createMock(ConversationRepository::class);
        $convRepo->method('find')->with('conv-uuid-1')->willReturn($conv);

        $messageRepo = $this->createMock(MessageRepository::class);
        $messageRepo->method('searchByUserAndQuery')->with(1, 'yakuza')->willReturn([
            [
                'id'              => 'msg-uuid-1',
                'body'            => 'Yakuza nante ni naritakunakatta.',
                'type'            => 'text',
                'created_at'      => '2024-01-01 12:00:00',
                'conversation_id' => 'conv-uuid-1',
                'sender_id'       => 1,
                'sender_username' => 'KiryuKazuma',
            ],
        ]);

        $request  = Request::create('/api/messaging/messages/search', 'GET', ['q' => 'yakuza']);
        $response = $this->makeController($kiryu, $messageRepo, $convRepo)->search($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('msg-uuid-1', $payload[0]['id']);
        $this->assertSame('Yakuza nante ni naritakunakatta.', $payload[0]['body']);
        $this->assertSame('conv-uuid-1', $payload[0]['conversationId']);
        $this->assertSame('KiryuKazuma', $payload[0]['sender']['username']);
        $this->assertSame('private', $payload[0]['conversation']['type']);
    }
}
