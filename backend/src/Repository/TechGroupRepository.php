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
        $term = mb_strtolower(trim($q)) . '%';

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
    ####
    ##
    ####
    /**
     * @return array<int, array{id:int, name:string, description:?string, createdAt:\DateTimeInterface, creatorUsername:?string, memberCount:int, postCount:int}>
     */
    public function findAllWithCounts(): array
    {
        return $this->createQueryBuilder('g')
            ->select(
                'g.id',
                'g.name',
                'g.description',
                'g.createdAt',
                'creator.username AS creatorUsername',
                'COUNT(DISTINCT m.id) AS memberCount',
                'COUNT(DISTINCT p.id) AS postCount'
            )
            ->leftJoin('g.creator', 'creator')
            ->leftJoin('g.users', 'm')
            ->leftJoin('g.posts', 'p')
            ->groupBy('g.id')
            ->orderBy('g.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
    ####
    ##
    ####
    /**
     * @return \App\Dto\AdminTopGroupDto[]
     */
    public function findTopByActivity(int $limit = 5): array
    {
        $since = new \DateTime('-30 days');

        $results = $this->createQueryBuilder('g')
            ->select(
                'g.id',
                'g.name',
                'COUNT(DISTINCT u.id) AS memberCount',
                'COUNT(DISTINCT p.id) AS postCountThisMonth'
            )
            ->leftJoin('g.users', 'u')
            ->leftJoin('g.posts', 'p', 'WITH', 'p.createdAt >= :since')
            ->setParameter('since', $since)
            ->groupBy('g.id')
            ->orderBy('postCountThisMonth', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return array_map(fn($r) => new \App\Dto\AdminTopGroupDto(
            id: $r['id'],
            name: $r['name'],
            memberCount: (int) $r['memberCount'],
            postCountThisMonth: (int) $r['postCountThisMonth'],
        ), $results);
    }
}
