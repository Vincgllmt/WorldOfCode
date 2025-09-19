<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "ReportResponse",
    description: "Représente un signalement de post"
)]
class ReportResponse
{
    #[OA\Property(type: "integer", example: 1)]
    public int $id;

    #[OA\Property(type: "integer", example: 12)]
    public int $postId;

    #[OA\Property(type: "string", example: "Spam / contenu inapproprié")]
    public ?string $reason = null;

    #[OA\Property(type: "integer", example: 5)]
    public int $userId;

    #[OA\Property(type: "string", example: "alice")]
    public string $username;

    #[OA\Property(type: "string", example: "2025-09-18 16:45:00")]
    public string $createdAt;
}
