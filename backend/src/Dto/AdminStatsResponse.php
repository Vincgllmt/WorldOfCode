<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Statistiques admin globales')]
class AdminStatsResponse
{
    /**
     * @param AdminTopGroupDto[] $topGroups
     */
    public function __construct(
        #[OA\Property(description: 'Nombre total d\'utilisateurs', example: 312)]
        public readonly int $totalUsers,

        #[OA\Property(description: 'Nombre total de posts', example: 1540)]
        public readonly int $totalPosts,

        #[OA\Property(description: 'Nombre total de groupes', example: 25)]
        public readonly int $totalGroups,

        #[OA\Property(description: 'Nombre de reports en attente', example: 7)]
        public readonly int $pendingReportsCount,

        #[OA\Property(description: 'Nombre de suggestions de groupes en attente', example: 3)]
        public readonly int $pendingGroupSuggestionsCount,

        #[OA\Property(description: 'Nombre de feedbacks non lus', example: 5)]
        public readonly int $newFeedbacksCount,

        #[OA\Property(description: 'Nouveaux utilisateurs cette semaine', example: 12)]
        public readonly int $newUsersThisWeek,

        #[OA\Property(description: 'Nouveaux posts cette semaine', example: 48)]
        public readonly int $newPostsThisWeek,

        #[OA\Property(description: 'Top 5 groupes les plus actifs')]
        public readonly array $topGroups,
    ) {}
}
