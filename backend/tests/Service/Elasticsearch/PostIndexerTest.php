<?php

namespace App\Tests\Service\Elasticsearch;

use App\Entity\Post;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Service\Elasticsearch\ElasticClient;
use App\Service\Elasticsearch\IndexDefinitions;
use App\Service\Elasticsearch\PostIndexer;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Stardew Valley - Tests unitaires du PostIndexer
 *
 * Pelican = client Elasticsearch (port d'amarrage du contenu)
 * Junimo  = post à indexer (esprit qui ramène les choses au bon endroit)
 */
class PostIndexerTest extends TestCase
{
    private ElasticClient $elasticClient;

    protected function setUp(): void
    {
        $this->elasticClient = $this->createMock(ElasticClient::class);
    }

    private function makeIndexer(): PostIndexer
    {
        return new PostIndexer($this->elasticClient);
    }

    private function makePost(int $id = 42, string $content = 'Hello Junimo'): Post
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(7);
        $user->method('getUsername')->willReturn('farmer_steve');

        $group = $this->createMock(TechGroup::class);
        $group->method('getId')->willReturn(3);
        $group->method('getName')->willReturn('Pelican Town Devs');

        $post = $this->createMock(Post::class);
        $post->method('getId')->willReturn($id);
        $post->method('getContent')->willReturn($content);
        $post->method('getAuthor')->willReturn($user);
        $post->method('getTechGroup')->willReturn($group);
        $post->method('getCreatedAt')->willReturn(new \DateTime('2026-05-20T10:00:00+00:00'));
        $post->method('getImageUrl')->willReturn(null);
        $post->method('getLikesCount')->willReturn(5);

        return $post;
    }

    // ======================================================================
    //  createIndexIfNotExists
    // ======================================================================

    public function testCreateIndexWhenAbsent(): void
    {
        $this->elasticClient->method('indexExists')
            ->with(IndexDefinitions::POSTS_INDEX)
            ->willReturn(false);
        $this->elasticClient->expects($this->once())
            ->method('createIndex')
            ->with(
                IndexDefinitions::POSTS_INDEX,
                $this->callback(fn($body) => isset($body['mappings']['properties']['content']))
            );

        $created = $this->makeIndexer()->createIndexIfNotExists();

        $this->assertTrue($created);
    }

    public function testCreateIndexSkippedWhenPresent(): void
    {
        $this->elasticClient->method('indexExists')->willReturn(true);
        $this->elasticClient->expects($this->never())->method('createIndex');

        $created = $this->makeIndexer()->createIndexIfNotExists();

        $this->assertFalse($created);
    }

    // ======================================================================
    //  index()
    // ======================================================================

    public function testIndexSendsCorrectDocument(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('indexDocument')
            ->with(
                IndexDefinitions::POSTS_INDEX,
                '42',
                $this->callback(function ($body) {
                    return $body['content'] === 'Hello Junimo'
                        && $body['authorId'] === 7
                        && $body['authorUsername'] === 'farmer_steve'
                        && $body['groupId'] === 3
                        && $body['groupName'] === 'Pelican Town Devs'
                        && $body['likesCount'] === 5;
                })
            );

        $this->makeIndexer()->index($this->makePost());
    }

    public function testIndexIgnoresPostWithoutId(): void
    {
        $post = $this->createMock(Post::class);
        $post->method('getId')->willReturn(null);

        $this->elasticClient->expects($this->never())->method('indexDocument');

        $this->makeIndexer()->index($post);
    }

    public function testIndexSwallowsExceptions(): void
    {
        $this->elasticClient->method('indexDocument')->willThrowException(new \RuntimeException('ES down'));

        $this->makeIndexer()->index($this->makePost());
        $this->expectNotToPerformAssertions();
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteSendsCorrectId(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('deleteDocument')
            ->with(IndexDefinitions::POSTS_INDEX, '42');

        $this->makeIndexer()->delete(42);
    }

    public function testDeleteSwallowsExceptions(): void
    {
        $this->elasticClient->method('deleteDocument')->willThrowException(new \RuntimeException('Not found'));

        $this->makeIndexer()->delete(99);
        $this->expectNotToPerformAssertions();
    }

    // ======================================================================
    //  bulkIndex()
    // ======================================================================

    public function testBulkIndexSendsAlternatingActionAndPayload(): void
    {
        $posts = [$this->makePost(1, 'A'), $this->makePost(2, 'B')];
        $this->elasticClient->expects($this->once())
            ->method('bulk')
            ->with($this->callback(function ($body) {
                return count($body) === 4
                    && $body[0]['index']['_id'] === '1'
                    && $body[1]['content'] === 'A'
                    && $body[2]['index']['_id'] === '2'
                    && $body[3]['content'] === 'B';
            }));

        $count = $this->makeIndexer()->bulkIndex($posts);

        $this->assertSame(2, $count);
    }

    public function testBulkIndexSkipsEmptyInput(): void
    {
        $this->elasticClient->expects($this->never())->method('bulk');

        $count = $this->makeIndexer()->bulkIndex([]);

        $this->assertSame(0, $count);
    }
}
