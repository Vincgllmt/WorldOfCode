<?php

namespace App\Repository;

use App\Entity\TechGroup;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TechGroup>
 */
class TechGroupRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TechGroup::class);
    }
    ####
    ##
    ####
    public function save(TechGroup $techGroup, bool $flush = true): void
    {
        $this->getEntityManager()->persist($techGroup);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
    ####
    ##
    ####
    public function findByNameInsensitive(string $name): ?TechGroup
    {
        return $this->createQueryBuilder('g')
            ->where('LOWER(g.name) = LOWER(:name)')
            ->setParameter('name', $name)
            ->getQuery()
            ->getOneOrNullResult();
    }
    ####
    ##
    ####
    /** @return TechGroup[] */
    public function searchByQuery(string $q, int $limit = 5): array
    {
        $term = '%' . mb_strtolower(trim($q)) . '%';

        return $this->createQueryBuilder('g')
            ->where('LOWER(g.name) LIKE :q')
            ->setParameter('q', $term)
            ->orderBy('g.name', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
    ####
    ##
    ####
    public function remove(TechGroup $techGroup, bool $flush = false): void
    {
        $this->getEntityManager()->remove($techGroup);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
