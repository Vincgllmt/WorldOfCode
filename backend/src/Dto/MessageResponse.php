<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "MessageResponse",
    description: "Représente un message dans une conversation"
)]
class MessageResponse
{
    #[OA\Property(
        description: "Identifiant unique du message (UUID)",
        type: "string",
        example: "a3f5b6c8-9f12-4c3a-8f22-5e1a3cde8a9b"
    )]
    public string $id;

    #[OA\Property(
        description: "Contenu du message",
        type: "string",
        example: "Salut, ça va ?"
    )]
    public string $body;

    #[OA\Property(
        description: "Type de message",
        type: "string",
        example: "text"
    )]
    public string $type;

    #[OA\Property(
        description: "Date de création",
        type: "string",
        example: "2025-09-11 14:30:00"
    )]
    public string $createdAt;

    #[OA\Property(
        description: "Date d’édition (si modifié)",
        type: "string",
        nullable: true,
        example: "2025-09-11 15:00:00"
    )]
    public ?string $editedAt = null;

    #[OA\Property(
        description: "Date de suppression (si supprimé)",
        type: "string",
        nullable: true
    )]
    public ?string $deletedAt = null;

    #[OA\Property(
        description: "Auteur du message",
        type: "object",
        properties: [
            new OA\Property(property: "id", type: "string", example: "32"),
            new OA\Property(property: "username", type: "string", example: "user1234"),
        ]
    )]
    public array $sender = [];

    #[OA\Property(
        description: "ID de la conversation",
        type: "string",
        example: "06226d8f-999c-49f4-86ba-ce980ffc13c0"
    )]
    public string $conversationId;

    #[OA\Property(
        description: "Indique si le message a été lu par l’utilisateur courant",
        type: "boolean",
        example: false
    )]
    public bool $read = false;
}
