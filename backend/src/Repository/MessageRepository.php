<?php

namespace App\Repository;

use App\Entity\Messaging\Message;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

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

    /**
     * Récupère les messages d’une conversation par ordre chronologique
     */
    public function findByConversationOrdered(string $conversationId): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.conversation = :convId')
            ->setParameter('convId', $conversationId)
            ->orderBy('m.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
