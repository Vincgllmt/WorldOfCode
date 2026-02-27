<?php

namespace App\Tests\Controller;

use App\Entity\TechGroup;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class TechGroupControllerTest extends WebTestCase
{
	private $client;
	private $entityManager;

	private $userData = [
		'username' => 'SolidSnake',
		'password' => 'FoxhoundUnit!@2024',
	];

	protected function setUp(): void
	{
		self::ensureKernelShutdown();
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

		// create a group

		// Authenticate to get a valid token

		$this->client->request(
			'POST',
			'/api/authenticate',
			[],
			[],
			['CONTENT_TYPE' => 'application/json'],
			json_encode($this->userData)
		);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertNotNull($responseData, 'Authentication response should not be null in setUp');
		$this->assertArrayHasKey('token', $responseData, 'Token should be present in response in setUp');
		$token = $responseData['token'];

		$this->client->request(
			'POST',
			'/api/group',
			[],
			[],
			[
				'CONTENT_TYPE' => 'application/json',
				'HTTP_Authorization' => 'Bearer ' . $token,
			],
			json_encode(['name' => 'Groupe de Test', 'description' => 'Description du groupe de test'])
		);
	}
	protected function tearDown(): void
	{
		$user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'SolidSnake']);
		if ($user) {
			$this->entityManager->remove($user);
			$this->entityManager->flush();
		}
        $techGroup = $this->entityManager->getRepository(TechGroup::class)->findOneBy(['name' => 'Groupe de Test']);
        if ($techGroup) {
            $this->entityManager->remove($techGroup);
            $this->entityManager->flush();
        }

		$this->entityManager->close();
		$this->entityManager = null;
		$this->client = null;

		parent::tearDown();
		self::ensureKernelShutdown();
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
        $this->assertNotNull($responseData, 'Authentication response should not be null');
        $this->assertArrayHasKey('token', $responseData, 'Token should be present in response');
        return $responseData['token'];
    }

	public function testListTechGroupsNOK(): void
	{
		$this->client->request('GET', '/api/group');
		$this->assertResponseStatusCodeSame(401);
	}

	public function testListTechGroupsOK(): void
	{
		$token = $this->auth();
		$this->client->request(
			'GET',
			'/api/group',
			[],
			[],
			[
				'CONTENT_TYPE' => 'application/json',
				'HTTP_Authorization' => 'Bearer ' . $token,
			]
		);
		$this->assertResponseIsSuccessful();
		$this->assertResponseStatusCodeSame(200);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertIsArray($responseData);

		$this->assertArrayHasKey('id', $responseData[0]);
		$this->assertArrayHasKey('name', $responseData[0]);
		$this->assertArrayHasKey('description', $responseData[0]);
	}

	public function testCreateTechGroupWithoutAuth(): void
	{
		$this->client->request(
			'POST',
			'/api/group',
			[],
			[],
			['CONTENT_TYPE' => 'application/json'],
			json_encode(['name' => 'Groupe de Test 2', 'description' => 'Description du groupe de test 2'])
		);
		$this->assertResponseStatusCodeSame(401);
	}

	public function testCreateTechGroupMissingRequired(): void
	{
		$token = $this->auth();

		$this->client->request(
			'POST',
			'/api/group',
			[],
			[],
			['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token],
			json_encode(['description' => 'technopriest'])
		);
		$this->assertResponseStatusCodeSame(400);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertArrayHasKey('error', $responseData);
	}

	public function testCreateTechGroupOK(): void
	{
		$token = $this->auth();

		$this->client->request(
			'POST',
			'/api/group',
			[],
			[],
			['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token],
			json_encode(['name' => 'Groupe de Test 2', 'description' => 'Description du groupe de test 2'])
		);
		$this->assertResponseIsSuccessful();
		$this->assertResponseStatusCodeSame(201);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertArrayHasKey('id', $responseData);
		$this->assertArrayHasKey('name', $responseData);
		$this->assertArrayHasKey('description', $responseData);

		// delete it
		$this->client->request(
			'DELETE',
			'/api/group/' . $responseData['id'],
			[],
			[],
			['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token]
		);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertArrayHasKey("success", $responseData);
	}

	public function testDeleteWithoutAuth(): void
	{
		$this->client->request('DELETE', '/api/group/1');
		$this->assertResponseStatusCodeSame(401);
	}

	public function testDeleteOK(): void
	{
		$token = $this->auth();

		// Get the group ID to delete
		$this->client->request(
			'GET',
			'/api/group',
			[],
			[],
			[
				'CONTENT_TYPE' => 'application/json',
				'HTTP_Authorization' => 'Bearer ' . $token,
			]
		);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$groupId = $responseData[0]['id'];

		$this->client->request(
			'DELETE',
			'/api/group/' . $groupId,
			[],
			[],
			['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token]
		);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertArrayHasKey("success", $responseData);
	}

	public function testDeleteGroupNotFound(): void
	{
		$token = $this->auth();

		$this->client->request(
			'DELETE',
			'/api/group/999999',
			[],
			[],
			['HTTP_Authorization' => 'Bearer ' . $token]
		);

		$this->assertResponseStatusCodeSame(404);
	}

	public function testGetGroupWithoutAuth(): void
	{
		$this->client->request('GET', '/api/group/1');
		$this->assertResponseStatusCodeSame(401);
	}

	public function testGetGroupNotFound(): void
	{
		$token = $this->auth();

		$this->client->request(
			'GET',
			'/api/group/999999',
			[],
			[],
			['HTTP_Authorization' => 'Bearer ' . $token]
		);

		$this->assertResponseStatusCodeSame(404);
	}

	public function testGetGroupOK(): void
	{
		$token = $this->auth();

		// Get existing group
		$this->client->request(
			'GET',
			'/api/group',
			[],
			[],
			[
				'CONTENT_TYPE' => 'application/json',
				'HTTP_Authorization' => 'Bearer ' . $token,
			]
		);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$groupId = $responseData[0]['id'];

		$this->client->request(
			'GET',
			'/api/group/' . $groupId,
			[],
			[],
			['HTTP_Authorization' => 'Bearer ' . $token]
		);

		$this->assertResponseIsSuccessful();
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertArrayHasKey('id', $responseData);
		$this->assertArrayHasKey('name', $responseData);
	}

	public function testUpdateGroupWithoutAuth(): void
	{
		$this->client->request(
			'PUT',
			'/api/group/1',
			[],
			[],
			['CONTENT_TYPE' => 'application/json'],
			json_encode(['name' => 'Updated name'])
		);

		$this->assertResponseStatusCodeSame(401);
	}

	public function testUpdateGroupNotFound(): void
	{
		$token = $this->auth();

		$this->client->request(
			'PUT',
			'/api/group/999999',
			[],
			[],
			[
				'CONTENT_TYPE' => 'application/json',
				'HTTP_Authorization' => 'Bearer ' . $token
			],
			json_encode(['name' => 'Updated name'])
		);

		$this->assertResponseStatusCodeSame(404);
	}

	public function testCreateGroupWithMissingName(): void
	{
		$token = $this->auth();

		$this->client->request(
			'POST',
			'/api/group',
			[],
			[],
			['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token],
			json_encode(['description' => 'Description without name'])
		);


		$this->assertResponseStatusCodeSame(400);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertArrayHasKey('error', $responseData);
	}
}

