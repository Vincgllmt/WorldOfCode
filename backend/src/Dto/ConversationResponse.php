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
        items: new OA\Items(
            type: "object",
            properties: [
                "id" => ["type" => "integer"],
                "username" => ["type" => "string"],
            ]
        )
    )]
    public array $participants;

    #[OA\Property(
        ref: "#/components/schemas/LastMessageResponse",
        nullable: true
    )]
    public ?LastMessageResponse $lastMessage = null;
}
