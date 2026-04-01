<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Statistiques admin globales')]
class AdminStatsResponse
{
    public function __construct(
        #[OA\Property(description: 'Nombre de reports en attente (ou total si status non implémenté)', example: 5)]
        public readonly int $pendingReportsCount,
    ) {}
}
