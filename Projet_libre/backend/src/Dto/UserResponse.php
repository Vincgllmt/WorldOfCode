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
        type: "integer",
        example: 1,
        description: "Identifiant unique de l'utilisateur"
    )]
    public int $id;

    #[OA\Property(
        type: "string",
        example: "alice",
        description: "Nom d'utilisateur"
    )]
    public string $username;

    #[OA\Property(
        type: "string",
        example: "ROLE_USER",
        description: "Rôle de l'utilisateur"
    )]
    public string $role;

    #[OA\Property(
        type: "string",
        example: "2025-06-06 14:00:00",
        nullable: true,
        description: "Date de création du compte"
    )]
    public ?string $creationDate = null;

    #[OA\Property(
        type: "string",
        example: "2025-06-06 15:30:00",
        nullable: true,
        description: "Date de dernière mise à jour du compte"
    )]
    public ?string $updatedDate = null;
}
