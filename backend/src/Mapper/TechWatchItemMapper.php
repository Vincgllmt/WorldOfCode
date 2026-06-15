<?php

namespace App\Mapper;

use App\Dto\TechWatchItemResponse;
use App\Entity\TechWatchItem;

class TechWatchItemMapper
{
    public function toDto(TechWatchItem $item): TechWatchItemResponse
    {
        $dto = new TechWatchItemResponse();
        $dto->id = $item->getId();
        $dto->title = $item->getTitle();
        $dto->description = $item->getDescription();
        $dto->url = $item->getUrl();
        $dto->imageUrl = $item->getImageUrl();
        $dto->publishedAt = $item->getPublishedAt()?->format('c');
        $dto->fetchedAt = $item->getFetchedAt()->format('c');
        $dto->sourceName = $item->getSource()->getName();
        return $dto;
    }
}
