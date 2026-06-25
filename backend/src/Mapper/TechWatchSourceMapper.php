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
        $dto->techGroupName = $source->getTechGroup()->getName();
        $dto->feedUrl = $source->getFeedUrl();
        $dto->name = $source->getName();
        $dto->lastFetchedAt = $source->getLastFetchedAt()?->format('c');
        $dto->createdAt = $source->getCreatedAt()->format('c');
        return $dto;
    }
}
