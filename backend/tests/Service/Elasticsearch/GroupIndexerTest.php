<?php

namespace App\Tests\Service\Elasticsearch;

use App\Entity\TechGroup;
use App\Service\Elasticsearch\ElasticClient;
use App\Service\Elasticsearch\GroupIndexer;
use App\Service\Elasticsearch\IndexDefinitions;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Hollow Knight - Tests unitaires du GroupIndexer
 *
 * Hallownest = ensemble des groupes (le monde indexé)
 * Mantis Tribe = un groupe (une tribu cohérente)
 */
class GroupIndexerTest extends TestCase
{
    private ElasticClient $elasticClient;

    protected function setUp(): void
    {
        $this->elasticClient = $this->createMock(ElasticClient::class);
    }

    private function makeIndexer(): GroupIndexer
    {
        return new GroupIndexer($this->elasticClient);
    }

    private function makeGroup(int $id = 9, string $name = 'Mantis Tribe', ?string $description = 'Guerriers de la jungle'): TechGroup
    {
        $group = $this->createMock(TechGroup::class);
        $group->method('getId')->willReturn($id);
        $group->method('getName')->willReturn($name);
        $group->method('getDescription')->willReturn($description);
        $group->method('getCreatedAt')->willReturn(new \DateTime('2026-05-15T08:00:00+00:00'));
        return $group;
    }

    public function testCreateIndexWhenAbsent(): void
    {
        $this->elasticClient->method('indexExists')->willReturn(false);
        $this->elasticClient->expects($this->once())
            ->method('createIndex')
            ->with(
                IndexDefinitions::GROUPS_INDEX,
                $this->callback(fn($body) => isset($body['mappings']['properties']['name']))
            );

        $this->assertTrue($this->makeIndexer()->createIndexIfNotExists());
    }

    public function testCreateIndexSkippedWhenPresent(): void
    {
        $this->elasticClient->method('indexExists')->willReturn(true);
        $this->elasticClient->expects($this->never())->method('createIndex');

        $this->assertFalse($this->makeIndexer()->createIndexIfNotExists());
    }

    public function testIndexSendsExpectedDocument(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('indexDocument')
            ->with(
                IndexDefinitions::GROUPS_INDEX,
                '9',
                $this->callback(function ($body) {
                    return $body['name'] === 'Mantis Tribe'
                        && $body['description'] === 'Guerriers de la jungle'
                        && isset($body['createdAt']);
                })
            );

        $this->makeIndexer()->index($this->makeGroup());
    }

    public function testIndexHandlesNullDescription(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('indexDocument')
            ->with(
                $this->anything(),
                $this->anything(),
                $this->callback(fn($body) => $body['description'] === '')
            );

        $this->makeIndexer()->index($this->makeGroup(5, 'Crossroads', null));
    }

    public function testIndexSwallowsExceptions(): void
    {
        $this->elasticClient->method('indexDocument')->willThrowException(new \RuntimeException('ES down'));

        $this->makeIndexer()->index($this->makeGroup());
        $this->expectNotToPerformAssertions();
    }

    public function testDeleteSendsCorrectId(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('deleteDocument')
            ->with(IndexDefinitions::GROUPS_INDEX, '9');

        $this->makeIndexer()->delete(9);
    }

    public function testBulkIndexProcessesGroups(): void
    {
        $groups = [$this->makeGroup(1), $this->makeGroup(2)];
        $this->elasticClient->expects($this->once())
            ->method('bulk')
            ->with($this->callback(fn($body) => count($body) === 4));

        $this->assertSame(2, $this->makeIndexer()->bulkIndex($groups));
    }

    public function testBulkIndexSkipsEmptyInput(): void
    {
        $this->elasticClient->expects($this->never())->method('bulk');
        $this->assertSame(0, $this->makeIndexer()->bulkIndex([]));
    }
}
