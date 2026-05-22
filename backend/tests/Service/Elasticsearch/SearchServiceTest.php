<?php

namespace App\Tests\Service\Elasticsearch;

use App\Service\Elasticsearch\ElasticClient;
use App\Service\Elasticsearch\IndexDefinitions;
use App\Service\Elasticsearch\SearchService;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Final Fantasy VII - Tests unitaires du SearchService
 *
 * Tifa   = la recherche (combo direct, rapide)
 * Aerith = les résultats (gracieux, parfois absents)
 */
class SearchServiceTest extends TestCase
{
    private ElasticClient $elasticClient;
    private SearchService $service;

    protected function setUp(): void
    {
        $this->elasticClient = $this->createMock(ElasticClient::class);
        $this->service = new SearchService($this->elasticClient);
    }

    public function testEmptyQueryReturnsEmptyArray(): void
    {
        $this->elasticClient->expects($this->never())->method('search');

        $this->assertSame([], $this->service->searchPosts(''));
        $this->assertSame([], $this->service->searchPosts('   '));
    }

    public function testSearchBuildsMultiMatchQueryWithHighlights(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('search')
            ->with(
                IndexDefinitions::POSTS_INDEX,
                $this->callback(function ($body) {
                    $multiMatch = $body['query']['function_score']['query']['multi_match'] ?? null;
                    return $multiMatch
                        && $multiMatch['query'] === 'chocobo'
                        && in_array('content^2', $multiMatch['fields'], true)
                        && $multiMatch['fuzziness'] === 'AUTO'
                        && isset($body['highlight']['fields']['content'])
                        && $body['size'] === 5;
                })
            )
            ->willReturn(['hits' => ['hits' => []]]);

        $this->service->searchPosts('chocobo');
    }

    public function testSearchAppliesGaussDecayOnCreatedAt(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('search')
            ->with(
                $this->anything(),
                $this->callback(function ($body) {
                    $functions = $body['query']['function_score']['functions'] ?? [];
                    return isset($functions[0]['gauss']['createdAt']['scale']);
                })
            )
            ->willReturn(['hits' => ['hits' => []]]);

        $this->service->searchPosts('aerith');
    }

    public function testSearchParsesHitsCorrectly(): void
    {
        $this->elasticClient->method('search')->willReturn([
            'hits' => [
                'hits' => [
                    [
                        '_id'     => '42',
                        '_score'  => 12.5,
                        '_source' => [
                            'content'        => 'Hello Midgar',
                            'authorId'       => 7,
                            'authorUsername' => 'cloud_strife',
                            'groupId'        => 3,
                            'groupName'      => 'AVALANCHE',
                            'createdAt'      => '2026-05-20T10:00:00+00:00',
                        ],
                        'highlight' => [
                            'content' => ['Hello <mark>Midgar</mark>'],
                        ],
                    ],
                ],
            ],
        ]);

        $results = $this->service->searchPosts('midgar');

        $this->assertCount(1, $results);
        $this->assertSame(42, $results[0]['id']);
        $this->assertSame(7, $results[0]['authorId']);
        $this->assertSame('cloud_strife', $results[0]['authorUsername']);
        $this->assertSame(3, $results[0]['groupId']);
        $this->assertSame('AVALANCHE', $results[0]['groupName']);
        $this->assertSame('Hello <mark>Midgar</mark>', $results[0]['snippet']);
        $this->assertSame(12.5, $results[0]['score']);
    }

    public function testSearchFallsBackToTruncatedContentWhenNoHighlight(): void
    {
        $longContent = str_repeat('Sephiroth ', 30);
        $this->elasticClient->method('search')->willReturn([
            'hits' => [
                'hits' => [
                    [
                        '_id'     => '1',
                        '_score'  => 1.0,
                        '_source' => [
                            'content' => $longContent,
                        ],
                    ],
                ],
            ],
        ]);

        $results = $this->service->searchPosts('sephiroth');

        $this->assertLessThanOrEqual(121, mb_strlen($results[0]['snippet']));
        $this->assertStringEndsWith('…', $results[0]['snippet']);
    }

    public function testSearchHandlesMissingSourceFields(): void
    {
        $this->elasticClient->method('search')->willReturn([
            'hits' => [
                'hits' => [
                    [
                        '_id'     => '5',
                        '_score'  => 0.5,
                        '_source' => ['content' => 'Bahamut'],
                    ],
                ],
            ],
        ]);

        $results = $this->service->searchPosts('bahamut');

        $this->assertNull($results[0]['authorId']);
        $this->assertNull($results[0]['authorUsername']);
        $this->assertNull($results[0]['groupId']);
        $this->assertNull($results[0]['groupName']);
        $this->assertNull($results[0]['createdAt']);
    }

    public function testCustomLimitIsForwardedToQuerySize(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('search')
            ->with(
                $this->anything(),
                $this->callback(fn($body) => $body['size'] === 20)
            )
            ->willReturn(['hits' => ['hits' => []]]);

        $this->service->searchPosts('tifa', 20);
    }

    // ======================================================================
    //  searchUsers
    // ======================================================================

    public function testSearchUsersEmptyQueryReturnsEmpty(): void
    {
        $this->elasticClient->expects($this->never())->method('search');

        $this->assertSame([], $this->service->searchUsers(''));
    }

    public function testSearchUsersBuildsExpectedQueryAndParsesHits(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('search')
            ->with(
                IndexDefinitions::USERS_INDEX,
                $this->callback(function ($body) {
                    $should = $body['query']['bool']['should'] ?? [];
                    if (count($should) !== 2) {
                        return false;
                    }
                    $prefix = $should[0]['multi_match'] ?? null;
                    $fuzzy  = $should[1]['multi_match'] ?? null;
                    return $prefix && $prefix['type'] === 'bool_prefix'
                        && in_array('username^3', $prefix['fields'], true)
                        && in_array('firstname^2', $prefix['fields'], true)
                        && in_array('lastname^2', $prefix['fields'], true)
                        && !in_array('bio', $prefix['fields'], true)
                        && $fuzzy && ($fuzzy['fuzziness'] ?? null) === 'AUTO';
                })
            )
            ->willReturn([
                'hits' => [
                    'hits' => [
                        [
                            '_id' => '7',
                            '_score' => 5.0,
                            '_source' => [
                                'username'  => 'shepard',
                                'firstname' => 'John',
                                'lastname'  => 'Shepard',
                                'avatarUrl' => 'https://avatar.test/shepard',
                            ],
                        ],
                    ],
                ],
            ]);

        $results = $this->service->searchUsers('shepard');

        $this->assertCount(1, $results);
        $this->assertSame(7, $results[0]['id']);
        $this->assertSame('shepard', $results[0]['username']);
        $this->assertSame('John', $results[0]['firstname']);
        $this->assertSame(5.0, $results[0]['score']);
    }

    // ======================================================================
    //  searchGroups
    // ======================================================================

    public function testSearchGroupsEmptyQueryReturnsEmpty(): void
    {
        $this->elasticClient->expects($this->never())->method('search');

        $this->assertSame([], $this->service->searchGroups(''));
    }

    public function testSearchGroupsBuildsExpectedQueryAndParsesHits(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('search')
            ->with(
                IndexDefinitions::GROUPS_INDEX,
                $this->callback(function ($body) {
                    $should = $body['query']['bool']['should'] ?? [];
                    if (count($should) !== 2) {
                        return false;
                    }
                    $prefix = $should[0]['match_phrase_prefix']['name'] ?? null;
                    $fuzzy  = $should[1]['match']['name'] ?? null;
                    return $prefix && $prefix['query'] === 'mantis'
                        && $fuzzy && ($fuzzy['fuzziness'] ?? null) === 'AUTO';
                })
            )
            ->willReturn([
                'hits' => [
                    'hits' => [
                        [
                            '_id'     => '9',
                            '_score'  => 3.2,
                            '_source' => [
                                'name'        => 'Mantis Tribe',
                                'description' => 'Guerriers',
                            ],
                        ],
                    ],
                ],
            ]);

        $results = $this->service->searchGroups('mantis');

        $this->assertCount(1, $results);
        $this->assertSame(9, $results[0]['id']);
        $this->assertSame('Mantis Tribe', $results[0]['name']);
        $this->assertSame('Guerriers', $results[0]['description']);
        $this->assertSame(3.2, $results[0]['score']);
    }
}
