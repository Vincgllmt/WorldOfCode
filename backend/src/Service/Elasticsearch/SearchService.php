<?php

namespace App\Service\Elasticsearch;

class SearchService
{
    public function __construct(
        private readonly ElasticClient $elasticClient,
    ) {}

    /**
     * Recherche full-text dans les posts.
     *
     * @return array<int, array{
     *     id: int,
     *     authorId: ?int,
     *     authorUsername: ?string,
     *     groupId: ?int,
     *     groupName: ?string,
     *     snippet: string,
     *     createdAt: ?string,
     *     score: float
     * }>
     */
    public function searchPosts(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $body = [
            'size' => $limit,
            'query' => [
                'function_score' => [
                    'query' => [
                        'multi_match' => [
                            'query'     => $query,
                            'fields'    => ['content^2', 'authorUsername', 'groupName'],
                            'fuzziness' => 'AUTO',
                            'operator'  => 'or',
                        ],
                    ],
                    'functions' => [
                        [
                            'gauss' => [
                                'createdAt' => [
                                    'origin' => 'now',
                                    'scale'  => '30d',
                                    'decay'  => 0.5,
                                ],
                            ],
                        ],
                    ],
                    'boost_mode' => 'multiply',
                    'score_mode' => 'multiply',
                ],
            ],
            'highlight' => [
                'fields' => [
                    'content' => [
                        'fragment_size'       => 120,
                        'number_of_fragments' => 1,
                        'pre_tags'            => ['<mark>'],
                        'post_tags'           => ['</mark>'],
                    ],
                ],
            ],
        ];

        $response = $this->elasticClient->search(IndexDefinitions::POSTS_INDEX, $body);
        return $this->parsePostHits($response);
    }

    /**
     * @param array<string, mixed> $response
     * @return array<int, array{
     *     id: int,
     *     authorId: ?int,
     *     authorUsername: ?string,
     *     groupId: ?int,
     *     groupName: ?string,
     *     snippet: string,
     *     createdAt: ?string,
     *     score: float
     * }>
     */
    private function parsePostHits(array $response): array
    {
        $hits = $response['hits']['hits'] ?? [];
        $results = [];
        foreach ($hits as $hit) {
            $source = $hit['_source'] ?? [];
            $snippet = $hit['highlight']['content'][0] ?? $this->truncate((string) ($source['content'] ?? ''), 120);

            $results[] = [
                'id'             => (int) ($hit['_id'] ?? 0),
                'authorId'       => isset($source['authorId']) ? (int) $source['authorId'] : null,
                'authorUsername' => $source['authorUsername'] ?? null,
                'groupId'        => isset($source['groupId']) ? (int) $source['groupId'] : null,
                'groupName'      => $source['groupName'] ?? null,
                'snippet'        => $snippet,
                'createdAt'      => $source['createdAt'] ?? null,
                'score'          => (float) ($hit['_score'] ?? 0.0),
            ];
        }
        return $results;
    }

    private function truncate(string $text, int $maxLength): string
    {
        if (mb_strlen($text) <= $maxLength) {
            return $text;
        }
        return mb_substr($text, 0, $maxLength - 1) . '…';
    }

    /**
     * @return array<int, array{
     *     id: int,
     *     username: ?string,
     *     firstname: ?string,
     *     lastname: ?string,
     *     avatarUrl: ?string,
     *     score: float
     * }>
     */
    public function searchUsers(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $fields = ['username^3', 'firstname^2', 'lastname^2'];
        $body = [
            'size' => $limit,
            'query' => [
                'bool' => [
                    'should' => [
                        [
                            'multi_match' => [
                                'query'  => $query,
                                'fields' => $fields,
                                'type'   => 'bool_prefix',
                            ],
                        ],
                        [
                            'multi_match' => [
                                'query'     => $query,
                                'fields'    => $fields,
                                'fuzziness' => 'AUTO',
                                'operator'  => 'or',
                            ],
                        ],
                    ],
                    'minimum_should_match' => 1,
                ],
            ],
        ];

        $response = $this->elasticClient->search(IndexDefinitions::USERS_INDEX, $body);
        return $this->parseUserHits($response);
    }

    /**
     * @return array<int, array{
     *     id: int,
     *     name: ?string,
     *     description: ?string,
     *     score: float
     * }>
     */
    public function searchGroups(string $query, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $body = [
            'size' => $limit,
            'query' => [
                'bool' => [
                    'should' => [
                        ['match_phrase_prefix' => ['name' => ['query' => $query]]],
                        ['match' => ['name' => ['query' => $query, 'fuzziness' => 'AUTO', 'operator' => 'or']]],
                    ],
                    'minimum_should_match' => 1,
                ],
            ],
        ];

        $response = $this->elasticClient->search(IndexDefinitions::GROUPS_INDEX, $body);
        return $this->parseGroupHits($response);
    }

    /**
     * @param array<string, mixed> $response
     * @return array<int, array{
     *     id: int,
     *     username: ?string,
     *     firstname: ?string,
     *     lastname: ?string,
     *     avatarUrl: ?string,
     *     score: float
     * }>
     */
    private function parseUserHits(array $response): array
    {
        $hits = $response['hits']['hits'] ?? [];
        $results = [];
        foreach ($hits as $hit) {
            $source = $hit['_source'] ?? [];
            $results[] = [
                'id'        => (int) ($hit['_id'] ?? 0),
                'username'  => $source['username']  ?? null,
                'firstname' => $source['firstname'] ?? null,
                'lastname'  => $source['lastname']  ?? null,
                'avatarUrl' => $source['avatarUrl'] ?? null,
                'score'     => (float) ($hit['_score'] ?? 0.0),
            ];
        }
        return $results;
    }

    /**
     * @param array<string, mixed> $response
     * @return array<int, array{
     *     id: int,
     *     name: ?string,
     *     description: ?string,
     *     score: float
     * }>
     */
    private function parseGroupHits(array $response): array
    {
        $hits = $response['hits']['hits'] ?? [];
        $results = [];
        foreach ($hits as $hit) {
            $source = $hit['_source'] ?? [];
            $results[] = [
                'id'          => (int) ($hit['_id'] ?? 0),
                'name'        => $source['name']        ?? null,
                'description' => $source['description'] ?? null,
                'score'       => (float) ($hit['_score'] ?? 0.0),
            ];
        }
        return $results;
    }
}
