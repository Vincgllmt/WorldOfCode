<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(title: 'TechWatchItemResponse')]
class TechWatchItemResponse
{
    public int $id;
    public string $title;
    public ?string $description = null;
    public string $url;
    public ?string $imageUrl = null;
    public ?string $publishedAt = null;
    public string $fetchedAt;
    public string $sourceName;
}
