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

    public function toDto(User $user, ?User $viewer = null): UserResponse
    {
        $isOwner = $viewer !== null && $viewer->getId() === $user->getId();
        $isAuthenticated = $viewer !== null;

        $fv = $user->getEffectiveFieldVisibility();

        $dto = new UserResponse();
        $dto->id = $user->getId();
        $dto->username = $user->getUsername();
        $dto->firstname = $user->getFirstname();
        $dto->lastname = $user->getLastname();
        $dto->role = $user->getRole()->value;
        $dto->creationDate = $user->getCreationDate()?->format('c');
        $dto->updatedDate = $user->getUpdatedDate()?->format('c');
        $dto->theme = $user->getTheme();
        $dto->avatarUrl = $user->getAvatarUrl();

        $dto->email = $isOwner ? $user->getEmail() : null;
        $dto->bio = $this->applyVisibility($user->getBio(), $fv['bio'], $isOwner, $isAuthenticated);
        $dto->location = $this->applyVisibility($user->getLocation(), $fv['location'], $isOwner, $isAuthenticated);
        $dto->availability = $this->applyVisibility($user->getAvailability()?->value, $fv['availability'], $isOwner, $isAuthenticated);

        $dto->fieldVisibility = $fv;

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

    private function applyVisibility(mixed $value, string $visibility, bool $isOwner, bool $isAuthenticated): mixed
    {
        return match ($visibility) {
            'PUBLIC'    => $value,
            'CONNECTED' => $isAuthenticated ? $value : null,
            'PRIVATE'   => $isOwner ? $value : null,
            default     => null,
        };
    }
}
