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
    /**
     * @return array{items: array<array<string, mixed>>, total: int}
     */
    public function findGroupedByPost(
        int $page,
        int $limit,
        string $sortField = 'latestReportAt',
        string $sortDir = 'DESC',
    ): array {
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $allowedSorts = [
            'latestReportAt' => 'latest_report_at',
            'reportCount'    => 'report_count',
            'pendingCount'   => 'pending_count',
        ];
        $orderCol = $allowedSorts[$sortField] ?? 'latest_report_at';

        $conn = $this->getEntityManager()->getConnection();

        $countSql = '
            SELECT COUNT(*) FROM (
                SELECT r.post_id
                FROM reports r
                WHERE r.post_id IS NOT NULL
                GROUP BY r.post_id
            ) AS sub
        ';
        $total = (int) $conn->executeQuery($countSql)->fetchOne();

        $sql = "
            SELECT
                p.id            AS post_id,
                p.content       AS post_content,
                u.username      AS post_author_username,
                u.avatar_url    AS post_author_avatar_url,
                tg.name         AS post_tech_group_name,
                COUNT(r.id)     AS report_count,
                SUM(r.status = 'PENDING')     AS pending_count,
                SUM(r.status = 'IN_PROGRESS') AS in_progress_count,
                SUM(r.status = 'RESOLVED')    AS resolved_count,
                SUM(r.status = 'REJECTED')    AS rejected_count,
                MAX(r.created_at) AS latest_report_at
            FROM reports r
            INNER JOIN post p ON r.post_id = p.id
            LEFT  JOIN user u  ON p.author_id = u.id
            LEFT  JOIN tech_group tg ON p.tech_group_id = tg.id
            WHERE r.post_id IS NOT NULL
            GROUP BY p.id, p.content, u.username, u.avatar_url, tg.name
            ORDER BY {$orderCol} {$sortDir}
            LIMIT :limit OFFSET :offset
        ";

        $rows = $conn->executeQuery($sql, [
            'limit'  => $limit,
            'offset' => ($page - 1) * $limit,
        ])->fetchAllAssociative();

        $items = array_map(static function (array $row): array {
            return [
                'postId'              => (int) $row['post_id'],
                'postContent'         => $row['post_content'],
                'postAuthorUsername'  => $row['post_author_username'],
                'postAuthorAvatarUrl' => $row['post_author_avatar_url'],
                'postTechGroupName'   => $row['post_tech_group_name'],
                'reportCount'         => (int) $row['report_count'],
                'pendingCount'        => (int) $row['pending_count'],
                'inProgressCount'     => (int) $row['in_progress_count'],
                'resolvedCount'       => (int) $row['resolved_count'],
                'rejectedCount'       => (int) $row['rejected_count'],
                'latestReportAt'      => $row['latest_report_at'],
            ];
        }, $rows);

        return ['items' => $items, 'total' => $total];
    }

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
        ?int $postId = null,
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
        if ($postId !== null) {
            $base->andWhere('r.post = :postId')
                 ->setParameter('postId', $postId);
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
