<?php

namespace App\Repository;

use App\Entity\TechWatchItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class TechWatchItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TechWatchItem::class);
    }

    public function save(TechWatchItem $item, bool $flush = true): void
    {
        $this->getEntityManager()->persist($item);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * @return array{items: TechWatchItem[], totalItems: int}
     */
    public function findByTechGroupPaginated(int $techGroupId, int $page = 1, int $limit = 20): array
    {
        $qb = $this->createQueryBuilder('i')
            ->join('i.source', 's')
            ->where('s.techGroup = :groupId')
            ->setParameter('groupId', $techGroupId)
            ->orderBy('i.publishedAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        $items = $qb->getQuery()->getResult();

        $total = (int) $this->createQueryBuilder('i2')
            ->select('COUNT(i2.id)')
            ->join('i2.source', 's2')
            ->where('s2.techGroup = :groupId')
            ->setParameter('groupId', $techGroupId)
            ->getQuery()
            ->getSingleScalarResult();

        return ['items' => $items, 'totalItems' => $total];
    }

    /**
     * @param int[] $groupIds
     * @return array{items: TechWatchItem[], totalItems: int}
     */
    public function findByMultipleGroupsPaginated(array $groupIds, int $page = 1, int $limit = 20): array
    {
        if (empty($groupIds)) {
            return ['items' => [], 'totalItems' => 0];
        }

        $qb = $this->createQueryBuilder('i')
            ->join('i.source', 's')
            ->where('s.techGroup IN (:groupIds)')
            ->setParameter('groupIds', $groupIds)
            ->orderBy('i.publishedAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        $items = $qb->getQuery()->getResult();

        $total = (int) $this->createQueryBuilder('i2')
            ->select('COUNT(i2.id)')
            ->join('i2.source', 's2')
            ->where('s2.techGroup IN (:groupIds)')
            ->setParameter('groupIds', $groupIds)
            ->getQuery()
            ->getSingleScalarResult();

        return ['items' => $items, 'totalItems' => $total];
    }

    /**
     * Items RSS des groupes rejoints par l'utilisateur, triés par date de publication.
     *
     * @return TechWatchItem[]
     */
    public function findForUserGroups(\App\Entity\User $user, int $limit, int $offset = 0): array
    {
        return $this->createQueryBuilder('i')
            ->join('i.source', 's')
            ->join('s.techGroup', 'g')
            ->join('g.users', 'u')
            ->where('u = :user')
            ->setParameter('user', $user)
            ->orderBy('i.publishedAt', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    public function existsByUrl(string $url): bool
    {
        return (bool) $this->findOneBy(['url' => $url]);
    }
}
