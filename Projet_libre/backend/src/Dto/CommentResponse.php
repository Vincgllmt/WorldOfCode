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
        description: "Identifiant du commentaire",
        type: "integer",
        example: 42
    )]
    public int $id;

    #[OA\Property(
        description: "Contenu du commentaire",
        type: "string",
        example: "Merci pour ton post !"
    )]
    public string $content;

    #[OA\Property(
        description: "Date de création",
        type: "string",
        example: "2025-06-12 10:00:00"
    )]
    public string $createdAt;

    #[OA\Property(
        description: "Date de mise à jour",
        type: "string",
        example: "2025-06-12 11:00:00",
        nullable: true
    )]
    public ?string $updatedAt = null;

    #[OA\Property(
        description: "ID de l’auteur",
        type: "integer",
        example: 5
    )]
    public int $authorId;

    #[OA\Property(
        description: "Nom d’utilisateur de l’auteur",
        type: "string",
        example: "eugenie"
    )]
    public string $authorUsername;

    #[OA\Property(
        description: "ID du post associé",
        type: "integer",
        example: 9
    )]
    public int $postId;
}
