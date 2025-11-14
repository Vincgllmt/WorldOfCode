<?php

namespace App\Tests\Controller;

use App\Entity\User;
use App\Entity\Messaging\Conversation;
use App\Entity\Messaging\ConversationParticipant;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;
use Ramsey\Uuid\Uuid;

class MessageControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;

    private $userData1 = [
        'username' => 'Zagreus',
        'password' => 'EscapeFromHell',
    ];

    private $userData2 = [
        'username' => 'Thanatos',
        'password' => 'DeathIncarnate',
    ];

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = $this->client->getContainer()->get(EntityManagerInterface::class);

        // Clean up existing users
        $this->removeExistingUsers();

        // Create test users
        $this->registerUser($this->userData1);
        $this->registerUser($this->userData2);
    }

    protected function tearDown(): void
    {
        $this->removeExistingUsers();
        parent::tearDown();
        $this->entityManager->close();
        $this->entityManager = null;
    }

    private function removeExistingUsers(): void
    {
        $user1 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData1['username']]);
        if ($user1) {
            $this->entityManager->remove($user1);
        }
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);
        if ($user2) {
            $this->entityManager->remove($user2);
        }
        $this->entityManager->flush();
    }

    private function registerUser(array $userData): void
    {
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($userData)
        );
    }

    private function auth(array $userData): string
    {
        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($userData)
        );
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        return $responseData['token'];
    }

    private function getAuthHeaders(string $token): array
    {
        return [
            'HTTP_Authorization' => 'Bearer ' . $token,
            'CONTENT_TYPE' => 'application/json'
        ];
    }

    private function createConversation(string $token): string
    {
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['targetUserId' => $user2->getId()])
        );

        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        return $responseData['id'];
    }

    public function testListMessagesWithoutAuth(): void
    {
        $this->client->request('GET', '/api/messaging/conversations/fake-id/messages');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testListMessagesConversationNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'GET',
            '/api/messaging/conversations/non-existent-id/messages',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Conversation not found', $responseData['error']);
    }

    public function testListMessagesSuccess(): void
    {
        $token = $this->auth($this->userData1);
        $conversationId = $this->createConversation($token);

        $this->client->request(
            'GET',
            '/api/messaging/conversations/' . $conversationId . '/messages',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
    }

    public function testListMessagesEmpty(): void
    {
        $token = $this->auth($this->userData1);
        $conversationId = $this->createConversation($token);

        $this->client->request(
            'GET',
            '/api/messaging/conversations/' . $conversationId . '/messages',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
        $this->assertCount(0, $responseData);
    }

    public function testMarkConversationAsReadWithoutAuth(): void
    {
        $this->client->request('POST', '/api/messaging/conversations/fake-id/read');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testMarkConversationAsReadSuccess(): void
    {
        $token = $this->auth($this->userData1);
        $conversationId = $this->createConversation($token);

        $this->client->request(
            'POST',
            '/api/messaging/conversations/' . $conversationId . '/read',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('ok', $responseData['status']);
    }

    public function testMarkConversationAsReadNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'POST',
            '/api/messaging/conversations/non-existent-id/read',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        // Should return 200 with status ok even if conversation doesn't exist (no messages to mark)
        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
    }
}

