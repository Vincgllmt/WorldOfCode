<?php

namespace App\Repository;

use App\Entity\LoginHistory;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class LoginHistoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LoginHistory::class);
    }

    public function save(LoginHistory $entry, bool $flush = true): void
    {
        $this->getEntityManager()->persist($entry);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /** Retourne true si ce pays a déjà été vu pour cet utilisateur */
    public function hasSeenCountry(User $user, string $countryCode): bool
    {
        $count = $this->createQueryBuilder('h')
            ->select('COUNT(h.id)')
            ->where('h.user = :user')
            ->andWhere('h.countryCode = :country')
            ->setParameter('user', $user)
            ->setParameter('country', $countryCode)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $count > 0;
    }

    /** Retourne true si ce hash d'IP a déjà été vu pour cet utilisateur */
    public function hasSeenIpHash(User $user, string $ipHash): bool
    {
        $count = $this->createQueryBuilder('h')
            ->select('COUNT(h.id)')
            ->where('h.user = :user')
            ->andWhere('h.ipHash = :ipHash')
            ->setParameter('user', $user)
            ->setParameter('ipHash', $ipHash)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $count > 0;
    }
}
