<?php

namespace App\Repository;

use App\Entity\MentorProfile;
use App\Entity\MentoringRequest;
use App\Enum\MentoringRequestStatus;
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
        $em = $this->getEntityManager();

        // Lazy expiry : désactiver les pins expirés avant la requête principale
        $em->createQuery(
            'UPDATE App\Entity\MentoringPin p SET p.isActive = false WHERE p.expiresAt < :now AND p.isActive = true'
        )->setParameter('now', new \DateTime())->execute();

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
