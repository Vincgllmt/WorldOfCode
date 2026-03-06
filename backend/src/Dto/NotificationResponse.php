<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "NotificationResponse",
    description: "Représente une notification dans les réponses API"
)]
class NotificationResponse
{
    #[OA\Property(type: "integer", example: 1)]
    public int $id;

    #[OA\Property(type: "string", example: "comment")]
    public string $type;

    #[OA\Property(type: "string", example: "john a commenté votre post")]
    public string $message;

    #[OA\Property(type: "integer", example: 42, nullable: true)]
    public ?int $relatedEntityId;

    #[OA\Property(type: "boolean", example: false)]
    public bool $isRead;

    #[OA\Property(type: "string", example: "2026-03-05 14:30:00")]
    public string $createdAt;

    #[OA\Property(type: "integer", example: 5)]
    public int $senderId;

    #[OA\Property(type: "string", example: "john")]
    public string $senderUsername;
}
