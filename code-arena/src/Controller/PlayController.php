<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Challenge;
use App\Entity\Submission;
use App\Security\ArenaUser;
use App\Service\GameRunner;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Joue un défi : exécute le code joueur + le referee (via Piston) et renvoie
 * le verdict, le score et le replay. Générique — aucune logique de jeu ici.
 */
final class PlayController extends AbstractController
{
    #[Route('/api/arena/challenges/{slug}/play', name: 'arena_play', methods: ['POST'])]
    public function play(string $slug, Request $request, EntityManagerInterface $em, GameRunner $runner): JsonResponse
    {
        /** @var ArenaUser $user */
        $user = $this->getUser();

        $payload = json_decode($request->getContent(), true);
        $language = is_array($payload) ? ($payload['language'] ?? null) : null;
        $code = is_array($payload) ? ($payload['code'] ?? null) : null;

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

        $refereeCode = $challenge->getRefereeCode();
        $refereeLanguage = $challenge->getRefereeLanguage();
        if (null === $refereeCode || null === $refereeLanguage) {
            return new JsonResponse(['error' => 'Ce défi n\'a pas de referee configuré.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Input du jeu = premier cas de test (stdin) ; vide si aucun.
        $firstTest = $challenge->getTests()->first();
        $input = $firstTest ? (string) $firstTest->getStdin() : '';

        $result = $runner->play($language, $code, $input, $refereeLanguage, $refereeCode);

        $status = in_array($result['verdict'], ['passed', 'failed'], true) ? $result['verdict'] : 'failed';

        $submission = (new Submission())
            ->setChallenge($challenge)
            ->setUserId($user->getId())
            ->setLanguage($language)
            ->setCode($code)
            ->setStatus($status)
            ->setScore($result['score'])
            ->setTestsTotal(1)
            ->setTestsPassed('passed' === $result['verdict'] ? 1 : 0);

        $em->persist($submission);
        $em->flush();

        return new JsonResponse([
            'submissionId' => $submission->getId(),
            'verdict' => $result['verdict'],
            'score' => $result['score'],
            'replay' => $result['replay'],
            'playerStderr' => $result['playerStderr'],
            'error' => $result['error'],
        ], Response::HTTP_CREATED);
    }
}
