<?php

namespace App\Repository;

use App\Entity\ProfileHighlight;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ProfileHighlightRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProfileHighlight::class);
    }

    public function save(ProfileHighlight $highlight, bool $flush = true): void
    {
        $this->getEntityManager()->persist($highlight);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(ProfileHighlight $highlight, bool $flush = true): void
    {
        $this->getEntityManager()->remove($highlight);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /** @return ProfileHighlight[] */
    public function findByUserOrderedByPosition(User $user): array
    {
        return $this->createQueryBuilder('ph')
            ->where('ph.user = :user')
            ->setParameter('user', $user)
            ->orderBy('ph.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function countByUser(User $user): int
    {
        return (int) $this->createQueryBuilder('ph')
            ->select('COUNT(ph.id)')
            ->where('ph.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
