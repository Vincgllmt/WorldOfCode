<?php

namespace App\Repository;

use App\Entity\UserLink;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class UserLinkRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserLink::class);
    }

    public function save(UserLink $link, bool $flush = true): void
    {
        $this->getEntityManager()->persist($link);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(UserLink $link, bool $flush = true): void
    {
        $this->getEntityManager()->remove($link);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * @return UserLink[]
     */
    public function findByUserId(int $userId): array
    {
        return $this->createQueryBuilder('l')
            ->where('l.user = :userId')
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getResult();
    }
}
