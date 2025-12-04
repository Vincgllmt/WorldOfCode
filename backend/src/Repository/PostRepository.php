<?php

namespace App\Repository;

use App\Entity\Post;
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
        $page = max($page, 1);
        $limit = max($limit, 1);

        $query = $this->createBaseQueryBuilder()
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery();

        $paginator = new Paginator($query);
        $items = iterator_to_array($paginator, false);

        return [
            'items' => $items,
            'totalItems' => count($paginator),
        ];
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
