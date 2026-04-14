<?php

namespace App\Repository;

use App\Entity\MentoringRequest;
use App\Entity\MentoringPin;
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

    public function findPublicFeed(array $filters = [], int $page = 1, int $limit = 20): array
    {
        // Expire les pins périmés (lazy expiry)
        $this->getEntityManager()->createQueryBuilder()
            ->update(MentoringPin::class, 'p')
            ->set('p.isActive', 'false')
            ->where('p.expiresAt < :now')
            ->andWhere('p.isActive = true')
            ->setParameter('now', new \DateTime())
            ->getQuery()->execute();

        $qb = $this->createQueryBuilder('r')
            ->where('r.isPublic = true')
            ->andWhere('r.status = :status')
            ->setParameter('status', MentoringRequestStatus::PENDING)
            ->orderBy('r.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        if (!empty($filters['techStack'])) {
            $qb->andWhere('r.techStack = :techStack')
               ->setParameter('techStack', $filters['techStack']);
        }

        return $qb->getQuery()->getResult();
    }
}
