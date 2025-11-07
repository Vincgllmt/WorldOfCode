<?php

namespace App\Dto;

use App\Enum\UserRole;
use OpenApi\Attributes as OA;
use Symfony\Component\Validator\Constraints as Assert;

#[OA\Schema(
    title: 'UserUpdateRequest',
    description: 'Payload de mise à jour complète d’un utilisateur'
)]
class UserUpdateRequest
{
    #[Assert\NotBlank]
    #[Assert\Length(min: 3, max: 255)]
    #[OA\Property(example: 'alice')]
    public readonly string $username;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 100)]
    #[OA\Property(example: 'Alice')]
    public readonly string $firstname;

    #[Assert\NotBlank]
    #[Assert\Length(min: 2, max: 100)]
    #[OA\Property(example: 'Dupont')]
    public readonly string $lastname;

    #[Assert\NotBlank]
    #[Assert\Email]
    #[OA\Property(example: 'alice@example.com')]
    public readonly string $email;

    #[Assert\NotBlank]
    #[Assert\Choice(callback: [UserRole::class, 'values'])]
    #[OA\Property(example: 'ROLE_USER')]
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
