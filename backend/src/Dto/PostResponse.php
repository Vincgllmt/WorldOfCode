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
        description: "Identifiant unique du post",
        type: "integer",
        example: 12
    )]
    public int $id;

    #[OA\Property(
        description: "Contenu textuel du post",
        type: "string",
        example: "Voici un exemple de contenu",
        nullable: true
    )]
    public ?string $content = null;

    #[OA\Property(
        description: "Date de création du post",
        type: "string",
        example: "2025-06-06 14:30:00"
    )]
    public string $createdAt;

    #[OA\Property(
        type: "string",
        example: "2025-06-06 15:00:00",
        nullable: true
    )]
    public ?string $updatedAt = null;

    #[OA\Property(
        description: "Identifiant de l’auteur du post",
        type: "integer",
        example: 3
    )]
    public int $authorId;

    #[OA\Property(
        description: "Nom de l’auteur du post",
        type: "string",
        example: "alice"
    )]
    public string $authorUsername;

    #[OA\Property(
        description: "URL de la photo de profil de l’auteur",
        type: "string",
        nullable: true
    )]
    public ?string $authorAvatarUrl = null;

    #[OA\Property(
        description: "Identifiant du groupe tech",
        type: "integer",
        example: 2
    )]
    public int $techGroupId;

    #[OA\Property(
        description: "Nom du groupe tech",
        type: "string",
        example: "Symfony"
    )]
    public string $techGroupName;

    #[OA\Property(
        description: "Post original partagé (si applicable)",
        type: "object",
        nullable: true
    )]
    public ?SharedPostResponse $sharedPost = null;

    #[OA\Property(
        description: "Nombre total de likes sur ce post",
        type: "integer",
        example: 5
    )]
    public int $likesCount = 0;

    #[OA\Property(
        description: "Indique si le post est liké par l’utilisateur connecté",
        type: "boolean",
        example: true
    )]
    public bool $likedByUser = false;
    #[OA\Property(
        description: "Nombre de fois que le post a été partagé",
        type: "integer",
        example: 3
    )]
    public int $sharedCount = 0;
}
