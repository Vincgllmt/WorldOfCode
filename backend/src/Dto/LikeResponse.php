<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "LikeResponse",
    description: "Utilisateur ayant liké un post"
)]
class LikeResponse
{
    #[OA\Property(type: "integer", example: 1)]
    public int $userId;

    #[OA\Property(type: "string", example: "alice")]
    public string $username;
}
