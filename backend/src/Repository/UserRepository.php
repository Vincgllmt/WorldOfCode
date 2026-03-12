<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;


class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }
    ####
    ##
    ####
    public function save(User $user, bool $flush = true): void
    {
        $this->getEntityManager()->persist($user);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
    ####
    ##
    ####
    public function findByUsernameInsensitive(string $username): ?User
    {
        $username = mb_strtolower(trim($username));

        return $this->createQueryBuilder('u')
            ->where('LOWER(u.username) = LOWER(:username)')
            ->setParameter('username', $username)
            ->getQuery()
            ->getOneOrNullResult();
    }
    ####
    ##
    ####
    public function existsOtherWithUsername(int $userId, string $username): bool
    {
        return (bool) $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('LOWER(u.username) = LOWER(:username)')
            ->andWhere('u.id != :id')
            ->setParameter('username', $username)
            ->setParameter('id', $userId)
            ->getQuery()
            ->getSingleScalarResult();
    }
    ####
    ##
    ####
    public function existsOtherWithEmail(int $userId, string $email): bool
    {
        return (bool) $this->createQueryBuilder('u')
            ->select('COUNT(u.id)')
            ->where('LOWER(u.email) = LOWER(:email)')
            ->andWhere('u.id != :id')
            ->setParameter('email', $email)
            ->setParameter('id', $userId)
            ->getQuery()
            ->getSingleScalarResult();
    }
    ####
    ##
    ####
    /** @return User[] */
    public function searchByQuery(string $q, int $limit = 5): array
    {
        $term = '%' . mb_strtolower(trim($q)) . '%';

        return $this->createQueryBuilder('u')
            ->where('LOWER(u.username) LIKE :q')
            ->orWhere('LOWER(u.firstname) LIKE :q')
            ->orWhere('LOWER(u.lastname) LIKE :q')
            ->setParameter('q', $term)
            ->orderBy('u.username', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
    ####
    ##
    ####
    public function remove(User $user, bool $flush = false): void
    {
        $this->getEntityManager()->remove($user);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
