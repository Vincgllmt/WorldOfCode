<?php

namespace App\Repository;

use App\Entity\MentorProfile;
use App\Entity\MentoringSession;
use App\Enum\MentoringSessionStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class MentorProfileRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MentorProfile::class);
    }

    public function save(MentorProfile $entity, bool $flush = true): void
    {
        $this->getEntityManager()->persist($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(MentorProfile $entity, bool $flush = true): void
    {
        $this->getEntityManager()->remove($entity);
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function getStats(MentorProfile $profile): array
    {
        $em = $this->getEntityManager();

        $totalSessions = $em->createQueryBuilder()
            ->select('COUNT(s.id)')
            ->from(MentoringSession::class, 's')
            ->where('s.mentor = :profile')
            ->andWhere('s.status = :completed')
            ->setParameter('profile', $profile)
            ->setParameter('completed', MentoringSessionStatus::COMPLETED)
            ->getQuery()->getSingleScalarResult();

        $activeSessions = $em->createQueryBuilder()
            ->select('COUNT(s.id)')
            ->from(MentoringSession::class, 's')
            ->where('s.mentor = :profile')
            ->andWhere('s.status IN (:statuses)')
            ->setParameter('profile', $profile)
            ->setParameter('statuses', [MentoringSessionStatus::SCHEDULED, MentoringSessionStatus::IN_PROGRESS])
            ->getQuery()->getSingleScalarResult();

        $totalMentees = $em->createQueryBuilder()
            ->select('COUNT(DISTINCT s.junior)')
            ->from(MentoringSession::class, 's')
            ->where('s.mentor = :profile')
            ->setParameter('profile', $profile)
            ->getQuery()->getSingleScalarResult();

        return [
            'totalSessions'   => (int) $totalSessions,
            'activeSessions'  => (int) $activeSessions,
            'totalMentees'    => (int) $totalMentees,
            'averageRating'   => $profile->getAverageRating(),
            'reliabilityRate' => $profile->getReliabilityRate(),
        ];
    }
}
