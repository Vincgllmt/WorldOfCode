<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "TechGroupResponse",
    description: "Représente un groupe technique dans la plateforme"
)]
class TechGroupResponse
{
    #[OA\Property(
        type: 'integer',
        example: 1,
        description: "Identifiant unique du groupe"
    )]
    public int $id;

    #[OA\Property(
        type: 'string',
        example: 'Symfony',
        description: "Nom du groupe technique"
    )]
    public string $name;

    #[OA\Property(
        type: 'string',
        example: 'Groupe dédié à Symfony',
        nullable: true,
        description: "Description optionnelle du groupe"
    )]
    public ?string $description = null;

    #[OA\Property(
        type: 'integer',
        example: 42,
        nullable: true,
        description: "Identifiant de l’utilisateur ayant créé le groupe"
    )]
    public ?int $creatorId = null;

    #[OA\Property(
        type: 'string',
        example: '2025-06-06 14:00:00',
        nullable: true,
        description: "Date de création du groupe (format Y-m-d H:i:s)"
    )]
    public ?string $createdAt = null;
}
