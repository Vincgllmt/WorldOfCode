<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(title: 'TechWatchSourceResponse')]
class TechWatchSourceResponse
{
    public int $id;
    public int $techGroupId;
    public string $feedUrl;
    public string $name;
    public bool $isAutoDetected;
    public ?string $lastFetchedAt = null;
    public ?string $createdAt = null;
}
