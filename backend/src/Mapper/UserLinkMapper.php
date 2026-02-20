<?php

namespace App\Mapper;

use App\Entity\UserLink;
use App\Dto\UserLinkResponse;

class UserLinkMapper
{
    public function toDto(UserLink $link): UserLinkResponse
    {
        $dto = new UserLinkResponse();
        $dto->id = $link->getId();
        $dto->type = $link->getType()->value;
        $dto->url = $link->getUrl();
        return $dto;
    }
}
