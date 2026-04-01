<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Report enrichi pour le panneau de modération admin')]
class AdminReportDto
{
    public function __construct(
        #[OA\Property(example: 1)]
        public readonly int $id,

        #[OA\Property(description: 'ID du post signalé (null si post supprimé)', nullable: true, example: 12)]
        public readonly ?int $postId,

        #[OA\Property(description: 'Extrait du contenu du post (null si post supprimé)', nullable: true, example: 'Ce post contient...')]
        public readonly ?string $postExcerpt,

        #[OA\Property(description: 'Contenu complet du post (null si post supprimé)', nullable: true)]
        public readonly ?string $postContent,

        #[OA\Property(description: "Username de l'auteur du post signalé (null si post supprimé)", nullable: true, example: 'john.doe')]
        public readonly ?string $postAuthorUsername,

        #[OA\Property(description: "ID de l'auteur du post (null si post supprimé)", nullable: true, example: 7)]
        public readonly ?int $postAuthorId,

        #[OA\Property(description: 'Nom du groupe du post (null si post supprimé)', nullable: true, example: 'React France')]
        public readonly ?string $postTechGroupName,

        #[OA\Property(description: 'Nombre de likes sur le post', nullable: true, example: 12)]
        public readonly ?int $postLikesCount,

        #[OA\Property(description: 'Nombre de commentaires sur le post', nullable: true, example: 3)]
        public readonly ?int $postCommentsCount,

        #[OA\Property(description: "Username de l'utilisateur qui a signalé", example: 'alice')]
        public readonly string $reportedByUsername,

        #[OA\Property(description: 'Raison du signalement', nullable: true, example: 'Spam')]
        public readonly ?string $reason,

        #[OA\Property(description: 'Date du signalement ISO 8601', example: '2026-03-11T10:00:00+00:00')]
        public readonly string $createdAt,

        #[OA\Property(description: 'Statut du report', enum: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], example: 'PENDING')]
        public readonly string $status,

        #[OA\Property(description: 'Admin ayant pris en charge', nullable: true, example: 'admin.dupont')]
        public readonly ?string $claimedByUsername,

        #[OA\Property(description: 'Date de prise en charge ISO 8601', nullable: true)]
        public readonly ?string $claimedAt,

        #[OA\Property(description: 'Admin ayant résolu/rejeté', nullable: true)]
        public readonly ?string $resolvedByUsername,

        #[OA\Property(description: 'Date de résolution ISO 8601', nullable: true)]
        public readonly ?string $resolvedAt,

        #[OA\Property(description: 'Note de résolution', nullable: true)]
        public readonly ?string $resolutionNote,
    ) {}
}
