<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "ProfileHighlightResponse",
    description: "Post epingle en Temps fort sur le profil"
)]
class ProfileHighlightResponse
{
    #[OA\Property(description: "UUID du highlight", type: "string")]
    public string $id;

    #[OA\Property(description: "Position d'affichage (0-based)", type: "integer")]
    public int $position;

    #[OA\Property(description: "Visibilite (PUBLIC, CONNECTED, PRIVATE)", type: "string")]
    public string $visibility;

    #[OA\Property(description: "ID du post epingle", type: "integer")]
    public int $postId;

    #[OA\Property(description: "Extrait du contenu du post (280 chars max)", type: "string")]
    public string $postContent;

    #[OA\Property(description: "Nom d'utilisateur de l'auteur du post", type: "string")]
    public string $postAuthor;
}
