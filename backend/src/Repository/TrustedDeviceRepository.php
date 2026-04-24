<?php

namespace App\Repository;

use App\Entity\TrustedDevice;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class TrustedDeviceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TrustedDevice::class);
    }

    public function save(TrustedDevice $device, bool $flush = true): void
    {
        $this->getEntityManager()->persist($device);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findValidByUserAndHash(User $user, string $tokenHash): ?TrustedDevice
    {
        return $this->createQueryBuilder('d')
            ->where('d.user = :user')
            ->andWhere('d.tokenHash = :hash')
            ->andWhere('d.expiresAt > :now')
            ->setParameter('user', $user)
            ->setParameter('hash', $tokenHash)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function deleteExpiredForUser(User $user): void
    {
        $this->createQueryBuilder('d')
            ->delete()
            ->where('d.user = :user')
            ->andWhere('d.expiresAt <= :now')
            ->setParameter('user', $user)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->execute();
    }

    /** Révoque tous les appareils de confiance d'un utilisateur (ex : changement de mot de passe) */
    public function deleteAllForUser(User $user): void
    {
        $this->createQueryBuilder('d')
            ->delete()
            ->where('d.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
