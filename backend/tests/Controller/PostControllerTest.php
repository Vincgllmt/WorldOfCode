<?php

namespace App\Tests\Controller;

use App\Entity\TechGroup;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class PostControllerTest extends WebTestCase
{
    private $client;
    private $entityManager;

    private $userData = [
        'username' => 'GeraltOfRivia',
        'password' => 'WhiteWolf1234',
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
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => 'GeraltOfRivia']);
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
    public function testGetPostListWithoutAuth(): void
    {
        $this->client->request('GET', '/api/post');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }
    public function testGetPostListOK(): void {
        $token = $this->auth();

        $this->client->request('GET', '/api/post', [], [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ]
        );
        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
    }

    public function testCreatePostOK(): void
    {
        $token = $this->auth();

        // create the group

        $this->client->request(
            'POST',
            '/api/group',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token],
            json_encode(['name' => 'groupe star wars', 'description' => 'missa missa test'])
        );

        // get the id of the group

        $id = $this->entityManager->getRepository(TechGroup::class)->findOneBy(['name' => 'groupe star wars'])->getId();
        // create the post

        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['content' => 'Darth vader est il le meilleur antagoniste de l\'histoire ?', 'groupId' => $id]));
        $this->assertEquals(201, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Darth vader est il le meilleur antagoniste de l\'histoire ?', $responseData['content']);
    }

    public function testCreatePostWithoutAuth(): void
    {
        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json'
            ],
            json_encode(['content' => 'Darth vader est il le meilleur antagoniste de l\'histoire ?', 'groupId' => 1])
        );
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }
    public function testCreatePostWithoutCorrectValue(): void
    {
        $token = $this->auth();

        // create the post

        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['content' => 'Darth vader est il le meilleur antagoniste de l\'histoire ?']));
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(400, $this->client->getResponse()->getStatusCode());
        $this->assertEquals('Missing content or groupId', $responseData['error']);
    }

    public function testCreatePostWithMissingContent(): void
    {
        $token = $this->auth();

        // Create a tech group first
        $this->client->request(
            'POST',
            '/api/group',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token],
            json_encode(['name' => 'groupe test missing', 'description' => 'test'])
        );

        $group = $this->entityManager->getRepository(TechGroup::class)->findOneBy(['name' => 'groupe test missing']);

        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['groupId' => $group->getId()])
        );

        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(400, $this->client->getResponse()->getStatusCode());
        $this->assertEquals('Missing content or groupId', $responseData['error']);
    }

    public function testCreatePostWithNonExistentGroup(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['content' => 'Test post', 'groupId' => 999999])
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Group not found', $responseData['error']);
    }

    public function testUpdatePostWithoutAuth(): void
    {
        $this->client->request(
            'PUT',
            '/api/post/1',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['content' => 'Updated content'])
        );

        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testUpdatePostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'PUT',
            '/api/post/999999',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['content' => 'Updated content'])
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testDeletePostWithoutAuth(): void
    {
        $this->client->request('DELETE', '/api/post/1');

        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testDeletePostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'DELETE',
            '/api/post/999999',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
            ]
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testGetPostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'GET',
            '/api/post/999999',
            [],
            [],
            [
                'HTTP_Authorization' => 'Bearer ' . $token,
            ]
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testLikePostWithoutAuth(): void
    {
        $this->client->request('POST', '/api/post/1/like');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testLikePostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/post/999999/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testLikePostSuccess(): void
    {
        $token = $this->auth();
        $postId = $this->createPostAndGetId($token);

        $this->client->request(
            'POST',
            '/api/post/' . $postId . '/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($responseData['success']);
    }

    public function testLikePostAlreadyLiked(): void
    {
        $token = $this->auth();
        $postId = $this->createPostAndGetId($token);

        // Like once
        $this->client->request(
            'POST',
            '/api/post/' . $postId . '/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        // Try to like again
        $this->client->request(
            'POST',
            '/api/post/' . $postId . '/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(400, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Already liked', $responseData['error']);
    }

    public function testUnlikePostWithoutAuth(): void
    {
        $this->client->request('DELETE', '/api/post/1/like');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testUnlikePostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'DELETE',
            '/api/post/999999/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testUnlikePostNotLiked(): void
    {
        $token = $this->auth();
        $postId = $this->createPostAndGetId($token);

        $this->client->request(
            'DELETE',
            '/api/post/' . $postId . '/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(400, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Not liked yet', $responseData['error']);
    }

    public function testUnlikePostSuccess(): void
    {
        $token = $this->auth();
        $postId = $this->createPostAndGetId($token);

        // Like first
        $this->client->request(
            'POST',
            '/api/post/' . $postId . '/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        // Then unlike
        $this->client->request(
            'DELETE',
            '/api/post/' . $postId . '/like',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($responseData['success']);
    }

    public function testSharePostWithoutAuth(): void
    {
        $this->client->request(
            'POST',
            '/api/post/1/share',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([])
        );

        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testSharePostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'POST',
            '/api/post/999999/share',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode([])
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testSharePostSuccess(): void
    {
        $token = $this->auth();
        $postId = $this->createPostAndGetId($token);

        $this->client->request(
            'POST',
            '/api/post/' . $postId . '/share',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['content' => 'Check this out!'])
        );

        $this->assertEquals(201, $this->client->getResponse()->getStatusCode());
    }

    public function testListCommentsWithoutAuth(): void
    {
        $this->client->request('GET', '/api/post/1/comment');
        $this->assertEquals(401, $this->client->getResponse()->getStatusCode());
    }

    public function testListCommentsPostNotFound(): void
    {
        $token = $this->auth();

        $this->client->request(
            'GET',
            '/api/post/999999/comment',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(404, $this->client->getResponse()->getStatusCode());
    }

    public function testListCommentsSuccess(): void
    {
        $token = $this->auth();
        $postId = $this->createPostAndGetId($token);

        $this->client->request(
            'GET',
            '/api/post/' . $postId . '/comment',
            [],
            [],
            ['HTTP_Authorization' => 'Bearer ' . $token]
        );

        $this->assertEquals(200, $this->client->getResponse()->getStatusCode());
        $responseData = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertIsArray($responseData);
    }

    private function createPostAndGetId(string $token): ?int
    {
        // Create a tech group first
        $this->client->request(
            'POST',
            '/api/group',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json', 'HTTP_Authorization' => 'Bearer ' . $token],
            json_encode(['name' => 'Test Group ' . time() . rand(1000, 9999), 'description' => 'Test Description'])
        );

        $groupResponse = json_decode($this->client->getResponse()->getContent(), true);
        if (!isset($groupResponse['id'])) {
            return null;
        }
        $groupId = $groupResponse['id'];

        // Create a post
        $this->client->request(
            'POST',
            '/api/post',
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Authorization' => 'Bearer ' . $token,
            ],
            json_encode(['content' => 'Test post content ' . time(), 'groupId' => $groupId])
        );

        $postResponse = json_decode($this->client->getResponse()->getContent(), true);
        return $postResponse['id'] ?? null;
    }
}



