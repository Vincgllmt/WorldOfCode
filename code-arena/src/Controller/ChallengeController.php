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

        $data = array_map(static fn (Challenge $c): array => [
            'id' => $c->getId(),
            'slug' => $c->getSlug(),
            'title' => $c->getTitle(),
            'difficulty' => $c->getDifficulty(),
            'languages' => $c->getLanguages(),
            'maxScore' => $c->getMaxScore(),
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
            'publicTests' => $publicTests,
        ]);
    }
}
