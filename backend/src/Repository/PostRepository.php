<?php

namespace App\Repository;

use App\Entity\Post;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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
    // src/Repository/PostRepository.php

    // public function findWithLikes(int $id): ?Post
    // {
    //     return $this->createQueryBuilder('p')
    //         ->leftJoin('p.author', 'a')
    //         ->leftJoin('p.techGroup', 'g')
    //         ->leftJoin('p.sharedFrom', 'sf')
    //         ->leftJoin('sf.author', 'sfa')
    //         ->leftJoin('p.likes', 'l')
    //         ->leftJoin('l.user', 'u')
    //         ->addSelect('a', 'g', 'sf', 'sfa', 'l', 'u')
    //         ->where('p.id = :id')
    //         ->setParameter('id', $id)
    //         ->getQuery()
    //         ->getOneOrNullResult();
    // }
    public function findWithLikes(int $id): ?Post
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.author', 'a')->addSelect('a')
            ->leftJoin('p.techGroup', 'g')->addSelect('g')

            // 🔹 relations liées au partage
            ->leftJoin('p.sharedFrom', 'sf')->addSelect('sf')
            ->leftJoin('sf.author', 'sfa')->addSelect('sfa')

            // 🔹 relations liées aux likes
            ->leftJoin('p.likes', 'l')->addSelect('l')
            ->leftJoin('l.user', 'u')->addSelect('u')

            ->where('p.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
