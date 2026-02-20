<?php

namespace App\Mapper;

use App\Entity\Skill;
use App\Dto\SkillResponse;

class SkillMapper
{
    public function toDto(Skill $skill): SkillResponse
    {
        $dto = new SkillResponse();
        $dto->id = $skill->getId();
        $dto->name = $skill->getName();
        $dto->category = $skill->getCategory()->value;
        return $dto;
    }
}
