<?php

namespace App\Repository;

use App\Entity\TechWatchSource;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class TechWatchSourceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TechWatchSource::class);
    }

    public function save(TechWatchSource $source, bool $flush = true): void
    {
        $this->getEntityManager()->persist($source);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(TechWatchSource $source, bool $flush = false): void
    {
        $this->getEntityManager()->remove($source);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /** @return TechWatchSource[] */
    public function findByTechGroup(int $techGroupId): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.techGroup = :groupId')
            ->setParameter('groupId', $techGroupId)
            ->getQuery()
            ->getResult();
    }
}
