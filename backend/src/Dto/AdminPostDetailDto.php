<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Détail complet d\'un post pour l\'administration')]
class AdminPostDetailDto
{
    public function __construct(
        #[OA\Property(example: 42)]
        public readonly int $id,

        #[OA\Property(nullable: true)]
        public readonly ?string $content,

        #[OA\Property(nullable: true)]
        public readonly ?string $imageUrl,

        #[OA\Property(example: '2026-03-01T14:00:00+00:00')]
        public readonly string $createdAt,

        public readonly int $authorId,
        public readonly string $authorUsername,

        #[OA\Property(nullable: true)]
        public readonly ?string $authorAvatarUrl,

        public readonly string $authorEmail,

        #[OA\Property(nullable: true)]
        public readonly ?string $techGroupName,

        public readonly int $likesCount,
        public readonly int $commentsCount,
        public readonly int $reportsCount,

        #[OA\Property(nullable: true)]
        public readonly ?int $sharedFromId,

        #[OA\Property(nullable: true)]
        public readonly ?string $sharedFromExcerpt,

        #[OA\Property(nullable: true)]
        public readonly ?string $sharedFromAuthorUsername,

        /** @var array<int, array{id: int, content: string, authorUsername: string, createdAt: string}> */
        public readonly array $lastComments,

        /** @var array<int, array{id: int, reason: ?string, status: string, reportedByUsername: string, createdAt: string}> */
        public readonly array $reports,
    ) {}
}
