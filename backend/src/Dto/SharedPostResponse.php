<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "SharedPostResponse",
    description: "Résumé d'un post partagé"
)]
class SharedPostResponse
{
    public int $id;
    public string $content;
    public int $authorId;
}
