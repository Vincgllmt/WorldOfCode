<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Groupe le plus actif')]
class AdminTopGroupDto
{
    public function __construct(
        #[OA\Property(example: 1)]
        public readonly int $id,

        #[OA\Property(example: 'React')]
        public readonly string $name,

        #[OA\Property(description: 'Nombre de membres', example: 42)]
        public readonly int $memberCount,

        #[OA\Property(description: 'Nombre de posts ce mois', example: 18)]
        public readonly int $postCountThisMonth,
    ) {}
}
