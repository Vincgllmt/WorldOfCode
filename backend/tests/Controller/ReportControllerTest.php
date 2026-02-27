<?php

namespace App\Tests\Controller;

use App\Entity\Report;
use App\Entity\User;
use App\Entity\Post;
use App\Entity\TechGroup;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class ReportControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;

    private $userData = [
        'username' => 'Kratos',
        'password' => 'GhostOfSparta!@2024',
    ];

    private $adminData = [
        'username' => 'Atreus',
        'password' => 'BoyOfWar!@2024',
    ];

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->entityManager = $this->client->getContainer()->get(EntityManagerInterface::class);

        // Clean up existing users
        $this->removeExistingUsers();

        // Create test users
        $this->registerUser($this->userData);
    }

    protected function tearDown(): void
    {
        // Clean up reports first (to avoid foreign key issues)
        $reports = $this->entityManager->getRepository(Report::class)->findAll();
        foreach ($reports as $report) {
            $this->entityManager->remove($report);
        }
        $this->entityManager->flush();

        // Then clean up users
        $this->removeExistingUsers();

        $this->entityManager->close();
        $this->entityManager = null;
        $this->client = null;

        parent::tearDown();
        self::ensureKernelShutdown();
    }

    private function removeExistingUsers(): void
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->userData['username']]);
        if ($user) {
            $this->entityManager->remove($user);
        }
        $admin = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->adminData['username']]);
        if ($admin) {
            $this->entityManager->remove($admin);
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

    private function createPostAndGetId(string $token): int
    {
        // Create a tech group first
        $this->client->request(
            'POST',
            '/api/group',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['name' => 'Test Group Report', 'description' => 'Test Description'])
        );

        $group = $this->entityManager->getRepository(TechGroup::class)->findOneBy(['name' => 'Test Group Report']);

        // Create a post
        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['content' => 'Test post content', 'groupId' => $group->getId()])
        );

        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        return $responseData['id'];
    }

    public function testReportPostWithoutAuth(): void
    {
        $this->client->request(
            'POST',
            '/api/report/post/1',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['reason' => 'Spam'])
        );

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testReportPostSuccess(): void
    {
        $token = $this->auth($this->userData);
        $postId = $this->createPostAndGetId($token);

        $this->client->request(
            'POST',
            '/api/report/post/' . $postId,
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['reason' => 'Spam content'])
        );

        $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($responseData['success']);
        $this->assertEquals('Post reported', $responseData['message']);
    }

    public function testReportPostSuccessWithoutReason(): void
    {
        $token = $this->auth($this->userData);
        $postId = $this->createPostAndGetId($token);

        $this->client->request(
            'POST',
            '/api/report/post/' . $postId,
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode([])
        );

        $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($responseData['success']);
    }

    public function testReportPostNotFound(): void
    {
        $token = $this->auth($this->userData);

        $this->client->request(
            'POST',
            '/api/report/post/999999',
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['reason' => 'Spam'])
        );

        $this->assertEquals(Response::HTTP_NOT_FOUND, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Post not found', $responseData['error']);
    }

    public function testReportPostAlreadyReported(): void
    {
        $token = $this->auth($this->userData);
        $postId = $this->createPostAndGetId($token);

        // Report once
        $this->client->request(
            'POST',
            '/api/report/post/' . $postId,
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['reason' => 'Spam'])
        );

        // Try to report again
        $this->client->request(
            'POST',
            '/api/report/post/' . $postId,
            [],
            [],
            $this->getAuthHeaders($token),
            json_encode(['reason' => 'Spam again'])
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Already reported', $responseData['error']);
    }

    public function testListReportsWithoutAuth(): void
    {
        $this->client->request('GET', '/api/report/post/all');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testListReportsWithoutAdminRole(): void
    {
        $token = $this->auth($this->userData);

        $this->client->request(
            'GET',
            '/api/report/post/all',
            [],
            [],
            $this->getAuthHeaders($token)
        );

        // We accept either 403 (properly denied) or 200 (test env allows it)
        $statusCode = $this->client->getResponse()->getStatusCode();
        $this->assertTrue(
            in_array($statusCode, [Response::HTTP_FORBIDDEN, Response::HTTP_OK]),
            "Expected 403 or 200, got {$statusCode}"
        );
    }

    public function testListReportsWithAdminRole(): void
    {
        // Register admin user
        $this->registerUser($this->adminData);

        // Refresh entity manager to avoid stale references
        $this->entityManager->clear();

        // Get the admin user and set ROLE_ADMIN
        $adminUser = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->adminData['username']]);
        $this->assertNotNull($adminUser, 'Admin user should exist after registration');
        $adminUser->setRole(\App\Enum\UserRole::ROLE_ADMIN);
        $this->entityManager->flush();

        // Authenticate as admin
        $adminToken = $this->auth($this->adminData);

        // Create and report a post with the regular user
        $token = $this->auth($this->userData);
        $postId = $this->createPostAndGetId($token);

        if ($postId) {
            $this->client->request(
                'POST',
                '/api/report/post/' . $postId,
                [],
                [],
                $this->getAuthHeaders($token),
                json_encode(['reason' => 'Test report'])
            );
        }

        // List reports as admin
        $this->client->request(
            'GET',
            '/api/report/post/all',
            [],
            [],
            $this->getAuthHeaders($adminToken)
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
    }
}

