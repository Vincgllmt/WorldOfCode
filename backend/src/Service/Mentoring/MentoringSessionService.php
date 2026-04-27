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

        // Message système dans la conversation pour inviter à noter
        if ($conversationId = $session->getConversationId()) {
            $conn = $this->em->getConnection();
            $now  = (new \DateTime())->format('Y-m-d H:i:s');
            $body = json_encode([
                'sessionId'      => $session->getId(),
                'mentorId'       => $session->getMentor()->getUser()->getId(),
                'mentorUsername' => $session->getMentor()->getUser()->getUsername(),
                'juniorId'       => $session->getJunior()->getId(),
                'juniorUsername' => $session->getJunior()->getUsername(),
            ]);
            $conn->executeStatement(
                'INSERT INTO msg_messages (id, conversation_id, sender_id, body, type, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$this->generateUuid(), $conversationId, $session->getMentor()->getUser()->getId(), $body, 'session_closed', $now]
            );
            $conn->executeStatement(
                'UPDATE msg_conversations SET last_message_at = ? WHERE id = ?',
                [$now, $conversationId]
            );
        }
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
