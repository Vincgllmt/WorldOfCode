<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: 'Utilisateur dans la liste admin')]
class AdminUserListItemDto
{
    public function __construct(
        #[OA\Property(example: 1)]
        public readonly int $id,

        #[OA\Property(example: 'sarah.dev')]
        public readonly string $username,

        #[OA\Property(example: 'sarah@example.com')]
        public readonly string $email,

        #[OA\Property(example: 'ROLE_USER')]
        public readonly string $role,

        #[OA\Property(description: "Date d'inscription ISO 8601", example: '2026-01-15T10:30:00+00:00')]
        public readonly string $creationDate,

        #[OA\Property(description: 'Nombre de posts publiés', example: 42)]
        public readonly int $postCount,

        #[OA\Property(description: 'Nombre de followers', example: 17)]
        public readonly int $followerCount,

        #[OA\Property(description: 'URL avatar', nullable: true, example: 'http://localhost:9000/bucket/avatar.jpg')]
        public readonly ?string $avatarUrl,

        #[OA\Property(description: 'Nombre de reports sur les posts de cet utilisateur', example: 3)]
        public readonly int $reportCount,

        #[OA\Property(description: 'Compte banni', example: false)]
        public readonly bool $isBanned,
    ) {}
}
