<?php

namespace App\Repository\Messaging;

use App\Entity\Messaging\Message;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use App\Entity\Messaging\Conversation;

/**
 * @extends ServiceEntityRepository<Message>
 */
class MessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Message::class);
    }

    public function save(Message $message, bool $flush = false): void
    {
        $this->getEntityManager()->persist($message);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Message $message, bool $flush = false): void
    {
        $this->getEntityManager()->remove($message);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }


    public function findByConversationOrdered(
        string $conversationId,
        int $limit = 50,
        ?string $beforeMessageId = null
    ): array {
        $qb = $this->createQueryBuilder('m')
            ->andWhere('m.conversation = :convId')
            ->setParameter('convId', $conversationId)
            ->orderBy('m.createdAt', 'DESC')
            ->setMaxResults($limit);

        // Pagination curseur (plus efficace que offset)
        if ($beforeMessageId) {
            $qb->andWhere('m.id < :beforeId')
                ->setParameter('beforeId', $beforeMessageId);
        }

        return array_reverse($qb->getQuery()->getResult());
    }


    public function findLastByConversation(Conversation $conv): ?Message
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.conversation = :conv')
            ->setParameter('conv', $conv)
            ->orderBy('m.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
