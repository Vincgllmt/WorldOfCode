<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "CommentResponse",
    description: "Représente un commentaire dans les réponses API"
)]
class CommentResponse
{
    #[OA\Property(
        type: "integer",
        example: 42,
        description: "Identifiant du commentaire"
    )]
    public int $id;

    #[OA\Property(
        type: "string",
        example: "Merci pour ton post !",
        description: "Contenu du commentaire"
    )]
    public string $content;

    #[OA\Property(
        type: "string",
        example: "2025-06-12 10:00:00",
        description: "Date de création"
    )]
    public string $createdAt;

    #[OA\Property(
        type: "string",
        example: "2025-06-12 11:00:00",
        nullable: true,
        description: "Date de mise à jour"
    )]
    public ?string $updatedAt = null;

    #[OA\Property(
        type: "integer",
        example: 5,
        description: "ID de l’auteur"
    )]
    public int $authorId;

    #[OA\Property(
        type: "string",
        example: "eugenie",
        description: "Nom d’utilisateur de l’auteur"
    )]
    public string $authorUsername;

    #[OA\Property(
        type: "integer",
        example: 9,
        description: "ID du post associé"
    )]
    public int $postId;
}
