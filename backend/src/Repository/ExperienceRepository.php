<?php

namespace App\Repository;

use App\Entity\Experience;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ExperienceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Experience::class);
    }

    public function save(Experience $experience, bool $flush = true): void
    {
        $this->getEntityManager()->persist($experience);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Experience $experience, bool $flush = true): void
    {
        $this->getEntityManager()->remove($experience);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /** @return Experience[] */
    public function findByUserOrderedByPosition(User $user): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.user = :user')
            ->setParameter('user', $user)
            ->orderBy('e.position', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
