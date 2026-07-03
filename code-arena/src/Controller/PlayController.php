<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Challenge;
use App\Entity\ChallengeTest;
use App\Entity\Submission;
use App\Security\ArenaUser;
use App\Service\BadgeAwarderInterface;
use App\Service\GameRunnerInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Joue un défi : exécute le code joueur + le referee (via Piston) et renvoie
 * le verdict, le score et un replay par cas. Générique — aucune logique de jeu ici.
 */
final class PlayController extends AbstractController
{
    /**
     * Soumission notée : exécute le code sur TOUS les cas de test du jeu.
     * Réussi seulement si tous les cas passent. Persiste la soumission + badges.
     * Renvoie un replay par cas pour rejouer l'ensemble dans la visualisation.
     */
    #[Route('/api/arena/challenges/{slug}/play', name: 'arena_play', methods: ['POST'])]
    public function play(string $slug, Request $request, EntityManagerInterface $em, GameRunnerInterface $runner, BadgeAwarderInterface $badgeAwarder): JsonResponse
    {
        /** @var ArenaUser $user */
        $user = $this->getUser();

        $payload = json_decode($request->getContent(), true);
        $language = is_array($payload) ? ($payload['language'] ?? null) : null;
        $code = is_array($payload) ? ($payload['code'] ?? null) : null;

        $challenge = $this->resolveChallenge($slug, $language, $code, $em);
        if ($challenge instanceof JsonResponse) {
            return $challenge;
        }
        \assert(is_string($language) && is_string($code));

        $referee = $this->referee($challenge);
        if ($referee instanceof JsonResponse) {
            return $referee;
        }

        /** @var ChallengeTest[] $tests */
        $tests = array_values($challenge->getTests()->toArray());
        $totalTests = count($tests);

        $results = $this->runCases($tests, array_keys($tests), $language, $code, $referee[0], $referee[1], $runner);
        $testsPassed = count(array_filter($results, static fn (array $r): bool => 'passed' === $r['verdict']));

        $status = ($totalTests > 0 && $testsPassed === $totalTests) ? 'passed' : 'failed';
        // Score proportionnel au nombre de cas réussis, à l'échelle de maxScore.
        $score = $totalTests > 0 ? (int) round($testsPassed / $totalTests * $challenge->getMaxScore()) : 0;

        $submission = (new Submission())
            ->setChallenge($challenge)
            ->setUserId($user->getId())
            ->setLanguage($language)
            ->setCode($code)
            ->setStatus($status)
            ->setScore($score)
            ->setTestsTotal($totalTests)
            ->setTestsPassed($testsPassed);

        $em->persist($submission);

        $badgesAwarded = [];
        if ('passed' === $status) {
            $badgesAwarded = $badgeAwarder->award($em, $challenge, $user->getId(), $testsPassed, $totalTests);
        }

        $em->flush();

        return new JsonResponse([
            'submissionId' => $submission->getId(),
            'verdict' => $status,
            'score' => $score,
            'testsPassed' => $testsPassed,
            'testsTotal' => $totalTests,
            'results' => $results,
            'badgesAwarded' => $badgesAwarded,
        ], Response::HTTP_CREATED);
    }

    /**
     * Essai NON noté (style « Run » LeetCode) : exécute le code sur un cas précis
     * (`testIndex`) ou sur tous les cas. Ne persiste rien, n'attribue aucun badge.
     */
    #[Route('/api/arena/challenges/{slug}/run-tests', name: 'arena_run_tests', methods: ['POST'])]
    public function runTests(string $slug, Request $request, EntityManagerInterface $em, GameRunnerInterface $runner): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        $language = is_array($payload) ? ($payload['language'] ?? null) : null;
        $code = is_array($payload) ? ($payload['code'] ?? null) : null;

        $challenge = $this->resolveChallenge($slug, $language, $code, $em);
        if ($challenge instanceof JsonResponse) {
            return $challenge;
        }
        \assert(is_string($language) && is_string($code));

        $referee = $this->referee($challenge);
        if ($referee instanceof JsonResponse) {
            return $referee;
        }

        /** @var ChallengeTest[] $tests */
        $tests = array_values($challenge->getTests()->toArray());

        // testIndex absent => tous les cas ; sinon le cas demandé seulement.
        $rawIndex = is_array($payload) ? ($payload['testIndex'] ?? null) : null;
        $indices = null === $rawIndex ? array_keys($tests) : [(int) $rawIndex];

        $results = $this->runCases($tests, $indices, $language, $code, $referee[0], $referee[1], $runner);

        return new JsonResponse(['results' => $results]);
    }

    /**
     * Exécute le code joueur + le referee sur les cas demandés (par index), dans l'ordre.
     *
     * @param ChallengeTest[] $tests
     * @param int[]           $indices
     *
     * @return list<array{index: int, verdict: string, score: int, replay: mixed, playerStderr: string, error: string|null}>
     */
    private function runCases(array $tests, array $indices, string $language, string $code, string $refereeLanguage, string $refereeCode, GameRunnerInterface $runner): array
    {
        $results = [];
        foreach ($indices as $i) {
            if (!isset($tests[$i])) {
                continue;
            }
            $result = $runner->play($language, $code, (string) $tests[$i]->getStdin(), $refereeLanguage, $refereeCode);
            $results[] = [
                'index' => $i,
                'verdict' => $result['verdict'],
                'score' => max(0, min(100, $result['score'])),
                'replay' => $result['replay'],
                'playerStderr' => $result['playerStderr'],
                'error' => $result['error'],
            ];
        }

        return $results;
    }

    /**
     * Valide langage/code et récupère le défi, ou renvoie une réponse d'erreur.
     */
    private function resolveChallenge(string $slug, mixed $language, mixed $code, EntityManagerInterface $em): Challenge|JsonResponse
    {
        if (!is_string($language) || '' === $language || !is_string($code) || '' === $code) {
            return new JsonResponse(['error' => 'Champs "language" et "code" requis.'], Response::HTTP_BAD_REQUEST);
        }

        $challenge = $em->getRepository(Challenge::class)->findOneBy(['slug' => $slug]);
        if (null === $challenge) {
            throw $this->createNotFoundException(sprintf('Défi "%s" introuvable.', $slug));
        }

        if (!in_array($language, $challenge->getLanguages(), true)) {
            return new JsonResponse(['error' => sprintf('Langage "%s" non autorisé pour ce défi.', $language)], Response::HTTP_BAD_REQUEST);
        }

        return $challenge;
    }

    /**
     * Renvoie [langage, code] du referee (même ordre que GameRunner::play),
     * ou une réponse d'erreur s'il manque.
     *
     * @return array{0: string, 1: string}|JsonResponse
     */
    private function referee(Challenge $challenge): array|JsonResponse
    {
        $refereeCode = $challenge->getRefereeCode();
        $refereeLanguage = $challenge->getRefereeLanguage();
        if (null === $refereeCode || null === $refereeLanguage) {
            return new JsonResponse(['error' => 'Ce défi n\'a pas de referee configuré.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return [$refereeLanguage, $refereeCode];
    }
}
