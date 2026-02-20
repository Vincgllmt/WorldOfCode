<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: 'UserLinkResponse',
    description: 'Represente un lien externe du profil utilisateur (GitHub, LinkedIn, etc.)'
)]
class UserLinkResponse
{
    #[OA\Property(
        description: "Identifiant unique du lien",
        type: 'integer',
        example: 1
    )]
    public int $id;

    #[OA\Property(
        description: "Type de lien (github, gitlab, linkedin, portfolio, other)",
        type: 'string',
        example: 'github'
    )]
    public string $type;

    #[OA\Property(
        description: "URL du lien",
        type: 'string',
        example: 'https://github.com/alice'
    )]
    public string $url;
}
