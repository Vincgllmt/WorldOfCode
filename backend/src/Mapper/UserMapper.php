<?php

namespace App\Mapper;

use App\Entity\User;
use App\Dto\UserResponse;

class UserMapper
{
    public function toDto(User $user): UserResponse
    {
        $dto = new UserResponse();
        $dto->id = $user->getId();
        $dto->username = $user->getUsername();
        $dto->firstname = $user->getFirstname();
        $dto->lastname = $user->getLastname();
        $dto->email = $user->getEmail();
        $dto->role = $user->getRole()->value;
        $dto->creationDate = $user->getCreationDate()?->format('Y-m-d H:i:s');
        $dto->updatedDate = $user->getUpdatedDate()?->format('Y-m-d H:i:s');
        return $dto;
    }
}
