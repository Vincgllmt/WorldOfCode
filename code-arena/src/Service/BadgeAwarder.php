<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\UserBadge;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Attribue les badges d'un défi à un utilisateur. Partagé entre la soumission
 * classique (SubmissionController) et le mode jeu avec referee (PlayController).
 *
 * Règles :
 *  - "perfect"     : tous les tests passés (peut être attribué plusieurs fois si non déjà obtenu)
 *  - "first_solve" : premier utilisateur à passer tous les tests pour ce défi
 */
final class BadgeAwarder implements BadgeAwarderInterface
{
    /**
     * Persiste les UserBadge éligibles (sans flush) et retourne les codes octroyés.
     *
     * @return string[]
     */
    public function award(
        EntityManagerInterface $em,
        Challenge $challenge,
        int $userId,
        int $testsPassed,
        int $totalTests,
    ): array {
        $awarded = [];

        /** @var Badge[] $badges */
        $badges = $challenge->getBadges()->toArray();

        foreach ($badges as $badge) {
            if ($this->userAlreadyHasBadge($em, $userId, $badge->getId())) {
                continue;
            }

            $grant = match ($badge->getCode()) {
                'perfect'     => $testsPassed === $totalTests,
                'first_solve' => $testsPassed === $totalTests && $this->isFirstSolve($em, $challenge),
                default       => false,
            };

            if ($grant) {
                $userBadge = (new UserBadge())
                    ->setUserId($userId)
                    ->setBadge($badge);

                $em->persist($userBadge);
                $awarded[] = $badge->getCode();
            }
        }

        return $awarded;
    }

    private function userAlreadyHasBadge(EntityManagerInterface $em, int $userId, int $badgeId): bool
    {
        return null !== $em->getRepository(UserBadge::class)->findOneBy([
            'userId' => $userId,
            'badge'  => $badgeId,
        ]);
    }

    private function isFirstSolve(EntityManagerInterface $em, Challenge $challenge): bool
    {
        $count = $em->createQuery(
            'SELECT COUNT(s.id) FROM App\Entity\Submission s
             WHERE s.challenge = :challenge AND s.status = :status',
        )
            ->setParameter('challenge', $challenge)
            ->setParameter('status', 'passed')
            ->getSingleScalarResult();

        return (int) $count === 0;
    }
}
