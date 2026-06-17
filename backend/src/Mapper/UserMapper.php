<?php

namespace App\Mapper;

use App\Dto\ProfileHighlightResponse;
use App\Entity\Experience;
use App\Entity\ProfileHighlight;
use App\Entity\User;
use App\Dto\UserResponse;
use App\Enum\Visibility;
use App\Repository\ProfileHighlightRepository;

class UserMapper
{
    public function __construct(
        private SkillMapper $skillMapper,
        private UserLinkMapper $linkMapper,
        private ExperienceMapper $experienceMapper,
        private ProfileHighlightRepository $highlightRepo
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

        $dto->fieldVisibility = $isAuthenticated ? $fv : null;
        $dto->cvPublicToken = $isOwner ? $user->getCvPublicToken() : null;

        $experiences = $user->getExperienceEntities()->toArray();
        usort($experiences, fn($a, $b) => $a->getPosition() <=> $b->getPosition());
        $filtered = $this->filterExperiences($experiences, $isOwner, $isAuthenticated);
        $dto->experiences = array_map([$this->experienceMapper, 'toDto'], $filtered);

        $highlights = $this->highlightRepo->findByUserOrderedByPosition($user);
        $filteredHighlights = $this->filterHighlights($highlights, $isOwner, $isAuthenticated);
        $dto->highlights = array_map([$this, 'highlightToDto'], $filteredHighlights);

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

    /** @param Experience[] $experiences */
    private function filterExperiences(array $experiences, bool $isOwner, bool $isAuthenticated): array
    {
        return array_values(array_filter($experiences, function (Experience $exp) use ($isOwner, $isAuthenticated) {
            return match ($exp->getVisibility()) {
                Visibility::PUBLIC    => true,
                Visibility::CONNECTED => $isAuthenticated,
                Visibility::PRIVATE   => $isOwner,
            };
        }));
    }

    /** @param ProfileHighlight[] $highlights */
    private function filterHighlights(array $highlights, bool $isOwner, bool $isAuthenticated): array
    {
        return array_values(array_filter($highlights, function (ProfileHighlight $h) use ($isOwner, $isAuthenticated) {
            return match ($h->getVisibility()) {
                Visibility::PUBLIC    => true,
                Visibility::CONNECTED => $isAuthenticated,
                Visibility::PRIVATE   => $isOwner,
            };
        }));
    }

    private function highlightToDto(ProfileHighlight $highlight): ProfileHighlightResponse
    {
        $post = $highlight->getPost();
        $content = $post->getContent() ?? '';

        $dto = new ProfileHighlightResponse();
        $dto->id          = $highlight->getId();
        $dto->position    = $highlight->getPosition();
        $dto->visibility  = $highlight->getVisibility()->value;
        $dto->postId      = $post->getId();
        $dto->postContent = mb_strlen($content) > 280 ? mb_substr($content, 0, 280) . '…' : $content;
        $dto->postAuthor  = $post->getAuthor()->getUsername();
        return $dto;
    }
}
