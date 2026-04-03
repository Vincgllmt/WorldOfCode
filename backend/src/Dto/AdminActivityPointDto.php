<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Point d\'activité journalier')]
class AdminActivityPointDto
{
    public function __construct(
        #[OA\Property(description: 'Date au format Y-m-d', example: '2026-03-01')]
        public readonly string $date,

        #[OA\Property(description: 'Nouveaux utilisateurs ce jour', example: 3)]
        public readonly int $newUsers,

        #[OA\Property(description: 'Nouveaux posts ce jour', example: 12)]
        public readonly int $newPosts,
    ) {}
}
