<?php

namespace App\Service\Mentoring;

use App\Entity\MentoringRating;
use App\Entity\MentoringSession;
use App\Entity\Notification;
use App\Enum\MentoringSessionStatus;
use App\Enum\NotificationType;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringRatingRepository;
use Doctrine\ORM\EntityManagerInterface;

class MentoringSessionService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MentorProfileRepository $mentorProfileRepo,
        private MentoringRatingRepository $ratingRepo,
    ) {}

    public function complete(MentoringSession $session): void
    {
        $session->setStatus(MentoringSessionStatus::COMPLETED);
        $session->setCompletedAt(new \DateTime());

        // Créer les 2 MentoringRating placeholder (score = null, à remplir lors de la notation)
        $mentorRating = new MentoringRating();
        $mentorRating->setSession($session);
        $mentorRating->setRater($session->getMentor()->getUser());
        $mentorRating->setRatee($session->getJunior());
        $mentorRating->setScore(null);

        $juniorRating = new MentoringRating();
        $juniorRating->setSession($session);
        $juniorRating->setRater($session->getJunior());
        $juniorRating->setRatee($session->getMentor()->getUser());
        $juniorRating->setScore(null);

        $this->em->persist($mentorRating);
        $this->em->persist($juniorRating);
        $this->em->flush(); // flush pour obtenir l'ID de session avant les notifications

        // Notifications de rappel notation
        $mentorUser  = $session->getMentor()->getUser();
        $juniorUser  = $session->getJunior();
        $sessionId   = $session->getId(); // sûr après flush

        $notifMentor = new Notification();
        $notifMentor->setRecipient($mentorUser)
            ->setSender($juniorUser)
            ->setType(NotificationType::MENTORING_RATING_REMINDER)
            ->setRelatedEntityId($sessionId)
            ->setMessage('Pensez à noter votre session avec ' . $juniorUser->getUsername());

        $notifJunior = new Notification();
        $notifJunior->setRecipient($juniorUser)
            ->setSender($mentorUser)
            ->setType(NotificationType::MENTORING_RATING_REMINDER)
            ->setRelatedEntityId($sessionId)
            ->setMessage('Pensez à noter votre session avec ' . $mentorUser->getUsername());

        $this->em->persist($notifMentor);
        $this->em->persist($notifJunior);

        // Recalculer stats du profil mentor
        $profile = $session->getMentor();
        $profile->setTotalSessions($profile->getTotalSessions() + 1);

        // Note moyenne depuis ratings visibles et soumis
        $avg = $this->em->createQuery(
            'SELECT AVG(r.score) FROM App\Entity\MentoringRating r
             WHERE r.ratee = :user AND r.isVisible = true AND r.score IS NOT NULL'
        )->setParameter('user', $profile->getUser())->getSingleScalarResult();

        if ($avg !== null) {
            $profile->setAverageRating(round((float) $avg, 1));
        }

        // Taux de fiabilité sur les 3 derniers mois
        $threeMonthsAgo = (new \DateTime())->modify('-3 months');

        $completed = (int) $this->em->createQuery(
            'SELECT COUNT(s.id) FROM App\Entity\MentoringSession s
             WHERE s.mentor = :p AND s.status = :c AND s.createdAt >= :from'
        )->setParameters([
            'p' => $profile,
            'c' => MentoringSessionStatus::COMPLETED,
            'from' => $threeMonthsAgo,
        ])->getSingleScalarResult();

        $cancelled = (int) $this->em->createQuery(
            'SELECT COUNT(s.id) FROM App\Entity\MentoringSession s
             WHERE s.mentor = :p AND s.status = :c AND s.createdAt >= :from'
        )->setParameters([
            'p' => $profile,
            'c' => MentoringSessionStatus::CANCELLED,
            'from' => $threeMonthsAgo,
        ])->getSingleScalarResult();

        $total = $completed + $cancelled;
        if ($total > 0) {
            $profile->setReliabilityRate(round($completed / $total, 2));
        }

        $this->em->flush();
    }
}
