<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Challenge;
use App\Entity\ChallengeTest;
use App\Security\ArenaUser;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/arena/challenges')]
final class ChallengeController extends AbstractController
{
    #[Route('', name: 'arena_challenges_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em, Connection $connection): JsonResponse
    {
        /** @var ArenaUser $user */
        $user = $this->getUser();

        // Identifiants des défis déjà réussis par l'utilisateur courant.
        $solvedIds = $connection->fetchFirstColumn(
            'SELECT DISTINCT challenge_id FROM submission WHERE user_id = ? AND status = ?',
            [$user->getId(), 'passed'],
        );
        $solvedIds = array_map('intval', $solvedIds);

        // Taux de réussite par défi = soumissions réussies / total des soumissions.
        // On ne compte, par utilisateur et par défi, que les soumissions allant jusqu'à
        // la première réussie incluse : les replays après une première victoire ne doivent
        // pas gonfler le taux. Les utilisateurs n'ayant jamais réussi comptent toutes leurs
        // tentatives (COALESCE retombe sur s.id, donc la condition est toujours vraie).
        $rates = $connection->fetchAllKeyValue(
            "SELECT challenge_id,
                    ROUND(100 * SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) / COUNT(*)) AS rate
             FROM submission s
             WHERE s.id <= COALESCE(
                 (SELECT MIN(p.id) FROM submission p
                  WHERE p.user_id = s.user_id
                    AND p.challenge_id = s.challenge_id
                    AND p.status = 'passed'),
                 s.id
             )
             GROUP BY challenge_id",
        );

        $data = array_map(static fn (Challenge $c): array => [
            'id' => $c->getId(),
            'slug' => $c->getSlug(),
            'title' => $c->getTitle(),
            'difficulty' => $c->getDifficulty(),
            'languages' => $c->getLanguages(),
            'maxScore' => $c->getMaxScore(),
            'image' => $c->getImage(),
            'successRate' => (int) round((float) ($rates[$c->getId()] ?? 0)),
            'solved' => in_array($c->getId(), $solvedIds, true),
        ], $em->getRepository(Challenge::class)->findBy([], ['id' => 'ASC']));

        return new JsonResponse($data);
    }

    #[Route('/{slug}', name: 'arena_challenges_detail', methods: ['GET'])]
    public function detail(string $slug, EntityManagerInterface $em): JsonResponse
    {
        $challenge = $em->getRepository(Challenge::class)->findOneBy(['slug' => $slug]);
        if (null === $challenge) {
            throw $this->createNotFoundException(sprintf('Défi "%s" introuvable.', $slug));
        }

        $publicTests = [];
        foreach ($challenge->getTests() as $test) {
            /** @var ChallengeTest $test */
            if ($test->isPublic()) {
                $publicTests[] = [
                    'stdin' => $test->getStdin(),
                    'expectedOutput' => $test->getExpectedOutput(),
                ];
            }
        }

        return new JsonResponse([
            'id' => $challenge->getId(),
            'slug' => $challenge->getSlug(),
            'title' => $challenge->getTitle(),
            'statement' => $challenge->getStatement(),
            'difficulty' => $challenge->getDifficulty(),
            'languages' => $challenge->getLanguages(),
            'maxScore' => $challenge->getMaxScore(),
            'image' => $challenge->getImage(),
            'publicTests' => $publicTests,
        ]);
    }
}
