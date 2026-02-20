<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: 'SkillResponse',
    description: 'Represente une competence technique'
)]
class SkillResponse
{
    #[OA\Property(
        description: "Identifiant unique de la skill",
        type: 'integer',
        example: 1
    )]
    public int $id;

    #[OA\Property(
        description: "Nom de la competence",
        type: 'string',
        example: 'React'
    )]
    public string $name;

    #[OA\Property(
        description: "Categorie de la competence (language, frontend, backend, devops, design, etc.)",
        type: 'string',
        example: 'frontend'
    )]
    public string $category;
}
