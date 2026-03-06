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
        $dto->publishedAt = $item->getPublishedAt()?->format('Y-m-d H:i:s');
        $dto->fetchedAt = $item->getFetchedAt()->format('Y-m-d H:i:s');
        $dto->sourceName = $item->getSource()->getName();
        return $dto;
    }
}
