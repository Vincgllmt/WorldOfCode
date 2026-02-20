<?php

namespace App\Repository;

use App\Entity\Skill;
use App\Enum\SkillCategory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class SkillRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
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
        return $this->createQueryBuilder('s')
            ->where('s.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();
    }
}
