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
        example: "Aut voluptatem nihil et nisi non repudiandae."
    )]
    public string $content;

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
}
