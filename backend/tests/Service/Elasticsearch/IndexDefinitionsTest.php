<?php

namespace App\Tests\Service\Elasticsearch;

use App\Service\Elasticsearch\IndexDefinitions;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Minecraft - Tests unitaires du IndexDefinitions
 *
 * Biomes    = les index (posts, users, groups)
 * Blueprint = le mapping/settings de chaque biome
 */
class IndexDefinitionsTest extends TestCase
{
    public function testPostsMappingDefinesExpectedProperties(): void
    {
        $mapping = IndexDefinitions::postsMapping();

        $this->assertSame(1, $mapping['settings']['number_of_shards']);
        $this->assertSame(0, $mapping['settings']['number_of_replicas']);

        $properties = $mapping['mappings']['properties'];
        $this->assertSame('text', $properties['content']['type']);
        $this->assertSame('french', $properties['content']['analyzer']);
        $this->assertSame('integer', $properties['authorId']['type']);
        $this->assertSame('keyword', $properties['authorUsername']['fields']['keyword']['type']);
        $this->assertSame('integer', $properties['groupId']['type']);
        $this->assertSame('date', $properties['createdAt']['type']);
        $this->assertFalse($properties['imageUrl']['index']);
        $this->assertSame('integer', $properties['likesCount']['type']);
    }

    public function testUsersMappingDefinesExpectedProperties(): void
    {
        $mapping = IndexDefinitions::usersMapping();

        $this->assertSame(1, $mapping['settings']['number_of_shards']);
        $this->assertSame(0, $mapping['settings']['number_of_replicas']);

        $properties = $mapping['mappings']['properties'];
        $this->assertSame('keyword', $properties['username']['fields']['keyword']['type']);
        $this->assertSame('text', $properties['bio']['type']);
        $this->assertSame('french', $properties['bio']['analyzer']);
        $this->assertSame('keyword', $properties['location']['fields']['keyword']['type']);
        $this->assertSame('keyword', $properties['availability']['type']);
        $this->assertFalse($properties['avatarUrl']['index']);
        $this->assertSame('keyword', $properties['skills']['type']);
    }

    public function testGroupsMappingDefinesExpectedProperties(): void
    {
        $mapping = IndexDefinitions::groupsMapping();

        $this->assertSame(1, $mapping['settings']['number_of_shards']);
        $this->assertSame(0, $mapping['settings']['number_of_replicas']);

        $properties = $mapping['mappings']['properties'];
        $this->assertSame('keyword', $properties['name']['fields']['keyword']['type']);
        $this->assertSame('text', $properties['description']['type']);
        $this->assertSame('french', $properties['description']['analyzer']);
        $this->assertSame('date', $properties['createdAt']['type']);
    }

    public function testAllReturnsEveryIndexMappingKeyedByIndexName(): void
    {
        $all = IndexDefinitions::all();

        $this->assertSame(
            [IndexDefinitions::POSTS_INDEX, IndexDefinitions::USERS_INDEX, IndexDefinitions::GROUPS_INDEX],
            array_keys($all)
        );
        $this->assertSame(IndexDefinitions::postsMapping(), $all[IndexDefinitions::POSTS_INDEX]);
        $this->assertSame(IndexDefinitions::usersMapping(), $all[IndexDefinitions::USERS_INDEX]);
        $this->assertSame(IndexDefinitions::groupsMapping(), $all[IndexDefinitions::GROUPS_INDEX]);
    }
}
