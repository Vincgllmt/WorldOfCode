<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "LastMessageResponse",
    description: "Represents the last message in a conversation"
)]
class LastMessageResponse
{
    #[OA\Property(example: "123")] // string même si c'est un nombre
    public string $id;

    #[OA\Property(example: "coucou")]
    public string $body;

    #[OA\Property(example: "2025-09-27 14:53:00")]
    public string $createdAt;

    #[OA\Property(
        type: "object",
        properties: [
            new OA\Property(property: "id", type: "integer", example: 92),
            new OA\Property(property: "username", type: "string", example: "joseph.victor")
        ]
    )]
    public array $sender;


    #[OA\Property(example: false)]
    public bool $read;
}
