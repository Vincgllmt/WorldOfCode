<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "LastMessageResponse",
    description: "Represente le dernier message d'une conversation"
)]
class LastMessageResponse
{
    #[OA\Property(
        description: "Identifiant du message",
        type: "string",
        example: "123"
    )]
    public string $id;

    #[OA\Property(
        description: "Contenu du message",
        type: "string",
        example: "coucou"
    )]
    public string $body;

    #[OA\Property(
        description: "Type du message",
        type: "string",
        example: "text"
    )]
    public string $type = 'text';

    #[OA\Property(
        description: "Date de creation du message",
        type: "string",
        example: "2025-09-27 14:53:00"
    )]
    public string $createdAt;

    #[OA\Property(
        description: "Auteur du message",
        type: "object",
        properties: [
            new OA\Property(property: "id", description: "ID de l'auteur", type: "integer", example: 92),
            new OA\Property(property: "username", description: "Nom d'utilisateur de l'auteur", type: "string", example: "joseph.victor")
        ]
    )]
    public array $sender;

    #[OA\Property(
        description: "Indique si le message a ete lu par l'utilisateur courant",
        type: "boolean",
        example: false
    )]
    public bool $read;
}
