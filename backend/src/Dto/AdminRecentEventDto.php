<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Événement récent du réseau')]
class AdminRecentEventDto
{
    public function __construct(
        #[OA\Property(description: 'Type d\'événement', enum: ['new_user', 'new_post', 'new_report'], example: 'new_post')]
        public readonly string $type,

        #[OA\Property(description: 'Nom d\'utilisateur de l\'acteur', example: 'sarah.dev')]
        public readonly string $actor,

        #[OA\Property(description: 'Extrait du contenu (posts uniquement)', nullable: true, example: 'Voici mon retour sur...')]
        public readonly ?string $excerpt,

        #[OA\Property(description: 'Date ISO 8601', example: '2026-03-11T14:32:00+00:00')]
        public readonly string $createdAt,
    ) {}
}
