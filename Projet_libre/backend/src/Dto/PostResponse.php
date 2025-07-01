<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "PostResponse",
    description: "Représente un post dans les réponses API"
)]
class PostResponse
{
    #[OA\Property(
        type: "integer",
        example: 12,
        description: "Identifiant unique du post"
    )]
    public int $id;

    #[OA\Property(
        type: "string",
        example: "Voici un exemple de contenu",
        description: "Contenu textuel du post"
    )]
    public string $content;

    #[OA\Property(
        type: "string",
        example: "2025-06-06 14:30:00",
        description: "Date de création du post"
    )]
    public string $createdAt;

    #[OA\Property(
        type: "string",
        example: "2025-06-06 15:00:00",
        nullable: true
    )]
    public ?string $updatedAt = null;

    #[OA\Property(
        type: "integer",
        example: 3,
        description: "Identifiant de l’auteur du post"
    )]
    public int $authorId;

    #[OA\Property(
        type: "string",
        example: "alice",
        description: "Nom de l’auteur du post"
    )]
    public string $authorUsername;

    #[OA\Property(
        type: "integer",
        example: 2,
        description: "Identifiant du groupe tech"
    )]
    public int $techGroupId;

    #[OA\Property(
        type: "string",
        example: "Symfony",
        description: "Nom du groupe tech"
    )]
    public string $techGroupName;
}
