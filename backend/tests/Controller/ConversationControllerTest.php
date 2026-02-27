<?php

namespace App\Tests\Controller;

use App\Entity\User;
use App\Entity\Messaging\Conversation;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class ConversationControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;

    private $userData1 = [
        'username' => 'LinkHyrule',
        'password' => 'MasterSword!@2024',
    ];

    private $userData2 = [
        'username' => 'ZeldaPrincess',
        'password' => 'TriforceWisdom!@2024',
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

        $this->entityManager->close();
        $this->entityManager = null;
        $this->client = null;

        parent::tearDown();
        self::ensureKernelShutdown();
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
        $this->assertNotNull($responseData, 'Authentication response should not be null');
        $this->assertArrayHasKey('token', $responseData, 'Token should be present in response');
        return $responseData['token'];
    }

    private function getAuthHeaders(string $token): array
    {
        return [
            'HTTP_Authorization' => 'Bearer ' . $token,
            'CONTENT_TYPE' => 'application/json'
        ];
    }

    // Test create conversation without authentication
    public function testCreateConversationWithoutAuth(): void
    {
        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['targetUserId' => 1])
        );

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    // Test create conversation successfully
    public function testCreateConversationSuccess(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['targetUserId' => $user2->getId()])
        );

        $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('id', $responseData);
        $this->assertEquals('direct', $responseData['type']);
    }

    // Test create conversation with missing targetUserId
    public function testCreateConversationMissingTargetUserId(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode([])
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Missing targetUserId', $responseData['error']);
    }

    // Test create conversation with non-existent user
    public function testCreateConversationUserNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['targetUserId' => 999999])
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Target user not found', $responseData['error']);
    }

    // Test create conversation that already exists
    public function testCreateConversationAlreadyExists(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        // Create first conversation
        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['targetUserId' => $user2->getId()])
        );

        // Try to create the same conversation again
        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['targetUserId' => $user2->getId()])
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('id', $responseData);
    }

    // Test list conversations without authentication
    public function testListConversationsWithoutAuth(): void
    {
        $this->client->request('GET', '/api/messaging/conversations');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    // Test list conversations successfully
    public function testListConversationsSuccess(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        // Create a conversation first
        $this->client->request(
            'POST',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['targetUserId' => $user2->getId()])
        );

        // List conversations
        $this->client->request(
            'GET',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
        $this->assertGreaterThanOrEqual(1, count($responseData));
    }

    // Test list conversations when empty
    public function testListConversationsEmpty(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'GET',
            '/api/messaging/conversations',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
    }
}

