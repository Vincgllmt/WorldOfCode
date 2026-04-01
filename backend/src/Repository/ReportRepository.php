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

    /**
     * Compte le nombre total de reports sur les posts d'un utilisateur.
     */
    public function countByAuthorId(int $userId): int
    {
        $conn = $this->getEntityManager()->getConnection();
        $sql = '
            SELECT COUNT(r.id)
            FROM report r
            INNER JOIN post p ON r.post_id = p.id
            WHERE p.author_id = :userId
        ';
        return (int) $conn->executeQuery($sql, ['userId' => $userId])->fetchOne();
    }
}
