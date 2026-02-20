<?php

namespace App\Mapper;

use App\Entity\User;
use App\Dto\UserResponse;

class UserMapper
{
    public function __construct(
        private SkillMapper $skillMapper,
        private UserLinkMapper $linkMapper
    ) {}

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
        $dto->theme = $user->getTheme();
        $dto->bio = $user->getBio();
        $dto->location = $user->getLocation();
        $dto->availability = $user->getAvailability()?->value;
        $dto->experiences = $user->getExperiences();
        $dto->skills = array_map(
            [$this->skillMapper, 'toDto'],
            $user->getSkills()->toArray()
        );
        $dto->links = array_map(
            [$this->linkMapper, 'toDto'],
            $user->getLinks()->toArray()
        );
        return $dto;
    }
}
