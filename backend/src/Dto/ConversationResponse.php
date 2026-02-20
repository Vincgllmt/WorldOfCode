<?php

namespace App\Dto;

use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;

#[OA\Schema(
    title: "ConversationResponse",
    description: "Represente une conversation de messagerie"
)]
class ConversationResponse
{
    #[OA\Property(
        description: "Identifiant unique de la conversation (UUID)",
        type: "string",
        example: "550e8400-e29b-41d4-a716-446655440000"
    )]
    public string $id;

    #[OA\Property(
        description: "Type de conversation (direct, group)",
        type: "string",
        example: "direct"
    )]
    public string $type;

    #[OA\Property(
        description: "Titre de la conversation (pour les groupes)",
        type: "string",
        example: "Groupe Symfony",
        nullable: true
    )]
    public ?string $title = null;

    #[OA\Property(
        description: "Date de creation de la conversation",
        type: "string",
        example: "2025-09-02 09:30:00"
    )]
    public string $createdAt;

    #[OA\Property(
        description: "Liste des participants a la conversation",
        type: "array",
        items: new OA\Items(
            type: "object",
            properties: [
                new OA\Property(property: "id", description: "ID du participant", type: "integer", example: 12),
                new OA\Property(property: "username", description: "Nom d'utilisateur du participant", type: "string", example: "eugenie"),
            ]
        )
    )]
    public array $participants;

    #[OA\Property(
        description: "Dernier message de la conversation",
        nullable: true
    )]
    public ?LastMessageResponse $lastMessage = null;
}
