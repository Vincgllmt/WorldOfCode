<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "UserResponse",
    description: "Represente un utilisateur dans les reponses API"
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
        description: "Role de l'utilisateur",
        type: "string",
        example: "ROLE_USER"
    )]
    public string $role;

    #[OA\Property(
        description: "Prenom de l'utilisateur",
        type: "string",
        example: "Alice"
    )]
    public string $firstname;

    #[OA\Property(
        description: "Nom de famille de l'utilisateur",
        type: "string",
        example: "Dupont"
    )]
    public string $lastname;

    #[OA\Property(
        description: "Adresse email de l'utilisateur",
        type: "string",
        example: "alice@example.com"
    )]
    public string $email;


    #[OA\Property(
        description: "Date de creation du compte",
        type: "string",
        example: "2025-06-06 14:00:00",
        nullable: true
    )]
    public ?string $creationDate = null;

    #[OA\Property(
        description: "Date de derniere mise a jour du compte",
        type: "string",
        example: "2025-06-06 15:30:00",
        nullable: true
    )]
    public ?string $updatedDate = null;

    #[OA\Property(
        description: "Theme d'interface choisi par l'utilisateur",
        type: "string",
        example: "dark",
        nullable: true
    )]
    public ?string $theme = null;

    #[OA\Property(
        description: "URL de la photo de profil de l'utilisateur",
        type: "string",
        example: "http://localhost:9000/bucket/avatar.jpg",
        nullable: true
    )]
    public ?string $avatarUrl = null;

    // --- Nouveaux champs profil CV ---

    #[OA\Property(
        description: "Biographie / tagline de l'utilisateur",
        type: "string",
        example: "Fullstack dev passionne par le Go et React",
        nullable: true
    )]
    public ?string $bio = null;

    #[OA\Property(
        description: "Localisation de l'utilisateur",
        type: "string",
        example: "Paris, France",
        nullable: true
    )]
    public ?string $location = null;

    #[OA\Property(
        description: "Disponibilite de l'utilisateur (open_to_work, employed, freelance, student)",
        type: "string",
        example: "open_to_work",
        nullable: true
    )]
    public ?string $availability = null;

    #[OA\Property(
        description: "Experiences professionnelles structurees",
        type: "array",
        items: new OA\Items(ref: new \Nelmio\ApiDocBundle\Attribute\Model(type: ExperienceResponse::class)),
        nullable: true
    )]
    public ?array $experiences = null;

    #[OA\Property(
        description: "Competences techniques de l'utilisateur",
        type: "array",
        items: new OA\Items(ref: new \Nelmio\ApiDocBundle\Attribute\Model(type: SkillResponse::class)),
        nullable: true
    )]
    public ?array $skills = null;

    #[OA\Property(
        description: "Liens externes du profil (GitHub, LinkedIn, etc.)",
        type: "array",
        items: new OA\Items(ref: new \Nelmio\ApiDocBundle\Attribute\Model(type: UserLinkResponse::class)),
        nullable: true
    )]
    public ?array $links = null;

    #[OA\Property(
        description: "Visibilite par champ (bio, location, availability, email) — null pour les visiteurs anonymes",
        type: "object",
        nullable: true,
        example: ["bio" => "PUBLIC", "location" => "PUBLIC", "availability" => "PUBLIC", "email" => "PRIVATE"]
    )]
    public ?array $fieldVisibility = null;

    #[OA\Property(
        description: "Token UUID de partage public du CV — expose uniquement au proprietaire",
        type: "string",
        nullable: true,
        example: "550e8400-e29b-41d4-a716-446655440000"
    )]
    public ?string $cvPublicToken = null;
}
