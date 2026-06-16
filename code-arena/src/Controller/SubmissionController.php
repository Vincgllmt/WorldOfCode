<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Badge;
use App\Entity\Challenge;
use App\Entity\ChallengeTest;
use App\Entity\Submission;
use App\Entity\UserBadge;
use App\Security\ArenaUser;
use App\Service\PistonService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SubmissionController extends AbstractController
{
    public function __construct(private readonly PistonService $piston) {}

    #[Route('/api/arena/challenges/{slug}/submit', name: 'arena_submit', methods: ['POST'])]
    public function submit(string $slug, Request $request, EntityManagerInterface $em): JsonResponse
    {
        /** @var ArenaUser $user */
        $user = $this->getUser();

        $payload  = json_decode($request->getContent(), true);
        $language = is_array($payload) ? ($payload['language'] ?? null) : null;
        $code     = is_array($payload) ? ($payload['code']     ?? null) : null;

        if (!is_string($language) || '' === $language || !is_string($code) || '' === $code) {
            return new JsonResponse(['error' => 'Champs "language" et "code" requis.'], Response::HTTP_BAD_REQUEST);
        }

        $challenge = $em->getRepository(Challenge::class)->findOneBy(['slug' => $slug]);
        if (null === $challenge) {
            throw $this->createNotFoundException(sprintf('Défi "%s" introuvable.', $slug));
        }

        if (!in_array($language, $challenge->getLanguages(), true)) {
            return new JsonResponse(
                ['error' => sprintf('Langage "%s" non autorisé pour ce défi.', $language)],
                Response::HTTP_BAD_REQUEST,
            );
        }

        /** @var ChallengeTest[] $tests */
        $tests = $challenge->getTests()->toArray();

        // --- Exécution et validation ---
        $testsPassed = 0;
        $passedWeight = 0;
        $totalWeight = array_sum(array_map(static fn(ChallengeTest $t) => $t->getWeight(), $tests));

        foreach ($tests as $test) {
            $result = $this->piston->execute($language, $code, $test->getStdin());

            // Comparaison stricte après normalisation des fins de ligne
            $actual   = rtrim($result['stdout'], "\r\n");
            $expected = rtrim($test->getExpectedOutput(), "\r\n");

            if ($result['exitCode'] === 0 && $actual === $expected) {
                ++$testsPassed;
                $passedWeight += $test->getWeight();
            }
        }

        $totalTests = count($tests);
        $score      = $totalWeight > 0
            ? (int) round(($passedWeight / $totalWeight) * $challenge->getMaxScore())
            : 0;
        $status     = ($testsPassed === $totalTests && $totalTests > 0) ? 'passed' : 'failed';

        // --- Persistance de la soumission ---
        $submission = (new Submission())
            ->setChallenge($challenge)
            ->setUserId($user->getId())
            ->setLanguage($language)
            ->setCode($code)
            ->setStatus($status)
            ->setScore($score)
            ->setTestsPassed($testsPassed)
            ->setTestsTotal($totalTests);

        $em->persist($submission);

        // --- Attribution des badges ---
        $badgesAwarded = [];

        if ('passed' === $status) {
            $badgesAwarded = $this->awardBadges($em, $challenge, $user->getId(), $testsPassed, $totalTests);
        }

        $em->flush();

        return new JsonResponse([
            'submissionId'  => $submission->getId(),
            'status'        => $submission->getStatus(),
            'score'         => $submission->getScore(),
            'testsPassed'   => $submission->getTestsPassed(),
            'testsTotal'    => $submission->getTestsTotal(),
            'badgesAwarded' => $badgesAwarded,
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/arena/submissions/{id}', name: 'arena_submission_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function get(int $id, EntityManagerInterface $em): JsonResponse
    {
        $submission = $em->getRepository(Submission::class)->find($id);
        if (null === $submission) {
            throw $this->createNotFoundException(sprintf('Soumission "%d" introuvable.', $id));
        }

        /** @var ArenaUser $user */
        $user = $this->getUser();
        if ($submission->getUserId() !== $user->getId()) {
            return new JsonResponse(['error' => 'Accès interdit à cette soumission.'], Response::HTTP_FORBIDDEN);
        }

        return new JsonResponse([
            'id'           => $submission->getId(),
            'challengeSlug' => $submission->getChallenge()->getSlug(),
            'language'     => $submission->getLanguage(),
            'status'       => $submission->getStatus(),
            'score'        => $submission->getScore(),
            'testsPassed'  => $submission->getTestsPassed(),
            'testsTotal'   => $submission->getTestsTotal(),
            'createdAt'    => $submission->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }

    /**
     * Attribue les badges éligibles et retourne la liste des codes de badges octroyés.
     *
     * Règles :
     *  - "perfect"     : tous les tests passés (peut être attribué plusieurs fois si non déjà obtenu)
     *  - "first_solve" : premier utilisateur à passer tous les tests pour ce défi
     *
     * @return string[]
     */
    private function awardBadges(
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
            'userId'  => $userId,
            'badge'   => $badgeId,
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
