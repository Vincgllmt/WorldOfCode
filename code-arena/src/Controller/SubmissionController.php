<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Challenge;
use App\Entity\Submission;
use App\Security\ArenaUser;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SubmissionController extends AbstractController
{
    #[Route('/api/arena/challenges/{slug}/submit', name: 'arena_submit', methods: ['POST'])]
    public function submit(string $slug, Request $request, EntityManagerInterface $em): JsonResponse
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
            return new JsonResponse(
                ['error' => sprintf('Langage "%s" non autorisé pour ce défi.', $language)],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $submission = (new Submission())
            ->setChallenge($challenge)
            ->setUserId($user->getId())
            ->setLanguage($language)
            ->setCode($code)
            ->setStatus('pending')
            ->setTestsTotal($challenge->getTests()->count());

        $em->persist($submission);
        $em->flush();

        // STUB : l'exécution isolée (Piston), la validation par les cas de test,
        // le scoring et l'attribution des badges seront branchés une fois la
        // frontière avec le runner Piston tranchée. La soumission est pour l'instant
        // persistée au statut "pending".
        return new JsonResponse([
            'submissionId' => $submission->getId(),
            'status' => $submission->getStatus(),
            'score' => $submission->getScore(),
            'testsPassed' => $submission->getTestsPassed(),
            'testsTotal' => $submission->getTestsTotal(),
            'badgeAwarded' => false,
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
            'id' => $submission->getId(),
            'challengeSlug' => $submission->getChallenge()->getSlug(),
            'language' => $submission->getLanguage(),
            'status' => $submission->getStatus(),
            'score' => $submission->getScore(),
            'testsPassed' => $submission->getTestsPassed(),
            'testsTotal' => $submission->getTestsTotal(),
            'createdAt' => $submission->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }
}
