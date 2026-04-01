<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(description: "Profil complet d'un utilisateur pour le panneau admin")]
class AdminUserDetailDto
{
    public function __construct(
        public readonly int $id,
        public readonly string $username,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly string $email,
        public readonly string $role,
        public readonly string $creationDate,
        public readonly ?string $avatarUrl,
        public readonly ?string $bio,
        public readonly ?string $location,
        public readonly ?string $availability,
        /** @var array<int, array{title:string, company:string, startDate:string, endDate:?string, description:string}>|null */
        public readonly ?array $experiences,
        /** @var SkillResponse[] */
        public readonly array $skills,
        /** @var UserLinkResponse[] */
        public readonly array $links,
        /** @var AdminPostSummaryDto[] */
        public readonly array $lastFivePosts,
        public readonly int $reportCountOnPosts,
    ) {}
}
