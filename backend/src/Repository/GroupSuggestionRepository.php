<?php

namespace App\Repository;

use App\Entity\GroupSuggestion;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class GroupSuggestionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GroupSuggestion::class);
    }

    public function save(GroupSuggestion $entity, bool $flush = true): void
    {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(GroupSuggestion $entity, bool $flush = true): void
    {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * @return array{items: GroupSuggestion[], total: int}
     */
    public function findPaginated(
        int $page,
        int $limit,
        ?string $status = null,
        string $sortField = 'createdAt',
        string $sortDir = 'DESC'
    ): array {
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $base = $this->createQueryBuilder('s')
            ->leftJoin('s.suggestedBy', 'suggestedBy');

        if ($status) {
            $base->andWhere('s.status = :status')
                 ->setParameter('status', $status);
        }

        $total = (int) (clone $base)
            ->select('COUNT(s.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $itemsQb = (clone $base)
            ->select('s')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        match ($sortField) {
            'name'               => $itemsQb->orderBy('s.name', $sortDir),
            'status'             => $itemsQb->orderBy('s.status', $sortDir),
            'suggestedByUsername' => $itemsQb->orderBy('suggestedBy.username', $sortDir),
            default              => $itemsQb->orderBy('s.createdAt', $sortDir),
        };

        return ['items' => $itemsQb->getQuery()->getResult(), 'total' => $total];
    }
}
