<?php

namespace App\Dto;

use App\Enum\Availability;
use OpenApi\Attributes as OA;
use Symfony\Component\Validator\Constraints as Assert;

#[OA\Schema(
    title: 'UserProfileUpdateRequest',
    description: 'Payload de mise a jour du profil CV utilisateur'
)]
class UserProfileUpdateRequest
{
    #[Assert\Length(max: 1000)]
    #[OA\Property(
        description: "Biographie / tagline de l'utilisateur",
        type: 'string',
        example: 'Fullstack dev passionne par le Go et React',
        nullable: true
    )]
    public readonly ?string $bio;

    #[Assert\Length(max: 150)]
    #[OA\Property(
        description: "Localisation de l'utilisateur",
        type: 'string',
        example: 'Paris, France',
        nullable: true
    )]
    public readonly ?string $location;

    #[Assert\Choice(callback: [Availability::class, 'values'])]
    #[OA\Property(
        description: "Disponibilite (open_to_work, employed, freelance, student)",
        type: 'string',
        example: 'open_to_work',
        nullable: true
    )]
    public readonly ?string $availability;

    #[OA\Property(
        description: "Liste des experiences professionnelles (JSON)",
        type: 'array',
        items: new OA\Items(
            properties: [
                new OA\Property(property: 'title', type: 'string', example: 'Developpeur fullstack'),
                new OA\Property(property: 'company', type: 'string', example: 'Acme Corp'),
                new OA\Property(property: 'startDate', type: 'string', example: '2023-01', description: 'Date de debut au format YYYY-MM'),
                new OA\Property(property: 'endDate', type: 'string', example: '2025-06', description: 'Date de fin au format YYYY-MM, null si poste actuel', nullable: true),
                new OA\Property(property: 'description', type: 'string', example: 'Developpement d\'une plateforme SaaS')
            ],
            type: 'object'
        ),
        nullable: true
    )]
    public readonly ?array $experiences;

    #[OA\Property(
        description: "Liste des IDs de skills a associer au profil",
        type: 'array',
        items: new OA\Items(type: 'integer', example: 1),
        nullable: true
    )]
    public readonly ?array $skillIds;

    public function __construct(
        ?string $bio,
        ?string $location,
        ?string $availability,
        ?array $experiences,
        ?array $skillIds
    ) {
        $this->bio = $bio;
        $this->location = $location;
        $this->availability = $availability;
        $this->experiences = $experiences;
        $this->skillIds = $skillIds;
    }

    public static function fromArray(array $payload): self
    {
        return new self(
            $payload['bio'] ?? null,
            $payload['location'] ?? null,
            $payload['availability'] ?? null,
            $payload['experiences'] ?? null,
            $payload['skillIds'] ?? null
        );
    }
}
