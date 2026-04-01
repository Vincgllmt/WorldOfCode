<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: "Résumé d'un post pour le panneau admin")]
class AdminPostSummaryDto
{
    public function __construct(
        #[OA\Property(example: 42)]
        public readonly int $id,

        #[OA\Property(description: 'Extrait du contenu (80 chars max)', example: 'Voici mon retour sur...', nullable: true)]
        public readonly ?string $excerpt,

        #[OA\Property(description: 'Date de publication ISO 8601', example: '2026-03-01T14:00:00+00:00')]
        public readonly string $createdAt,

        #[OA\Property(description: 'Nombre de likes', example: 17)]
        public readonly int $likesCount,

        #[OA\Property(description: 'Nombre de commentaires', example: 5)]
        public readonly int $commentsCount,
    ) {}
}
