<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "SharedPostResponse",
    description: "Représente un post original qui a été partagé"
)]
class SharedPostResponse
{
    #[OA\Property(
        description: "Identifiant du post partagé",
        type: "integer",
        example: 1
    )]
    public int $id;

    #[OA\Property(
        description: "Contenu textuel du post partagé",
        type: "string",
        example: "Aut voluptatem nihil et nisi non repudiandae.",
        nullable: true
    )]
    public ?string $content = null;

    #[OA\Property(
        description: "Date de création du post partagé",
        type: "string",
        example: "2025-06-06 14:30:00"
    )]
    public string $createdAt;

    #[OA\Property(
        description: "Date de mise à jour du post partagé",
        type: "string",
        example: "2025-06-06 15:00:00",
        nullable: true
    )]
    public ?string $updatedAt = null;

    #[OA\Property(
        description: "Identifiant de l’auteur du post partagé",
        type: "integer",
        example: 24
    )]
    public int $authorId;

    #[OA\Property(
        description: "Nom d’utilisateur de l’auteur du post partagé",
        type: "string",
        example: "eugenie"
    )]
    public string $authorUsername;

    #[OA\Property(
        description: "URL de la photo de profil de l’auteur du post partagé",
        type: "string",
        nullable: true
    )]
    public ?string $authorAvatarUrl = null;

    #[OA\Property(
        description: "Identifiant du groupe tech du post partagé",
        type: "integer",
        example: 2
    )]
    public int $techGroupId;

    #[OA\Property(
        description: "Nom du groupe tech du post partagé",
        type: "string",
        example: "Symfony"
    )]
    public string $techGroupName;

    #[OA\Property(
        description: "Nombre total de likes sur le post partagé",
        type: "integer",
        example: 10
    )]
    public int $likesCount = 0;

    #[OA\Property(
        description: "Indique si le post partagé est liké par l’utilisateur connecté",
        type: "boolean",
        example: false
    )]
    public bool $likedByUser = false;

    #[OA\Property(
        description: "Nombre de fois que le post partagé a été repartagé",
        type: "integer",
        example: 2
    )]
    public int $sharedCount = 0;
}
