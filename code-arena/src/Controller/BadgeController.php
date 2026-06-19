<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class BadgeController extends AbstractController
{
    #[Route('/api/arena/users/{userId}/badges', name: 'arena_user_badges', methods: ['GET'], requirements: ['userId' => '\d+'])]
    public function userBadges(int $userId, Connection $connection): JsonResponse
    {
        $rows = $connection->fetchAllAssociative(
            'SELECT b.id AS badge_id, b.name, b.description, b.icon,
                    c.slug AS challenge_slug, ub.awarded_at
             FROM user_badge ub
             JOIN badge b ON b.id = ub.badge_id
             JOIN challenge c ON c.id = b.challenge_id
             WHERE ub.user_id = :userId
             ORDER BY ub.awarded_at DESC',
            ['userId' => $userId],
        );

        $data = array_map(static fn (array $row): array => [
            'badgeId' => (int) $row['badge_id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'icon' => $row['icon'],
            'challengeSlug' => $row['challenge_slug'],
            'awardedAt' => (new \DateTime($row['awarded_at']))->format(\DateTimeInterface::ATOM),
        ], $rows);

        return new JsonResponse($data);
    }
}
