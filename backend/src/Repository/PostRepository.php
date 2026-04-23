<?php

namespace App\Repository;

use App\Entity\Post;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\ParameterType;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Post>
 */
class PostRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Post::class);
    }

    public function save(Post $post, bool $flush = false): void
    {
        $this->getEntityManager()->persist($post);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Post $post, bool $flush = false): void
    {
        $this->getEntityManager()->remove($post);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findWithLikes(int $id): ?Post
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.author', 'a')->addSelect('a')
            ->leftJoin('p.techGroup', 'g')->addSelect('g')

            // 🔹 relations liées au partage
            ->leftJoin('p.sharedFrom', 'sf')->addSelect('sf')
            ->leftJoin('sf.techGroup', 'sfg')->addSelect('sfg')
            ->leftJoin('sf.author', 'sfa')->addSelect('sfa')

            // 🔹 relations liées aux likes
            ->leftJoin('p.likes', 'l')->addSelect('l')
            ->leftJoin('l.user', 'u')->addSelect('u')

            ->where('p.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findAllWithLikes(): array
    {
        return $this->createBaseQueryBuilder()
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array{items: Post[], totalItems: int}
     */
    public function findPaginatedWithLikes(int $page, int $limit): array
    {
        // 1. Récupérer les IDs des posts
        $qb = $this->createQueryBuilder('p')
            ->select('p.id')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->orderBy('p.createdAt', 'DESC');

        $ids = array_column($qb->getQuery()->getResult(), 'id');

        if (empty($ids)) {
            return ['items' => [], 'totalItems' => 0];
        }

        // 2. Charger les posts complets avec leurs relations
        $posts = $this->createQueryBuilder('p')
            ->leftJoin('p.author', 'a')->addSelect('a')
            ->leftJoin('p.techGroup', 'g')->addSelect('g')
            ->leftJoin('p.sharedFrom', 'sf')->addSelect('sf')
            ->leftJoin('sf.techGroup', 'sfg')->addSelect('sfg')
            ->leftJoin('sf.author', 'sfa')->addSelect('sfa')
            ->where('p.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();

        // 3. Charger les likes séparément
        $this->createQueryBuilder('p2')
            ->select('PARTIAL p2.{id}')
            ->leftJoin('p2.likes', 'l')->addSelect('l')
            ->leftJoin('l.user', 'u')->addSelect('u')
            ->where('p2.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();

        // 4. Compter le total
        $totalItems = $this->count([]);

        return ['items' => $posts, 'totalItems' => $totalItems];
    }

    /**
     * Feed filtré : posts de l'utilisateur lui-même, des personnes suivies, et des groupes rejoints.
     *
     * @return array{items: Post[], totalItems: int}
     */
    public function findFeedPaginatedForUser(User $user, int $page, int $limit): array
    {
        $page = max($page, 1);
        $limit = max($limit, 1);

        $qb = $this->createBaseQueryBuilder()
            ->andWhere(
                'a = :user
                 OR a IN (SELECT ff_u FROM App\Entity\Follow ff JOIN ff.followed ff_u WHERE ff.follower = :user)
                 OR g IN (SELECT jg FROM App\Entity\TechGroup jg JOIN jg.users jgu WHERE jgu = :user)'
            )
            ->setParameter('user', $user)
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        $paginator = new Paginator($qb->getQuery());
        $items = iterator_to_array($paginator, false);

        return [
            'items' => $items,
            'totalItems' => count($paginator),
        ];
    }

    /**
     * Feed scoré : (likes×3 + comments×2 + shares×4 + 1) / (âge_heures + 2)^1.5
     *
     * @return array{items: Post[], totalItems: int}
     */
    public function findScoredFeedForUser(User $user, int $page, int $limit): array
    {
        $conn = $this->getEntityManager()->getConnection();
        $userId = $user->getId();
        $offset = ($page - 1) * $limit;

        $scoreSql = <<<SQL
            SELECT p.id,
                   (COUNT(DISTINCT l.id) * 3 + COUNT(DISTINCT c.id) * 2 + COUNT(DISTINCT s.id) * 4 + 1)
                   / POW(TIMESTAMPDIFF(HOUR, p.created_at, NOW()) + 2, 1.5) AS score
            FROM post p
            LEFT JOIN likes l ON l.post_id = p.id
            LEFT JOIN `comment` c ON c.post_id = p.id
            LEFT JOIN post s ON s.shared_from_id = p.id
            WHERE (
                p.author_id = :userId
                OR p.author_id IN (SELECT f.followed_id FROM follows f WHERE f.follower_id = :userId)
                OR p.tech_group_id IN (SELECT tu.tech_group_id FROM techgroup_user tu WHERE tu.user_id = :userId)
            )
            GROUP BY p.id
            ORDER BY score DESC
            LIMIT :limit OFFSET :offset
        SQL;

        $rows = $conn->executeQuery($scoreSql, [
            'userId' => $userId,
            'limit' => $limit,
            'offset' => $offset,
        ], [
            'userId' => ParameterType::INTEGER,
            'limit' => ParameterType::INTEGER,
            'offset' => ParameterType::INTEGER,
        ])->fetchAllAssociative();

        if (empty($rows)) {
            return ['items' => [], 'totalItems' => 0];
        }

        $ids = array_column($rows, 'id');
        $scoreMap = array_column($rows, 'score', 'id');

        $posts = $this->createBaseQueryBuilder()
            ->where('p.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();

        usort($posts, fn(Post $a, Post $b) => $scoreMap[$b->getId()] <=> $scoreMap[$a->getId()]);

        $countSql = <<<SQL
            SELECT COUNT(DISTINCT p.id)
            FROM post p
            WHERE (
                p.author_id = :userId
                OR p.author_id IN (SELECT f.followed_id FROM follows f WHERE f.follower_id = :userId)
                OR p.tech_group_id IN (SELECT tu.tech_group_id FROM techgroup_user tu WHERE tu.user_id = :userId)
            )
        SQL;

        $totalItems = (int) $conn->executeQuery($countSql, ['userId' => $userId])->fetchOne();

        return ['items' => $posts, 'totalItems' => $totalItems];
    }

    public function countSince(\DateTime $since): int
    {
        return (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.createdAt >= :since')
            ->setParameter('since', $since)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Retourne le nombre de nouveaux posts par jour depuis $since.
     * @return array<string, int>  clé = 'Y-m-d', valeur = count
     */
    public function countByDay(\DateTime $since): array
    {
        $conn = $this->getEntityManager()->getConnection();
        $sql = '
            SELECT DATE(created_at) AS day, COUNT(*) AS cnt
            FROM post
            WHERE created_at >= :since
            GROUP BY DATE(created_at)
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
     * Retourne tous les posts avec leurs compteurs agrégés (likes, commentaires, reports).
     * @return array<int, array{id:int, content:?string, createdAt:\DateTime, authorUsername:string, techGroupName:?string, likesCount:int, commentsCount:int, reportsCount:int}>
     */
    public function findAllWithCounts(): array
    {
        return $this->createQueryBuilder('p')
            ->select(
                'p.id',
                'p.content',
                'p.createdAt',
                'u.username AS authorUsername',
                'g.name AS techGroupName',
                'COUNT(DISTINCT l.id) AS likesCount',
                'COUNT(DISTINCT c.id) AS commentsCount',
                'COUNT(DISTINCT r.id) AS reportsCount'
            )
            ->innerJoin('p.author', 'u')
            ->leftJoin('p.techGroup', 'g')
            ->leftJoin('p.likes', 'l')
            ->leftJoin('p.comments', 'c')
            ->leftJoin('App\Entity\Report', 'r', 'WITH', 'r.post = p')
            ->groupBy('p.id')
            ->orderBy('p.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Retourne une page de posts avec compteurs, filtres et tri.
     *
     * @return array{items: array<int, array{id:int, content:?string, createdAt:mixed, authorUsername:string, techGroupName:?string, likesCount:int, commentsCount:int, reportsCount:int}>, total: int}
     */
    public function findPaginatedWithCounts(
        int $page,
        int $limit,
        ?string $search = null,
        int $minReports = 0,
        string $sortField = 'createdAt',
        string $sortDir = 'DESC'
    ): array {
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        $base = $this->createQueryBuilder('p')
            ->innerJoin('p.author', 'u')
            ->leftJoin('p.techGroup', 'g')
            ->leftJoin('p.likes', 'l')
            ->leftJoin('p.comments', 'c')
            ->leftJoin('App\Entity\Report', 'r', 'WITH', 'r.post = p');

        if ($search !== null && $search !== '') {
            $base->andWhere('LOWER(p.content) LIKE :search OR LOWER(u.username) LIKE :search')
                 ->setParameter('search', '%' . mb_strtolower(trim($search)) . '%');
        }

        $countQb = (clone $base)->select('p.id')->groupBy('p.id');
        if ($minReports > 0) {
            $countQb->having('COUNT(DISTINCT r.id) >= :minReports')
                    ->setParameter('minReports', $minReports);
        }
        $total = count($countQb->getQuery()->getScalarResult());

        $itemsQb = (clone $base)
            ->select(
                'p.id',
                'p.content',
                'p.createdAt',
                'u.username AS authorUsername',
                'g.name AS techGroupName',
                'COUNT(DISTINCT l.id) AS likesCount',
                'COUNT(DISTINCT c.id) AS commentsCount',
                'COUNT(DISTINCT r.id) AS reportsCount'
            )
            ->groupBy('p.id')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit);

        if ($minReports > 0) {
            $itemsQb->having('COUNT(DISTINCT r.id) >= :minReports')
                    ->setParameter('minReports', $minReports);
        }

        match ($sortField) {
            'likesCount'     => $itemsQb->orderBy('likesCount', $sortDir),
            'commentsCount'  => $itemsQb->orderBy('commentsCount', $sortDir),
            'reportsCount'   => $itemsQb->orderBy('reportsCount', $sortDir),
            'authorUsername' => $itemsQb->orderBy('u.username', $sortDir),
            'techGroupName'  => $itemsQb->orderBy('g.name', $sortDir),
            default          => $itemsQb->orderBy('p.createdAt', $sortDir),
        };

        return ['items' => $itemsQb->getQuery()->getResult(), 'total' => $total];
    }

    private function createBaseQueryBuilder(): QueryBuilder
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.author', 'a')->addSelect('a')
            ->leftJoin('p.techGroup', 'g')->addSelect('g')
            ->leftJoin('p.sharedFrom', 'sf')->addSelect('sf')
            ->leftJoin('sf.techGroup', 'sfg')->addSelect('sfg')
            ->leftJoin('sf.author', 'sfa')->addSelect('sfa')
            ->leftJoin('p.likes', 'l')->addSelect('l')
            ->leftJoin('l.user', 'u')->addSelect('u')
            ->orderBy('p.createdAt', 'DESC');
    }
}
