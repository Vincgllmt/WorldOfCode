<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Post dans la liste admin avec métriques')]
class AdminPostListItemDto
{
    public function __construct(
        #[OA\Property(example: 42)]
        public readonly int $id,

        #[OA\Property(description: 'Extrait du contenu (100 chars)', nullable: true, example: 'Voici mon retour sur...')]
        public readonly ?string $excerpt,

        #[OA\Property(example: 'john.doe')]
        public readonly string $authorUsername,

        #[OA\Property(description: 'Nom du groupe', nullable: true, example: 'React France')]
        public readonly ?string $techGroupName,

        #[OA\Property(description: 'Nombre de likes', example: 17)]
        public readonly int $likesCount,

        #[OA\Property(description: 'Nombre de commentaires', example: 5)]
        public readonly int $commentsCount,

        #[OA\Property(description: 'Nombre de reports', example: 2)]
        public readonly int $reportsCount,

        #[OA\Property(description: 'Date de publication ISO 8601', example: '2026-03-01T14:00:00+00:00')]
        public readonly string $createdAt,
    ) {}
}
