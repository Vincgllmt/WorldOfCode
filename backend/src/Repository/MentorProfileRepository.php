<?php

namespace App\Repository;

use App\Entity\MentorProfile;
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

    /**
     * @return MentorProfile[]
     */
    public function searchMentors(string $query, int $limit = 10): array
    {
        $qb = $this->createQueryBuilder('p')
            ->leftJoin('p.user', 'u')
            ->where('p.isAvailable = true');

        if ($query !== '') {
            $qb->andWhere('u.username LIKE :q')
               ->setParameter('q', '%' . $query . '%');
        }

        return $qb->setMaxResults($limit)->getQuery()->getResult();
    }

    public function getStats(MentorProfile $profile): array
    {
        $em = $this->getEntityManager();

        $totalSessions = (int) $em
            ->createQuery('SELECT COUNT(s.id) FROM App\Entity\MentoringSession s WHERE s.mentor = :mentor AND s.status = :completed')
            ->setParameter('mentor', $profile)
            ->setParameter('completed', MentoringSessionStatus::COMPLETED)
            ->getSingleScalarResult();

        $activeSessions = (int) $em
            ->createQuery('SELECT COUNT(s.id) FROM App\Entity\MentoringSession s WHERE s.mentor = :mentor AND s.status IN (:statuses)')
            ->setParameter('mentor', $profile)
            ->setParameter('statuses', [MentoringSessionStatus::IN_PROGRESS, MentoringSessionStatus::SCHEDULED])
            ->getSingleScalarResult();

        $totalMentees = (int) $em
            ->createQuery('SELECT COUNT(DISTINCT s.junior) FROM App\Entity\MentoringSession s WHERE s.mentor = :mentor AND s.status = :completed')
            ->setParameter('mentor', $profile)
            ->setParameter('completed', MentoringSessionStatus::COMPLETED)
            ->getSingleScalarResult();

        return [
            'totalSessions'   => $totalSessions,
            'activeSessions'  => $activeSessions,
            'totalMentees'    => $totalMentees,
            'averageRating'   => $profile->getAverageRating(),
            'reliabilityRate' => $profile->getReliabilityRate(),
        ];
    }
}
