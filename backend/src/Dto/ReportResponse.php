<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "ReportResponse",
    description: "Represente un signalement de post"
)]
class ReportResponse
{
    #[OA\Property(
        description: "Identifiant unique du signalement",
        type: "integer",
        example: 1
    )]
    public int $id;

    #[OA\Property(
        description: "Identifiant du post signale",
        type: "integer",
        example: 12
    )]
    public int $postId;

    #[OA\Property(
        description: "Raison du signalement",
        type: "string",
        example: "Spam / contenu inapproprie",
        nullable: true
    )]
    public ?string $reason = null;

    #[OA\Property(
        description: "Identifiant de l'utilisateur ayant signale",
        type: "integer",
        example: 5
    )]
    public int $userId;

    #[OA\Property(
        description: "Nom d'utilisateur de l'auteur du signalement",
        type: "string",
        example: "alice"
    )]
    public string $username;

    #[OA\Property(
        description: "Date de creation du signalement",
        type: "string",
        example: "2025-09-18 16:45:00"
    )]
    public string $createdAt;
}
