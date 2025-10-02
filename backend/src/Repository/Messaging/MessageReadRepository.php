<?php

namespace App\Repository\Messaging;

use App\Entity\Messaging\Message;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use App\Entity\Messaging\MessageRead;

class MessageReadRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, \App\Entity\Messaging\MessageRead::class);
    }

    public function isReadByUser(Message $message, User $user): bool
    {
        return (bool) $this->createQueryBuilder('mr')
            ->select('1')
            ->andWhere('mr.message = :message')
            ->andWhere('mr.user = :user')
            ->setParameter('message', $message)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }


    public function markAsRead(Message $message, User $user): void
    {
        if (!$this->isReadByUser($message, $user)) {
            $mr = new MessageRead($message, $user);
            $this->getEntityManager()->persist($mr);
        }
    }
}
