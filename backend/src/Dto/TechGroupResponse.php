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
        description: "Identifiant unique du groupe",
        type: 'integer',
        example: 1
    )]
    public int $id;

    #[OA\Property(
        description: "Nom du groupe technique",
        type: 'string',
        example: 'Symfony'
    )]
    public string $name;

    #[OA\Property(
        description: "Description optionnelle du groupe",
        type: 'string',
        example: 'Groupe dédié à Symfony',
        nullable: true
    )]
    public ?string $description = null;

    #[OA\Property(
        description: "Identifiant de l’utilisateur ayant créé le groupe",
        type: 'integer',
        example: 42,
        nullable: true
    )]
    public ?int $creatorId = null;

    #[OA\Property(
        description: "Date de création du groupe (format Y-m-d H:i:s)",
        type: 'string',
        example: '2025-06-06 14:00:00',
        nullable: true
    )]
    public ?string $createdAt = null;
}
