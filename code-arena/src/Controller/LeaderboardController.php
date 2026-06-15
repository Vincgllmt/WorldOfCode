<?php

declare(strict_types=1);

namespace App\Controller;

use App\Security\ArenaUser;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class LeaderboardController extends AbstractController
{
    #[Route('/api/arena/leaderboard', name: 'arena_leaderboard', methods: ['GET'])]
    public function index(Connection $connection): JsonResponse
    {
        /** @var ArenaUser $current */
        $current = $this->getUser();

        // Score total = somme du meilleur score obtenu par défi (soumissions réussies).
        $rows = $connection->fetchAllAssociative(
            'SELECT t.user_id AS user_id, u.username AS username, SUM(t.max_score) AS total_score
             FROM (
                 SELECT user_id, challenge_id, MAX(score) AS max_score
                 FROM submission
                 WHERE status = :status
                 GROUP BY user_id, challenge_id
             ) t
             JOIN user u ON u.id = t.user_id
             GROUP BY t.user_id, u.username
             ORDER BY total_score DESC, t.user_id ASC',
            ['status' => 'passed'],
        );

        // Nombre de badges par utilisateur (clé = user_id, valeur = count).
        $badgeCounts = $connection->fetchAllKeyValue(
            'SELECT user_id, COUNT(*) FROM user_badge GROUP BY user_id',
        );

        $data = [];
        $rank = 1;
        foreach ($rows as $row) {
            $userId = (int) $row['user_id'];
            $data[] = [
                'rank' => $rank++,
                'userId' => $userId,
                'username' => $row['username'],
                'totalScore' => (int) $row['total_score'],
                'badgesCount' => (int) ($badgeCounts[$userId] ?? 0),
                'isCurrentUser' => $userId === $current->getId(),
            ];
        }

        return new JsonResponse($data);
    }
}
