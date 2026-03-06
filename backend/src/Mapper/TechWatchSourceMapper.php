<?php

namespace App\Mapper;

use App\Dto\TechWatchSourceResponse;
use App\Entity\TechWatchSource;

class TechWatchSourceMapper
{
    public function toDto(TechWatchSource $source): TechWatchSourceResponse
    {
        $dto = new TechWatchSourceResponse();
        $dto->id = $source->getId();
        $dto->techGroupId = $source->getTechGroup()->getId();
        $dto->feedUrl = $source->getFeedUrl();
        $dto->name = $source->getName();
        $dto->isAutoDetected = $source->isAutoDetected();
        $dto->lastFetchedAt = $source->getLastFetchedAt()?->format('Y-m-d H:i:s');
        $dto->createdAt = $source->getCreatedAt()->format('Y-m-d H:i:s');
        return $dto;
    }
}
