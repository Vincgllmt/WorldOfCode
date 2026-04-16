<?php

namespace App\Repository;

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

    public function findPublicFeed(array $filters = [], int $page = 1, int $limit = 20): array
    {
        $em  = $this->getEntityManager();
        $now = new \DateTime();

        // Lazy expiry : désactiver les pins expirés et notifier les mentors (eager load pour éviter N+1)
        $expiredPins = $em->createQuery(
            'SELECT p, m, mu, r FROM App\Entity\MentoringPin p
             JOIN p.mentor m JOIN m.user mu JOIN p.request r
             WHERE p.expiresAt < :now AND p.isActive = true'
        )->setParameter('now', $now)->getResult();

        foreach ($expiredPins as $pin) {
            $pin->setIsActive(false);
            $notif = new Notification();
            $notif->setRecipient($pin->getMentor()->getUser())
                ->setSender($pin->getRequest()->getJunior())
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
            ->andWhere('r.status = :status')
            ->setParameter('status', MentoringRequestStatus::PENDING);

        if (!empty($filters['techStack'])) {
            $qb->andWhere('r.techStack = :techStack')
               ->setParameter('techStack', $filters['techStack']);
        }

        return $qb
            ->orderBy('r.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}
