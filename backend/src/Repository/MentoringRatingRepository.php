<?php

namespace App\Repository;

use App\Entity\MentoringRating;
use App\Entity\MentoringSession;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class MentoringRatingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MentoringRating::class);
    }

    public function save(MentoringRating $entity, bool $flush = true): void
    {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(MentoringRating $entity, bool $flush = true): void
    {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findBySession(int $sessionId): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.session = :session')
            ->setParameter('session', $this->getEntityManager()->getReference(MentoringSession::class, $sessionId))
            ->getQuery()
            ->getResult();
    }
}
