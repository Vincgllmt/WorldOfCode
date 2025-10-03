<?php

namespace App\Repository\Messaging;

use App\Entity\Messaging\Conversation;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Conversation>
 */
class ConversationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Conversation::class);
    }

    public function save(Conversation $conversation, bool $flush = false): void
    {
        $this->getEntityManager()->persist($conversation);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
    public function findDirectConversationBetween(int $userA, int $userB): ?Conversation
    {
        $qb = $this->createQueryBuilder('c')
            ->join('c.participants', 'p')
            ->where('c.type = :type')
            ->setParameter('type', 'direct')
            ->andWhere('p.user IN (:users)')
            ->setParameter('users', [$userA, $userB])
            ->groupBy('c.id')
            ->having('COUNT(p.user) = 2');

        return $qb->getQuery()->getOneOrNullResult();
    }
    public function findByUserId(int $userId): array
    {
        return $this->createQueryBuilder('c')
            ->innerJoin('c.participants', 'p')
            ->andWhere('p.user = :uid')
            ->setParameter('uid', $userId)
            ->getQuery()
            ->getResult();
    }
}
