<?php

namespace App\Repository;

use App\Entity\Report;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Report::class);
    }

    public function save(Report $report, bool $flush = true): void
    {
        $this->getEntityManager()->persist($report);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Report $report, bool $flush = true): void
    {
        $this->getEntityManager()->remove($report);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * @return array{items: Report[], total: int}
     */
    public function findPaginatedWithFilters(
        int $page,
        int $limit,
        ?string $status = null,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?string $reason = null,
        string $sortField = 'createdAt',
        string $sortDir = 'DESC',
        mixed $claimedByUser = null,
    ): array {
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $base = $this->createQueryBuilder('r')
            ->leftJoin('r.user', 'reporter')
            ->leftJoin('r.claimedBy', 'claimed');

        if ($status) {
            $base->andWhere('r.status = :status')
                 ->setParameter('status', $status);
        }
        if ($reason) {
            $base->andWhere('LOWER(r.reason) LIKE :reason')
                 ->setParameter('reason', '%' . mb_strtolower(trim($reason)) . '%');
        }
        if ($dateFrom) {
            $base->andWhere('r.createdAt >= :dateFrom')
                 ->setParameter('dateFrom', new \DateTime($dateFrom));
        }
        if ($dateTo) {
            $base->andWhere('r.createdAt <= :dateTo')
                 ->setParameter('dateTo', new \DateTime($dateTo . ' 23:59:59'));
        }
        if ($claimedByUser !== null) {
            $base->andWhere('r.claimedBy = :claimedByUser')
                 ->setParameter('claimedByUser', $claimedByUser);
        }

        $total = (int) (clone $base)
            ->select('COUNT(r.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $itemsQb = (clone $base)
            ->select('r')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        match ($sortField) {
            'status'             => $itemsQb->orderBy('r.status', $sortDir),
            'reportedByUsername' => $itemsQb->orderBy('reporter.username', $sortDir),
            'claimedByUsername'  => $itemsQb->orderBy('claimed.username', $sortDir),
            'claimedAt'          => $itemsQb->orderBy('r.claimedAt', $sortDir),
            default              => $itemsQb->orderBy('r.createdAt', $sortDir),
        };

        return ['items' => $itemsQb->getQuery()->getResult(), 'total' => $total];
    }

    /**
     * Compte le nombre total de reports sur les posts d'un utilisateur.
     */
    public function countByAuthorId(int $userId): int
    {
        $conn = $this->getEntityManager()->getConnection();
        $sql = '
            SELECT COUNT(r.id)
            FROM reports r
            INNER JOIN post p ON r.post_id = p.id
            WHERE p.author_id = :userId
        ';
        return (int) $conn->executeQuery($sql, ['userId' => $userId])->fetchOne();
    }
}
