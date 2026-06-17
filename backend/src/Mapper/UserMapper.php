<?php

namespace App\Mapper;

use App\Entity\User;
use App\Dto\UserResponse;

class UserMapper
{
    public function __construct(
        private SkillMapper $skillMapper,
        private UserLinkMapper $linkMapper,
        private ExperienceMapper $experienceMapper
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
        $dto->creationDate = $user->getCreationDate()?->format('c');
        $dto->updatedDate = $user->getUpdatedDate()?->format('c');
        $dto->theme = $user->getTheme();
        $dto->avatarUrl = $user->getAvatarUrl();
        $dto->bio = $user->getBio();
        $dto->location = $user->getLocation();
        $dto->availability = $user->getAvailability()?->value;
        $experiences = $user->getExperienceEntities()->toArray();
        usort($experiences, fn($a, $b) => $a->getPosition() <=> $b->getPosition());
        $dto->experiences = array_map([$this->experienceMapper, 'toDto'], $experiences);
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
