<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "ExperienceResponse",
    description: "Represente une experience professionnelle structuree"
)]
class ExperienceResponse
{
    #[OA\Property(description: "UUID de l'experience", type: "string", example: "550e8400-e29b-41d4-a716-446655440000")]
    public string $id;

    #[OA\Property(description: "Intitule du poste", type: "string", example: "Developpeur Fullstack")]
    public string $title;

    #[OA\Property(description: "Nom de l'entreprise", type: "string", example: "Acme Corp")]
    public string $company;

    #[OA\Property(description: "Localisation", type: "string", example: "Paris, France", nullable: true)]
    public ?string $location = null;

    #[OA\Property(description: "Date de debut (YYYY-MM)", type: "string", example: "2023-01")]
    public string $startDate;

    #[OA\Property(description: "Date de fin (YYYY-MM), null si poste actuel", type: "string", example: "2024-06", nullable: true)]
    public ?string $endDate = null;

    #[OA\Property(description: "Description du poste", type: "string", nullable: true)]
    public ?string $description = null;

    #[OA\Property(description: "Position dans la timeline (ordre d'affichage)", type: "integer", example: 0)]
    public int $position;

    #[OA\Property(description: "Visibilite (PUBLIC, CONNECTED, PRIVATE)", type: "string", example: "PUBLIC")]
    public string $visibility;

    #[OA\Property(
        description: "Competences associees a cette experience",
        type: "array",
        items: new OA\Items(ref: new \Nelmio\ApiDocBundle\Attribute\Model(type: SkillResponse::class))
    )]
    public array $skills = [];
}
