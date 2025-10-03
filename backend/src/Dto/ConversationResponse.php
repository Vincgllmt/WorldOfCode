<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "ConversationResponse",
    description: "Represents a messaging conversation"
)]
class ConversationResponse
{
    #[OA\Property(example: "550e8400-e29b-41d4-a716-446655440000")]
    public string $id;

    #[OA\Property(example: "direct")]
    public string $type;

    #[OA\Property(example: "Groupe Symfony", nullable: true)]
    public ?string $title = null;

    #[OA\Property(example: "2025-09-02 09:30:00")]
    public string $createdAt;

    #[OA\Property(
        type: "array",
        description: "Liste des participants à la conversation",
        items: new OA\Items(
            type: "object",
            properties: [
                new OA\Property(property: "id", type: "integer", example: 12),
                new OA\Property(property: "username", type: "string", example: "eugenie"),
            ]
        )
    )]
    public array $participants;

    #[OA\Property(
        description: "Dernier message de la conversation",
        ref: new OA\Schema(type: LastMessageResponse::class),
        nullable: true
    )]
    public ?LastMessageResponse $lastMessage = null;
}
