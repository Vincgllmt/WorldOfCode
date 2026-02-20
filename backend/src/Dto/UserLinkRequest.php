<?php

namespace App\Dto;

use App\Enum\LinkType;
use OpenApi\Attributes as OA;
use Symfony\Component\Validator\Constraints as Assert;

#[OA\Schema(
    title: 'UserLinkRequest',
    description: 'Payload pour creer ou modifier un lien externe utilisateur'
)]
class UserLinkRequest
{
    #[Assert\NotBlank]
    #[Assert\Choice(callback: [LinkType::class, 'values'])]
    #[OA\Property(
        description: "Type de lien (github, gitlab, linkedin, portfolio, other)",
        type: 'string',
        example: 'github'
    )]
    public readonly string $type;

    #[Assert\NotBlank]
    #[Assert\Url]
    #[Assert\Length(max: 500)]
    #[OA\Property(
        description: "URL du lien externe",
        type: 'string',
        example: 'https://github.com/alice'
    )]
    public readonly string $url;

    public function __construct(string $type, string $url)
    {
        $this->type = $type;
        $this->url = $url;
    }

    public static function fromArray(array $payload): self
    {
        return new self(
            (string) ($payload['type'] ?? ''),
            (string) ($payload['url'] ?? '')
        );
    }
}
