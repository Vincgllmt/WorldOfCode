<?php

namespace App\Mapper;

use App\Entity\Like;
use App\Dto\LikeResponse;

class LikeMapper
{
    public function toDto(Like $like): LikeResponse
    {
        $dto = new LikeResponse();
        $dto->userId = $like->getUser()->getId();
        $dto->username = $like->getUser()->getUsername();
        return $dto;
    }
}
