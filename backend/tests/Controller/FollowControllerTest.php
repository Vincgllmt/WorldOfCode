<?php

namespace App\Tests\Controller;

use App\Entity\User;
use App\Entity\Follow;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class FollowControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;

    private $userData1 = [
        'username' => 'JokerAkira',
        'password' => 'PhantomThief',
    ];

    private $userData2 = [
        'username' => 'RyujiSakamoto',
        'password' => 'SkullForReal',
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

    public function testFollowWithoutAuth(): void
    {
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        $this->client->request('POST', '/api/follow/' . $user2->getId());
        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testFollowSuccess(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        $this->client->request(
            'POST',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('User followed', $responseData['message']);
    }

    public function testFollowUserNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'POST',
            '/api/follow/999999',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('User not found', $responseData['error']);
    }

    public function testFollowYourself(): void
    {
        $token = $this->auth($this->userData1);
        $user1 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData1['username']]);

        $this->client->request(
            'POST',
            '/api/follow/' . $user1->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('You cannot follow yourself', $responseData['error']);
    }

    public function testFollowAlreadyFollowing(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        // Follow once
        $this->client->request(
            'POST',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        // Try to follow again
        $this->client->request(
            'POST',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Already following this user', $responseData['error']);
    }

    public function testUnfollowWithoutAuth(): void
    {
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        $this->client->request('DELETE', '/api/follow/' . $user2->getId());
        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testUnfollowSuccess(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        // Follow first
        $this->client->request(
            'POST',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        // Then unfollow
        $this->client->request(
            'DELETE',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('User unfollowed', $responseData['message']);
    }

    public function testUnfollowUserNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'DELETE',
            '/api/follow/999999',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('User not found', $responseData['error']);
    }

    public function testUnfollowNotFollowing(): void
    {
        $token = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        $this->client->request(
            'DELETE',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Not following this user', $responseData['error']);
    }

    public function testGetFollowers(): void
    {
        $token1 = $this->auth($this->userData1);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        // User1 follows User2
        $this->client->request(
            'POST',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token1)
        );

        // Get followers of User2 - need authentication
        $this->client->request(
            'GET',
            '/api/follow/' . $user2->getId() . '/followers',
            [],
            [],
            $this->getAuthHeaders($token1)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
        $this->assertCount(1, $responseData);
        $this->assertEquals($this->userData1['username'], $responseData[0]['username']);
    }

    public function testGetFollowersUserNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'GET',
            '/api/follow/999999/followers',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('User not found', $responseData['error']);
    }

    public function testGetFollowing(): void
    {
        $token1 = $this->auth($this->userData1);
        $user1 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData1['username']]);
        $user2 = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData2['username']]);

        // User1 follows User2
        $this->client->request(
            'POST',
            '/api/follow/' . $user2->getId(),
            [],
            [],
            $this->getAuthHeaders($token1)
        );

        // Get following of User1 - need authentication
        $this->client->request(
            'GET',
            '/api/follow/' . $user1->getId() . '/following',
            [],
            [],
            $this->getAuthHeaders($token1)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
        $this->assertCount(1, $responseData);
        $this->assertEquals($this->userData2['username'], $responseData[0]['username']);
    }
    
    public function testGetFollowingUserNotFound(): void
    {
        $token = $this->auth($this->userData1);

        $this->client->request(
            'GET',
            '/api/follow/999999/following',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('User not found', $responseData['error']);
    }
}

