<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ControllerTest extends WebTestCase
{
    public function testAuthenticate(): void
    {
        $client = static::createClient();
        $this->ensureCleanState($client);

        $client->request('POST', '/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'username' => 'testuser',
            'password' => 'testpass'
        ]));
        $this->assertResponseStatusCodeSame(201);

        $client->request('POST', '/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'username' => 'testuser',
            'password' => 'testpass'
        ]));
        $this->assertResponseStatusCodeSame(409);

        $client->request('POST', '/authenticate', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'username' => 'testuser',
            'password' => 'testpass'
        ]));
        $this->assertResponseStatusCodeSame(200);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('token', $data);
        $token = $data['token'];

        $client->request('GET', '/me', [], [], [
            'HTTP_Authorization' => "Bearer $token"
        ]);
        $this->assertResponseStatusCodeSame(200);

        $userInfo = json_decode($client->getResponse()->getContent(), true);
        $this->assertEquals('testuser', $userInfo['username']);
    }
    ####
    ##
    ####
    public function testUser(): void
    {
        $client = static::createClient();
        $this->ensureCleanState($client);

        $client->request('POST', '/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'username' => 'testuser',
            'password' => 'testpass'
        ]));
        $this->assertResponseStatusCodeSame(201);

        $this->assertResponseStatusCodeSame(201);
        $this->createAdminUser();
        $userToken = $this->getToken($client, 'testuser', 'testpass');
        $adminToken = $this->getToken($client, 'admin', 'admin');

        $client->request('GET', '/me', [], [], ['HTTP_Authorization' => "Bearer $adminToken"]);
        $adminId = json_decode($client->getResponse()->getContent(), true)['id'];

        $client->request('PUT', "/user/$adminId", [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_Authorization' => "Bearer $adminToken"
        ], json_encode([
            'role' => 'ROLE_ADMIN'
        ]));
        $this->assertResponseStatusCodeSame(200);

        $client->request('GET', '/user');
        $this->assertResponseStatusCodeSame(401);

        $client->request('GET', '/user', [], [], [
            'HTTP_Authorization' => "Bearer $userToken"
        ]);
        $this->assertResponseStatusCodeSame(200);

        $client->request('DELETE', "/user/$adminId", [], [], [
            'HTTP_Authorization' => "Bearer $userToken"
        ]);
        $this->assertResponseStatusCodeSame(403);

        $client->request('DELETE', "/user/$adminId", [], [], [
            'HTTP_Authorization' => "Bearer $adminToken"
        ]);
        $this->assertResponseStatusCodeSame(200);
    }
    public function testAddress(): void
    {
        $client = static::createClient();
        $this->ensureCleanState($client);

        $client->request('POST', '/register', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'username' => 'testuser',
            'password' => 'testpass'
        ]));
        $this->assertResponseStatusCodeSame(201);

        $this->createAdminUser();

        $userToken = $this->getToken($client, 'testuser', 'testpass');
        $adminToken = $this->getToken($client, 'admin', 'admin');

        $client->request('GET', '/address');
        $this->assertResponseStatusCodeSame(401);

        $client->request('GET', '/address', [], [], [
            'HTTP_Authorization' => "Bearer $userToken"
        ]);
        $this->assertResponseStatusCodeSame(200);

        $client->request('POST', '/address', [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_Authorization' => "Bearer $adminToken"
        ], json_encode([
            'street' => '10 rue du test',
            'postalCode' => '75001',
            'city' => 'Paris',
            'country' => 'France'
        ]));
        $this->assertResponseStatusCodeSame(201);

        $response = json_decode($client->getResponse()->getContent(), true);
        $addressId = $response['id'];

        $client->request('DELETE', "/address/$addressId", [], [], [
            'HTTP_Authorization' => "Bearer $userToken"
        ]);
        $this->assertResponseStatusCodeSame(403);

        $client->request('DELETE', "/address/$addressId", [], [], [
            'HTTP_Authorization' => "Bearer $adminToken"
        ]);
        $this->assertResponseStatusCodeSame(200);
    }



    #####
    ####
    ## Méthode additionnelle
    ####
    #####
    private function ensureCleanState($client): void
    {
        $entityManager = $client->getContainer()->get('doctrine')->getManager();
        $conn = $entityManager->getConnection();

        $conn->executeStatement('SET FOREIGN_KEY_CHECKS=0');
        $conn->executeStatement("DELETE FROM address");
        $conn->executeStatement("DELETE FROM user WHERE username IN ('testuser', 'admin')");
        $conn->executeStatement('SET FOREIGN_KEY_CHECKS=1');
    }
    ####
    ##
    ####
    private function createAdminUser(): void
    {
        self::bootKernel();
        $container = static::getContainer();
        $em = $container->get('doctrine')->getManager();

        $user = new \App\Entity\User();
        $user->setUsername('admin');
        $user->setPassword(password_hash('admin', PASSWORD_BCRYPT));
        $user->setRole(\App\Enum\UserRole::ROLE_ADMIN);


        $em->persist($user);
        $em->flush();
    }
    ####
    ##
    ####
    private function getToken($client, string $username, string $password): string
    {
        $client->request('POST', '/authenticate', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'username' => $username,
            'password' => $password
        ]));

        $response = $client->getResponse();
        $data = json_decode($response->getContent(), true);

        if (!isset($data['token'])) {
            throw new \RuntimeException("No token returned for user $username. Response: " . $response->getContent());
        }

        return $data['token'];
    }
}
