<?php

namespace App\Security\Voter;

use App\Entity\User;
use App\Repository\MentorProfileRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class MentorProfileVoter extends Voter
{
    public const IS_MENTOR = 'IS_MENTOR';

    public function __construct(
        private readonly MentorProfileRepository $mentorProfileRepository
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::IS_MENTOR;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return $this->mentorProfileRepository->findOneBy(['user' => $user]) !== null;
    }
}
