<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;


class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function save(User $user, bool $flush = true): void
    {
        $this->getEntityManager()->persist($user);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findByUsernameInsensitive(string $username): ?User
    {
        $username = mb_strtolower(trim($username));

        return $this->createQueryBuilder('u')
            ->where('LOWER(u.username) = LOWER(:username)')
            ->setParameter('username', $username)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function existsOtherWithUsername(int $userId, string $username): bool
    {
        return (bool) $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('LOWER(u.username) = LOWER(:username)')
            ->andWhere('u.id != :id')
            ->setParameter('username', $username)
            ->setParameter('id', $userId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function existsOtherWithEmail(int $userId, string $email): bool
    {
        return (bool) $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('LOWER(u.email) = LOWER(:email)')
            ->andWhere('u.id != :id')
            ->setParameter('email', $email)
            ->setParameter('id', $userId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** @return User[] */
    public function searchByQuery(string $q, int $limit = 5): array
    {
        $term = mb_strtolower(trim($q)) . '%';

        return $this->createQueryBuilder('u')
            ->where('LOWER(u.username) LIKE :q')
            ->orWhere('LOWER(u.firstname) LIKE :q')
            ->orWhere('LOWER(u.lastname) LIKE :q')
            ->setParameter('q', $term)
            ->orderBy('u.username', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function remove(User $user, bool $flush = false): void
    {
        $this->getEntityManager()->remove($user);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function countSince(\DateTime $since): int
    {
        return (int) $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('u.creationDate >= :since')
            ->setParameter('since', $since)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Retourne le nombre de nouveaux utilisateurs par jour depuis $since.
     * @return array<string, int>  clé = 'Y-m-d', valeur = count
     */
    public function countByDay(\DateTime $since): array
    {
        $conn = $this->getEntityManager()->getConnection();
        $sql = '
            SELECT DATE(creation_date) AS day, COUNT(*) AS cnt
            FROM user
            WHERE creation_date >= :since
            GROUP BY DATE(creation_date)
            ORDER BY day ASC
        ';
        $rows = $conn->executeQuery($sql, ['since' => $since->format('Y-m-d H:i:s')])->fetchAllAssociative();

        $result = [];
        foreach ($rows as $row) {
            $result[$row['day']] = (int) $row['cnt'];
        }
        return $result;
    }

    /**
     * Retourne tous les utilisateurs avec leurs compteurs agrégés.
     * @return array<int, array{id: int, username: string, email: string, role: mixed, creationDate: \DateTime, avatarUrl: ?string, postCount: int, followerCount: int}>
     */
    public function findAllWithCounts(): array
    {
        return $this->createQueryBuilder('u')
            ->select(
                'u.id',
                'u.username',
                'u.email',
                'u.role',
                'u.creationDate',
                'u.avatarUrl',
                'COUNT(DISTINCT p.id) AS postCount',
                'COUNT(DISTINCT f.id) AS followerCount'
            )
            ->leftJoin('u.posts', 'p')
            ->leftJoin('App\Entity\Follow', 'f', 'WITH', 'f.followed = u')
            ->groupBy('u.id')
            ->orderBy('u.creationDate', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Retourne une page d'utilisateurs avec compteurs, filtres et tri.
     *
     * @return array{items: array<int, array{id: int, username: string, email: string, role: mixed, creationDate: mixed, avatarUrl: ?string, postCount: int, followerCount: int}>, total: int}
     */
    public function findPaginatedWithCounts(
        int $page,
        int $limit,
        ?string $search = null,
        ?string $role = null,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        string $sortField = 'creationDate',
        string $sortDir = 'DESC',
        ?bool $isBanned = null,
    ): array {
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $base = $this->createQueryBuilder('u')
            ->leftJoin('u.posts', 'p')
            ->leftJoin('App\Entity\Follow', 'f', 'WITH', 'f.followed = u');

        if ($search !== null && $search !== '') {
            $base->andWhere('LOWER(u.username) LIKE :search OR LOWER(u.email) LIKE :search')
                 ->setParameter('search', '%' . mb_strtolower(trim($search)) . '%');
        }

        if ($role !== null && $role !== '') {
            $base->andWhere('u.role = :role')
                 ->setParameter('role', \App\Enum\UserRole::from($role));
        }

        if ($dateFrom !== null && $dateFrom !== '') {
            $base->andWhere('u.creationDate >= :dateFrom')
                 ->setParameter('dateFrom', new \DateTime($dateFrom . ' 00:00:00'));
        }

        if ($dateTo !== null && $dateTo !== '') {
            $base->andWhere('u.creationDate <= :dateTo')
                 ->setParameter('dateTo', new \DateTime($dateTo . ' 23:59:59'));
        }

        if ($isBanned !== null) {
            $base->andWhere('u.isBanned = :isBanned')
                 ->setParameter('isBanned', $isBanned);
        }

        $total = (int) (clone $base)
            ->select('COUNT(DISTINCT u.id)')
            ->getQuery()
            ->getSingleScalarResult();

        $itemsQb = (clone $base)
            ->select(
                'u.id',
                'u.username',
                'u.email',
                'u.role',
                'u.creationDate',
                'u.avatarUrl',
                'u.isBanned',
                'COUNT(DISTINCT p.id) AS postCount',
                'COUNT(DISTINCT f.id) AS followerCount',
                '(SELECT COUNT(r.id) FROM App\Entity\Report r JOIN r.post rp WHERE rp.author = u) AS reportCount'
            )
            ->groupBy('u.id')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        match ($sortField) {
            'postCount'     => $itemsQb->orderBy('postCount', $sortDir),
            'followerCount' => $itemsQb->orderBy('followerCount', $sortDir),
            'reportCount'   => $itemsQb->orderBy('reportCount', $sortDir),
            'username'      => $itemsQb->orderBy('u.username', $sortDir),
            'email'         => $itemsQb->orderBy('u.email', $sortDir),
            'role'          => $itemsQb->orderBy('u.role', $sortDir),
            default         => $itemsQb->orderBy('u.creationDate', $sortDir),
        };

        return ['items' => $itemsQb->getQuery()->getResult(), 'total' => $total];
    }
}
