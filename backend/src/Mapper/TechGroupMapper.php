<?php

namespace App\Mapper;

use App\Dto\TechGroupResponse;
use App\Entity\TechGroup;

class TechGroupMapper
{
    public function toDto(TechGroup $group): TechGroupResponse
    {
        $dto = new TechGroupResponse();
        $dto->id = $group->getId();
        $dto->name = $group->getName();
        $dto->description = $group->getDescription();
        $dto->creatorId = $group->getCreator()?->getId();
        $dto->createdAt = $group->getCreatedAt()?->format('c');

        return $dto;
    }
}
