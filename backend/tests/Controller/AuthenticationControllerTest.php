<?php

namespace App\Tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class AuthenticationControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;
    private $username = 'KiryuKazuma';
    private $userData = [
        'username' => 'KiryuKazuma',
        'password' => 'DragonOfDojima!@2024',
    ];

    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $this->client = static::createClient();
        $this->entityManager = $this->client->getContainer()->get(EntityManagerInterface::class);

        $this->removeExistingUser();
    }

    private function removeExistingUser(): void
    {
        $existingUser = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $this->username]);
        if ($existingUser) {
            $this->entityManager->remove($existingUser);
            $this->entityManager->flush();
        }
    }

    private function registerUser(): array
    {
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );

        return json_decode($this->client->getResponse()->getContent(), true);
    }

    private function authenticateUser(): array
    {
        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );

        return json_decode($this->client->getResponse()->getContent(), true);
    }

    public function testRegisterOK(): void
    {
        $responseData = $this->registerUser();

        // The asserts
        $this->assertEquals(Response::HTTP_CREATED, $this->client->getResponse()->getStatusCode());
        $this->assertArrayHasKey('id', $responseData);
        $this->assertArrayNotHasKey('password', $responseData);
    }

    public function testRegisterWithUsernameAlreadyUsed(): void
    {
        // First registration should succeed
        $this->registerUser();

        // Second registration with same username should fail
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );

        $this->assertEquals(Response::HTTP_CONFLICT, $this->client->getResponse()->getStatusCode());
    }

    public function testAuthOK(): void
    {
        $this->registerUser();
        $responseData = $this->authenticateUser();

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $this->assertArrayHasKey('token', $responseData);
    }

    public function testAuthWithoutRegistering(): void
    {
        // Attempt to authenticate without registering
        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testMeOK(): void
    {
        $this->registerUser();
        $authData = $this->authenticateUser();

        $this->assertArrayHasKey('token', $authData, 'Token should be present after authentication');

        $this->client->request(
            'GET',
            '/api/me',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer ' . $authData['token']]
        );

        $this->assertEquals(Response::HTTP_OK, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('id', $responseData);
        $this->assertArrayHasKey('username', $responseData);
        $this->assertArrayHasKey('role', $responseData);
        $this->assertEquals('KiryuKazuma', $responseData['username']);
    }

    public function testMeWithoutAuth(): void
    {
        // Attempt to access /api/me without authentication
        $this->client->request('GET', '/api/me');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testRegisterWithMissingUsername(): void
    {
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['password' => 'ValidPassword!@2024'])
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
    }

    public function testRegisterWithMissingPassword(): void
    {
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => 'TestUser'])
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
    }

    public function testRegisterWithEmptyData(): void
    {
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([])
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
    }

    public function testAuthWithInvalidPassword(): void
    {
        $this->registerUser();

        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'username' => $this->username,
                'password' => 'WrongPassword!@2024'
            ])
        );

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    public function testAuthWithMissingCredentials(): void
    {
        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([])
        );

        $this->assertEquals(Response::HTTP_BAD_REQUEST, $this->client->getResponse()->getStatusCode());
    }

    public function testMeWithInvalidToken(): void
    {
        $this->client->request(
            'GET',
            '/api/me',
            [],
            [],
            ['HTTP_AUTHORIZATION' => 'Bearer invalid_token_here']
        );

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

    protected function tearDown(): void
    {
        $this->removeExistingUser();

        $this->entityManager->close();
        $this->entityManager = null;
        $this->client = null;

        parent::tearDown();
        self::ensureKernelShutdown();
    }

}