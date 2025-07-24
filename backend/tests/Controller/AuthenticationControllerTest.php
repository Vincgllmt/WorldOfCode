<?php

namespace App\tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class AuthenticationControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;
    private $username = 'Gustave';
    private $userData = [
        'username' => 'Gustave',
        'password' => 'forThoseWhoComeAfter',
    ];

    protected function setUp(): void
    {
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

    public function testRegisterNOK(): void
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

    public function testAuthNOK(): void
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
        $this->assertEquals($this->username, $responseData['username']);
    }

    public function testMeNOK(): void
    {
        // Attempt to access /api/me without authentication
        $this->client->request('GET', '/api/me');

        $this->assertEquals(Response::HTTP_UNAUTHORIZED, $this->client->getResponse()->getStatusCode());
    }

}