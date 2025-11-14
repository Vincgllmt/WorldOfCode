<?php

namespace App\Tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class CommentControllerTest extends WebTestCase
{
	private $client;
	private $entityManager;

	private $userData = [
		'username' => 'SolairOfAstora',
		'password' => 'PraiseTheSun',
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
	}
	protected function tearDown(): void
	{
		$user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'SolairOfAstora']);
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
	public function testListCommentsWithoutAuth(): void
	{
		$this->client->request('GET', '/api/comment');
		$this->assertResponseStatusCodeSame(401);
	}
	public function testListCommentsOK(): void
	{
		// First, authenticate to get a valid token
		$token = $this->auth();

		// Now, access the protected endpoint with the token
		$this->client->request(
			'GET',
			'/api/comment',
			[],
			[],
			[
				'HTTP_Authorization' => 'Bearer ' . $token,
				'CONTENT_TYPE' => 'application/json'
			]
		);

		$this->assertResponseStatusCodeSame(200);
		$responseData = json_decode($this->client->getResponse()->getContent(), true);
		$this->assertIsArray($responseData);
		$this->assertCount(0, $responseData); // Assuming no comments exist initially
	}

    public function testCreateCommentWithoutAuth(): void
    {
        $this->client->request(
            'POST',
            '/api/comment',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'content' => 'Test comment',
                'postId' => 1
            ])
        );
        $this->assertResponseStatusCodeSame(401);
    }

    public function testUpdateCommentWithoutAuth(): void
    {
        $this->client->request(
            'PUT',
            '/api/comment/1',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['content' => 'Updated comment'])
        );
        $this->assertResponseStatusCodeSame(401);
    }

    public function testDeleteCommentWithoutAuth(): void
    {
        $this->client->request('DELETE', '/api/comment/1');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetCommentWithoutAuth(): void
    {
        $this->client->request('GET', '/api/comment/1');
        $this->assertResponseStatusCodeSame(401);
    }

    public function testGetCommentNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'GET',
            '/api/comment/99999',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ]
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testDeleteCommentNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'DELETE',
            '/api/comment/99999',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testCreateCommentInvalidData(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/comment',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode(['content' => '']) // Invalid: empty content
        );

        $this->assertResponseStatusCodeSame(400);
    }

    public function testCreateCommentWithMissingContent(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/comment',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode(['postId' => 1])
        );

        $this->assertResponseStatusCodeSame(400);
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Missing content or postId', $responseData['error']);
    }

    public function testCreateCommentWithMissingPostId(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/comment',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode(['content' => 'Test comment'])
        );

        $this->assertResponseStatusCodeSame(400);
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Missing content or postId', $responseData['error']);
    }

    public function testCreateCommentWithNonExistentPost(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/comment',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode([
                'content' => 'Test comment',
                'postId' => 999999
            ])
        );

        $this->assertResponseStatusCodeSame(404);
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Post not found', $responseData['error']);
    }

    public function testUpdateCommentNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'PUT',
            '/api/comment/99999',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode(['content' => 'Updated content'])
        );

        $this->assertResponseStatusCodeSame(404);
    }

    public function testUpdateCommentWithEmptyContent(): void
    {
        $token = $this->auth();

        $this->client->request(
            'PUT',
            '/api/comment/1',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode(['content' => null])
        );

        // Should return the comment unchanged if content is null
        $statusCode = $this->client->getResponse()->getStatusCode();
        $this->assertTrue(in_array($statusCode, [200, 404])); // 404 if comment doesn't exist
    }
}

