<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\ChallengeSolution;
use App\Entity\ChallengeTest;
use App\Service\GameRunnerInterface;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Vue administrateur des jeux (backoffice) : métadonnées complètes, cas de test,
 * referee et solutions de référence, avec vérification d'une solution via Piston.
 * Réservé à ROLE_ADMIN (cf. access_control).
 */
#[Route('/api/arena/admin/challenges')]
final class AdminChallengeController extends AbstractController
{
    #[Route('', name: 'arena_admin_challenges_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em, Connection $connection): JsonResponse
    {
        $submissionCounts = $connection->fetchAllKeyValue(
            'SELECT challenge_id, COUNT(*) FROM submission GROUP BY challenge_id',
        );
        $solvedCounts = $connection->fetchAllKeyValue(
            'SELECT challenge_id, COUNT(DISTINCT user_id) FROM submission WHERE status = ? GROUP BY challenge_id',
            ['passed'],
        );

        $data = array_map(static fn (Challenge $c): array => [
            'id' => $c->getId(),
            'slug' => $c->getSlug(),
            'title' => $c->getTitle(),
            'difficulty' => $c->getDifficulty(),
            'languages' => $c->getLanguages(),
            'maxScore' => $c->getMaxScore(),
            'refereeLanguage' => $c->getRefereeLanguage(),
            'testsCount' => $c->getTests()->count(),
            'badgesCount' => $c->getBadges()->count(),
            'solutionLanguages' => array_values(array_map(
                static fn (ChallengeSolution $s): string => $s->getLanguage(),
                $c->getSolutions()->toArray(),
            )),
            'submissionsCount' => (int) ($submissionCounts[$c->getId()] ?? 0),
            'solvedByCount' => (int) ($solvedCounts[$c->getId()] ?? 0),
            'updatedAt' => $c->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ], $em->getRepository(Challenge::class)->findBy([], ['id' => 'ASC']));

        return new JsonResponse($data);
    }

    #[Route('/{slug}', name: 'arena_admin_challenges_detail', methods: ['GET'])]
    public function detail(string $slug, EntityManagerInterface $em): JsonResponse
    {
        $challenge = $this->findChallenge($slug, $em);

        $tests = array_map(static fn (ChallengeTest $t): array => [
            'position' => $t->getPosition(),
            'stdin' => $t->getStdin(),
        ], array_values($challenge->getTests()->toArray()));

        $badges = array_map(static fn (Badge $b): array => [
            'code' => $b->getCode(),
            'name' => $b->getName(),
            'description' => $b->getDescription(),
            'icon' => $b->getIcon(),
        ], array_values($challenge->getBadges()->toArray()));

        $solutions = array_map(static fn (ChallengeSolution $s): array => [
            'language' => $s->getLanguage(),
            'code' => $s->getCode(),
        ], array_values($challenge->getSolutions()->toArray()));

        return new JsonResponse([
            'id' => $challenge->getId(),
            'slug' => $challenge->getSlug(),
            'title' => $challenge->getTitle(),
            'statement' => $challenge->getStatement(),
            'difficulty' => $challenge->getDifficulty(),
            'languages' => $challenge->getLanguages(),
            'maxScore' => $challenge->getMaxScore(),
            'image' => $challenge->getImage(),
            'refereeLanguage' => $challenge->getRefereeLanguage(),
            'refereeCode' => $challenge->getRefereeCode(),
            'tests' => $tests,
            'badges' => $badges,
            'solutions' => $solutions,
            'createdAt' => $challenge->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $challenge->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }

    /**
     * Exécute la solution de référence d'un langage sur TOUS les cas de test via le
     * referee. Ne persiste rien, n'attribue aucun badge. Le replay n'est pas renvoyé.
     */
    #[Route('/{slug}/solutions/{language}/verify', name: 'arena_admin_solution_verify', methods: ['POST'])]
    public function verifySolution(string $slug, string $language, EntityManagerInterface $em, GameRunnerInterface $runner): JsonResponse
    {
        $challenge = $this->findChallenge($slug, $em);

        $solution = null;
        foreach ($challenge->getSolutions() as $candidate) {
            /** @var ChallengeSolution $candidate */
            if ($candidate->getLanguage() === $language) {
                $solution = $candidate;
                break;
            }
        }
        if (null === $solution) {
            return new JsonResponse(['error' => sprintf('Aucune solution "%s" pour ce défi.', $language)], Response::HTTP_NOT_FOUND);
        }

        $refereeCode = $challenge->getRefereeCode();
        $refereeLanguage = $challenge->getRefereeLanguage();
        if (null === $refereeCode || null === $refereeLanguage) {
            return new JsonResponse(['error' => 'Ce défi n\'a pas de referee configuré.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $results = [];
        foreach (array_values($challenge->getTests()->toArray()) as $i => $test) {
            /** @var ChallengeTest $test */
            $result = $runner->play($language, $solution->getCode(), (string) $test->getStdin(), $refereeLanguage, $refereeCode);
            $results[] = [
                'index' => $i,
                'verdict' => $result['verdict'],
                'score' => max(0, min(100, $result['score'])),
                'playerStderr' => $result['playerStderr'],
                'error' => $result['error'],
            ];
        }

        $testsPassed = count(array_filter($results, static fn (array $r): bool => 'passed' === $r['verdict']));
        $testsTotal = count($results);

        return new JsonResponse([
            'language' => $language,
            'verdict' => ($testsTotal > 0 && $testsPassed === $testsTotal) ? 'passed' : 'failed',
            'testsPassed' => $testsPassed,
            'testsTotal' => $testsTotal,
            'results' => $results,
        ]);
    }

    private function findChallenge(string $slug, EntityManagerInterface $em): Challenge
    {
        $challenge = $em->getRepository(Challenge::class)->findOneBy(['slug' => $slug]);
        if (null === $challenge) {
            throw $this->createNotFoundException(sprintf('Défi "%s" introuvable.', $slug));
        }

        return $challenge;
    }
}
