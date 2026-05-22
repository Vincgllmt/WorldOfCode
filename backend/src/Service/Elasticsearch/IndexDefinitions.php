<?php

namespace App\Service\Elasticsearch;

class IndexDefinitions
{
    public const POSTS_INDEX  = 'posts';
    public const USERS_INDEX  = 'users';
    public const GROUPS_INDEX = 'groups';

    /**
     * @return array<string, array{settings: array<string,mixed>, mappings: array<string,mixed>}>
     */
    public static function all(): array
    {
        return [
            self::POSTS_INDEX  => self::postsMapping(),
            self::USERS_INDEX  => self::usersMapping(),
            self::GROUPS_INDEX => self::groupsMapping(),
        ];
    }

    /**
     * @return array{settings: array<string,mixed>, mappings: array<string,mixed>}
     */
    public static function postsMapping(): array
    {
        return [
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
            ],
            'mappings' => [
                'properties' => [
                    'content'        => ['type' => 'text', 'analyzer' => 'french'],
                    'authorId'       => ['type' => 'integer'],
                    'authorUsername' => [
                        'type'   => 'text',
                        'fields' => ['keyword' => ['type' => 'keyword']],
                    ],
                    'groupId'        => ['type' => 'integer'],
                    'groupName'      => ['type' => 'text'],
                    'createdAt'      => ['type' => 'date'],
                    'imageUrl'       => ['type' => 'keyword', 'index' => false],
                    'likesCount'     => ['type' => 'integer'],
                ],
            ],
        ];
    }

    /**
     * @return array{settings: array<string,mixed>, mappings: array<string,mixed>}
     */
    public static function usersMapping(): array
    {
        return [
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
            ],
            'mappings' => [
                'properties' => [
                    'username' => [
                        'type'   => 'text',
                        'fields' => ['keyword' => ['type' => 'keyword']],
                    ],
                    'firstname'    => ['type' => 'text'],
                    'lastname'     => ['type' => 'text'],
                    'bio'          => ['type' => 'text', 'analyzer' => 'french'],
                    'location'     => [
                        'type'   => 'text',
                        'fields' => ['keyword' => ['type' => 'keyword']],
                    ],
                    'availability' => ['type' => 'keyword'],
                    'avatarUrl'    => ['type' => 'keyword', 'index' => false],
                    'skills'       => ['type' => 'keyword'],
                ],
            ],
        ];
    }

    /**
     * @return array{settings: array<string,mixed>, mappings: array<string,mixed>}
     */
    public static function groupsMapping(): array
    {
        return [
            'settings' => [
                'number_of_shards' => 1,
                'number_of_replicas' => 0,
            ],
            'mappings' => [
                'properties' => [
                    'name' => [
                        'type'   => 'text',
                        'fields' => ['keyword' => ['type' => 'keyword']],
                    ],
                    'description' => ['type' => 'text', 'analyzer' => 'french'],
                    'createdAt'   => ['type' => 'date'],
                ],
            ],
        ];
    }
}
