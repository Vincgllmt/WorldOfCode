<?php

namespace App\Repository;

use App\Entity\Post;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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
    ####
    ##
    ####
    public function save(Post $post, bool $flush = false): void
    {
        $this->getEntityManager()->persist($post);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
    ####
    ##
    ####
    public function remove(Post $post, bool $flush = false): void
    {
        $this->getEntityManager()->remove($post);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
    ####
    ##
    ####
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
    ####
    ##
    ####
    public function findAllWithLikes(): array
    {
        return $this->createBaseQueryBuilder()
            ->getQuery()
            ->getResult();
    }
    ####
    ##
    ####
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

    public function countSince(\DateTime $since): int
    {
        return (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.createdAt >= :since')
            ->setParameter('since', $since)
            ->getQuery()
            ->getSingleScalarResult();
    }
    ####
    ##
    ####
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
    ####
    ##
    ####
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
