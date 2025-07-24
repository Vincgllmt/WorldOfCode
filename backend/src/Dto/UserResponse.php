<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "UserResponse",
    description: "Représente un utilisateur dans les réponses API"
)]
class UserResponse
{
    #[OA\Property(
        description: "Identifiant unique de l'utilisateur",
        type: "integer",
        example: 1
    )]
    public int $id;

    #[OA\Property(
        description: "Nom d'utilisateur",
        type: "string",
        example: "alice"
    )]
    public string $username;

    #[OA\Property(
        description: "Rôle de l'utilisateur",
        type: "string",
        example: "ROLE_USER"
    )]
    public string $role;

    #[OA\Property(
        description: "Date de création du compte",
        type: "string",
        example: "2025-06-06 14:00:00",
        nullable: true
    )]
    public ?string $creationDate = null;

    #[OA\Property(
        description: "Date de dernière mise à jour du compte",
        type: "string",
        example: "2025-06-06 15:30:00",
        nullable: true
    )]
    public ?string $updatedDate = null;
}
