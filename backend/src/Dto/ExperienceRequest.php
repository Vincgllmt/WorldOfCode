<?php

namespace App\Dto;

use OpenApi\Attributes as OA;
use Symfony\Component\Validator\Constraints as Assert;

#[OA\Schema(
    title: 'ExperienceRequest',
    description: 'Payload de creation ou mise a jour d\'une experience professionnelle'
)]
class ExperienceRequest
{
    #[Assert\NotBlank(message: 'Le titre est requis')]
    #[OA\Property(description: "Intitule du poste", type: 'string', example: 'Developpeur Fullstack')]
    public string $title = '';

    #[Assert\NotBlank(message: 'La societe est requise')]
    #[OA\Property(description: "Nom de l'entreprise", type: 'string', example: 'Acme Corp')]
    public string $company = '';

    #[Assert\NotBlank(message: 'La date de debut est requise')]
    #[Assert\Regex(pattern: '/^\d{4}-\d{2}$/', message: 'Format YYYY-MM attendu')]
    #[OA\Property(description: "Date de debut (YYYY-MM)", type: 'string', example: '2023-01')]
    public string $startDate = '';

    #[OA\Property(description: "Localisation", type: 'string', nullable: true)]
    public ?string $location = null;

    #[OA\Property(description: "Date de fin (YYYY-MM), null si poste actuel", type: 'string', nullable: true)]
    public ?string $endDate = null;

    #[OA\Property(description: "Description du poste", type: 'string', nullable: true)]
    public ?string $description = null;

    public static function fromArray(array $data): self
    {
        $dto = new self();
        $dto->title       = trim($data['title'] ?? '');
        $dto->company     = trim($data['company'] ?? '');
        $dto->startDate   = trim($data['startDate'] ?? '');
        $dto->location    = isset($data['location']) ? trim($data['location']) : null;
        $dto->endDate     = isset($data['endDate']) ? trim($data['endDate']) : null;
        $dto->description = isset($data['description']) ? trim($data['description']) : null;
        return $dto;
    }
}
