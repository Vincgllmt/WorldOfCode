<?php
namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Groupe dans la liste admin avec métriques')]
class AdminGroupListItemDto
{
    public function __construct(
        #[OA\Property(example: 3)]
        public readonly int $id,

        #[OA\Property(example: 'React France')]
        public readonly string $name,

        #[OA\Property(nullable: true, example: 'Communauté des développeurs React')]
        public readonly ?string $description,

        #[OA\Property(description: 'Nombre de membres', example: 42)]
        public readonly int $memberCount,

        #[OA\Property(description: 'Nombre de posts publiés', example: 128)]
        public readonly int $postCount,

        #[OA\Property(description: 'Username du créateur (null si créateur supprimé)', nullable: true, example: 'john.doe')]
        public readonly ?string $creatorUsername,

        #[OA\Property(description: 'Date de création ISO 8601', example: '2026-01-10T09:00:00+00:00')]
        public readonly string $createdAt,
    ) {}
}
