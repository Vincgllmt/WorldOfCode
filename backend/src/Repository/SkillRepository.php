<?php

namespace App\Repository;

use App\Entity\Skill;
use App\Enum\SkillCategory;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class SkillRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry, private CacheInterface $cache)
    {
        parent::__construct($registry, Skill::class);
    }

    public function save(Skill $skill, bool $flush = true): void
    {
        $this->getEntityManager()->persist($skill);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * @return Skill[]
     */
    public function findByCategory(SkillCategory $category): array
    {
        return $this->createQueryBuilder('s')
            ->where('s.category = :category')
            ->setParameter('category', $category->value)
            ->orderBy('s.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return Skill[]
     */
    public function findAllOrderedByCategory(): array
    {
        return $this->createQueryBuilder('s')
            ->orderBy('s.category', 'ASC')
            ->addOrderBy('s.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param int[] $ids
     * @return Skill[]
     */
    public function findByIds(array $ids): array
    {
        if (empty($ids)) {
            return [];
        }

        // Limiter à 100 skills max
        $ids = array_slice($ids, 0, 100);
        $cacheKey = 'skills_' . md5(implode(',', $ids));

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($ids) {
            $item->expiresAfter(3600); // 1 heure

            return $this->createQueryBuilder('s')
                ->where('s.id IN (:ids)')
                ->setParameter('ids', $ids)
                ->getQuery()
                ->getResult();
        });
    }
}
