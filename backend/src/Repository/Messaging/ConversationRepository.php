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
        return $this->createQueryBuilder('c')
            ->where('c.type = :type')
            ->andWhere(
                'EXISTS (SELECT 1 FROM App\Entity\Messaging\ConversationParticipant p1 WHERE p1.conversation = c AND IDENTITY(p1.user) = :userA)'
            )
            ->andWhere(
                'EXISTS (SELECT 1 FROM App\Entity\Messaging\ConversationParticipant p2 WHERE p2.conversation = c AND IDENTITY(p2.user) = :userB)'
            )
            ->setParameter('type', 'direct')
            ->setParameter('userA', $userA)
            ->setParameter('userB', $userB)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
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
