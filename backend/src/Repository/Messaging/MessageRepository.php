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


    /**
     * Recherche globale dans les messages des conversations de l'utilisateur.
     */
    public function searchByUserAndQuery(int $userId, string $query, int $limit = 30): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT m.id, m.body, m.type, m.created_at, m.conversation_id,
                   u.id AS sender_id, u.username AS sender_username
            FROM msg_messages m
            INNER JOIN msg_conversation_participants cp ON cp.conversation_id = m.conversation_id
            INNER JOIN user u ON u.id = m.sender_id
            WHERE cp.user_id = :userId
              AND m.type = :textType
              AND m.body LIKE :query
            ORDER BY m.created_at DESC
            LIMIT :limit
        ';

        return $conn->fetchAllAssociative($sql, [
            'userId' => $userId,
            'textType' => 'text',
            'query' => '%' . $query . '%',
            'limit' => $limit,
        ], [
            'userId' => \Doctrine\DBAL\ParameterType::INTEGER,
            'textType' => \Doctrine\DBAL\ParameterType::STRING,
            'query' => \Doctrine\DBAL\ParameterType::STRING,
            'limit' => \Doctrine\DBAL\ParameterType::INTEGER,
        ]);
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
