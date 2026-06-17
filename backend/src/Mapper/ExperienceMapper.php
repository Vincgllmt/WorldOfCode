<?php

namespace App\Mapper;

use App\Dto\ExperienceResponse;
use App\Entity\Experience;

class ExperienceMapper
{
    public function __construct(private SkillMapper $skillMapper) {}

    public function toDto(Experience $exp): ExperienceResponse
    {
        $dto = new ExperienceResponse();
        $dto->id          = $exp->getId();
        $dto->title       = $exp->getTitle();
        $dto->company     = $exp->getCompany();
        $dto->location    = $exp->getLocation();
        $dto->startDate   = $exp->getStartDate();
        $dto->endDate     = $exp->getEndDate();
        $dto->description = $exp->getDescription();
        $dto->position    = $exp->getPosition();
        $dto->visibility  = $exp->getVisibility()->value;
        $dto->skills      = array_map([$this->skillMapper, 'toDto'], $exp->getSkills()->toArray());
        return $dto;
    }
}
