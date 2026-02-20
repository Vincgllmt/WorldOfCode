<?php

namespace App\Dto;

use App\Enum\UserRole;
use OpenApi\Attributes as OA;
use Symfony\Component\Validator\Constraints as Assert;

#[OA\Schema(
    title: 'UserUpdateRequest',
    description: 'Payload de mise a jour des informations de base d\'un utilisateur'
)]
class UserUpdateRequest
{
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 255)]
    #[OA\Property(
        description: "Nom d'utilisateur unique",
        type: 'string',
        example: 'alice'
    )]
    public readonly string $username;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 100)]
    #[OA\Property(
        description: "Prenom de l'utilisateur",
        type: 'string',
        example: 'Alice'
    )]
    public readonly string $firstname;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 100)]
    #[OA\Property(
        description: "Nom de famille de l'utilisateur",
        type: 'string',
        example: 'Dupont'
    )]
    public readonly string $lastname;

    #[Assert\NotBlank]
    #[Assert\Email]
    #[OA\Property(
        description: "Adresse email de l'utilisateur",
        type: 'string',
        example: 'alice@example.com'
    )]
    public readonly string $email;

    #[Assert\NotBlank]
    #[Assert\Choice(callback: [UserRole::class, 'values'])]
    #[OA\Property(
        description: "Role de l'utilisateur (ROLE_USER ou ROLE_ADMIN, modifiable uniquement par un admin)",
        type: 'string',
        example: 'ROLE_USER'
    )]
    public readonly string $role;

    public function __construct(string $username, string $firstname, string $lastname, string $email, string $role)
    {
        $this->username = $username;
        $this->firstname = $firstname;
        $this->lastname = $lastname;
        $this->email = $email;
        $this->role = $role;
    }

    public static function fromArray(array $payload): self
    {
        return new self(
            (string) ($payload['username'] ?? ''),
            (string) ($payload['firstname'] ?? ''),
            (string) ($payload['lastname'] ?? ''),
            (string) ($payload['email'] ?? ''),
            (string) ($payload['role'] ?? '')
        );
    }
}
