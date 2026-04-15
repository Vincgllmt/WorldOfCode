<?php

namespace App\Repository;

use App\Entity\MentorProfile;
use App\Entity\MentoringRequest;
use App\Entity\Notification;
use App\Enum\MentoringRequestStatus;
use App\Enum\NotificationType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class MentoringRequestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MentoringRequest::class);
    }

    public function save(MentoringRequest $entity, bool $flush = true): void
    {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(MentoringRequest $entity, bool $flush = true): void
    {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findPublicFeed(
        MentorProfile $mentor,
        int $page = 1,
        int $limit = 20,
        ?string $techStack = null
    ): array {
        $em  = $this->getEntityManager();
        $now = new \DateTime();

        // Lazy expiry : trouver les pins expirés, les désactiver et notifier les mentors
        $expiredPins = $em->createQuery(
            'SELECT p FROM App\Entity\MentoringPin p WHERE p.expiresAt < :now AND p.isActive = true'
        )->setParameter('now', $now)->getResult();

        foreach ($expiredPins as $pin) {
            $pin->setIsActive(false);
            $mentorUser = $pin->getMentor()->getUser();
            $notif = new Notification();
            $notif->setRecipient($mentorUser)
                ->setSender($mentorUser)
                ->setType(NotificationType::MENTORING_PIN_EXPIRED)
                ->setRelatedEntityId($pin->getId())
                ->setMessage('Votre réservation sur "' . $pin->getRequest()->getTitle() . '" a expiré.');
            $em->persist($notif);
        }

        if (!empty($expiredPins)) {
            $em->flush();
        }

        $qb = $this->createQueryBuilder('r')
            ->where('r.isPublic = true')
            ->andWhere('r.status IN (:statuses)')
            ->setParameter('statuses', [MentoringRequestStatus::PENDING, MentoringRequestStatus::PINNED]);

        if ($techStack !== null) {
            $qb->andWhere('r.techStack = :techStack')
               ->setParameter('techStack', $techStack);
        }

        $total = (int) (clone $qb)
            ->select('COUNT(r.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $requests = $qb
            ->orderBy('r.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return ['data' => $requests, 'total' => $total];
    }
}
