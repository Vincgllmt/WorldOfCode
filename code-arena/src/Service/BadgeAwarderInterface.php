<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Challenge;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Contrat d'attribution des badges d'un défi. Permet de découpler les contrôleurs
 * (SubmissionController, PlayController) de l'implémentation concrète et de la
 * remplacer par un double dans les tests.
 */
interface BadgeAwarderInterface
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
    ): array;
}
