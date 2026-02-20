<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "LikeResponse",
    description: "Utilisateur ayant like un post"
)]
class LikeResponse
{
    #[OA\Property(
        description: "Identifiant de l'utilisateur",
        type: "integer",
        example: 1
    )]
    public int $userId;

    #[OA\Property(
        description: "Nom d'utilisateur",
        type: "string",
        example: "alice"
    )]
    public string $username;
}
