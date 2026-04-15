<?php

namespace App\Service\Mentoring;

use App\Entity\MentoringSession;
use App\Entity\User;
use App\Repository\MentoringRatingRepository;
use Doctrine\ORM\EntityManagerInterface;

class MentoringRatingService
{
    public function __construct(
        private MentoringRatingRepository $ratingRepo,
        private EntityManagerInterface $em,
    ) {}

    public function submit(MentoringSession $session, User $rater, int $score, ?string $comment): void
    {
        // Vérifier que la session est terminée et dans la deadline de 48h
        $completedAt = $session->getCompletedAt();
        if ($completedAt === null) {
            throw new \LogicException('SESSION_NOT_COMPLETED');
        }
        $deadline = (clone $completedAt)->modify('+48 hours');
        if (new \DateTime() > $deadline) {
            throw new \LogicException('DEADLINE_EXPIRED');
        }

        // Trouver le rating de cet utilisateur pour cette session
        $rating = $this->ratingRepo->findOneBy(['session' => $session, 'rater' => $rater]);
        if (!$rating) {
            throw new \LogicException('RATING_NOT_FOUND');
        }

        if ($rating->getSubmittedAt() !== null) {
            throw new \LogicException('ALREADY_SUBMITTED');
        }

        $rating->setScore($score);
        $rating->setComment($comment);
        $rating->setSubmittedAt(new \DateTime());

        $this->em->flush();

        $this->checkBothSubmitted($session);
    }

    private function checkBothSubmitted(MentoringSession $session): void
    {
        $ratings = $this->ratingRepo->findBy(['session' => $session]);
        $allSubmitted = count($ratings) === 2 &&
            array_reduce($ratings, fn(bool $carry, $r) => $carry && $r->getSubmittedAt() !== null, true);

        if ($allSubmitted) {
            foreach ($ratings as $rating) {
                $rating->setIsVisible(true);
            }
            $this->em->flush();
        }
    }
}
