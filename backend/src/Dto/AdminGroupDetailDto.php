<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Détail complet d\'un groupe pour l\'administration')]
class AdminGroupDetailDto
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,

        #[OA\Property(nullable: true)]
        public readonly ?string $description,

        public readonly string $createdAt,

        #[OA\Property(nullable: true)]
        public readonly ?string $creatorUsername,

        #[OA\Property(nullable: true)]
        public readonly ?string $creatorAvatarUrl,

        #[OA\Property(nullable: true)]
        public readonly ?string $rssFeedUrl,

        public readonly int $memberCount,
        public readonly int $postCount,

        /** @var array<int, array{id: int, username: string, avatarUrl: ?string}> */
        public readonly array $members,

        /** @var array<int, array{id: int, excerpt: ?string, authorUsername: string, createdAt: string, likesCount: int, commentsCount: int}> */
        public readonly array $recentPosts,
    ) {}
}
