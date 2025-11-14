<?php

namespace App\Tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class UserControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;

    private $userData = [
        'username' => 'CloudStrife',
        'password' => 'Buster5word',
    ];

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = $this->client->getContainer()->get(EntityManagerInterface::class);
        $this->client->request(
            'POST',
            '/api/register',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );
    }
    protected function tearDown(): void
    {
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'CloudStrife']);
        if ($user) {
            $this->entityManager->remove($user);
            $this->entityManager->flush();
        }
        parent::tearDown();
        $this->entityManager->close();
        $this->entityManager = null; // avoid memory leaks
    }

    protected function auth() {
        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        return $responseData['token'];
    }

    public function testGetUserListOK(): void
    {
        $token = $this->auth();

        $this->client->request('GET', '/api/user', [], [],
        [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_Authorization' => 'Bearer ' . $token,
        ]);
        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
    }
    public function testGetUserListWithoutAuth(): void
    {
        $this->client->request('GET', '/api/user');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testGetUserDetailOK(): void
    {
        $token = $this->auth();

        //get id of current user

        $id = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'CloudStrife'])->getId();
        $this->client->request('GET', '/api/user/' . $id, [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ]);
        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
    }

    public function testGetUserDetailNotFound(): void
    {
        $this->client->request(
            'POST',
            '/api/authenticate',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($this->userData)
        );
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $token = $responseData['token'];
        //get id of current user

        $id = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'CloudStrife'])->getId();
        $this->client->request('GET', '/api/user/13246579', [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ]
        );
        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testGetUserDetailWithoutAuth(): void
    {
        $this->client->request('GET', '/api/user/1');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testUpdateUserWithoutAuth(): void
    {
        $this->client->request(
            'PUT',
            '/api/user/1',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['username' => 'NewUsername'])
        );

        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testUpdateUserNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'PUT',
            '/api/user/999999',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['username' => 'NewUsername'])
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testDeleteUserWithoutAuth(): void
    {
        $this->client->request('DELETE', '/api/user/1');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testDeleteUserNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'DELETE',
            '/api/user/999999',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }
}

