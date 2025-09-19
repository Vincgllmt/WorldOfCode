<?php

namespace App\Repository;

use App\Entity\Like;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class LikeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Like::class);
    }

    public function save(Like $like, bool $flush = true): void
    {
        $this->getEntityManager()->persist($like);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Like $like, bool $flush = true): void
    {
        $this->getEntityManager()->remove($like);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
