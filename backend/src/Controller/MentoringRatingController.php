<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\MentoringRatingRepository;
use App\Repository\MentoringSessionRepository;
use App\Service\Mentoring\MentoringRatingService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentoringRating')]
class MentoringRatingController extends AbstractController
{
    public function __construct(
        private MentoringSessionRepository $sessionRepo,
        private MentoringRatingRepository $ratingRepo,
        private MentoringRatingService $ratingService,
    ) {}

    #[Route('/api/mentoring/sessions/{id}/rate', name: 'session_rate', methods: ['POST'])]
    #[OA\Post(
        summary: 'Soumettre sa notation pour une session',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['score'],
                properties: [
                    new OA\Property(property: 'score', type: 'integer', minimum: 1, maximum: 5),
                    new OA\Property(property: 'comment', type: 'string', nullable: true, maxLength: 500),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Notation soumise'),
            new OA\Response(response: 404, description: 'Session non trouvée'),
            new OA\Response(response: 409, description: 'Déjà soumis'),
            new OA\Response(response: 422, description: 'Score invalide ou deadline expirée'),
        ]
    )]
    public function submitRating(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }

        $isParticipant = $session->getJunior() === $user || $session->getMentor()->getUser() === $user;
        if (!$isParticipant) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $score = isset($data['score']) ? (int) $data['score'] : 0;
        if ($score < 1 || $score > 5) {
            return $this->json(['error' => 'Le score doit être entre 1 et 5.'], 422);
        }

        try {
            $this->ratingService->submit($session, $user, $score, $data['comment'] ?? null);
        } catch (\LogicException $e) {
            return match ($e->getMessage()) {
                'ALREADY_SUBMITTED' => $this->json(
                    ['error' => 'Vous avez déjà soumis votre notation.', 'code' => 'RATING_ALREADY_SUBMITTED'],
                    409
                ),
                default => $this->json(['error' => 'La période de notation (48h) est expirée.'], 422),
            };
        }

        return $this->json(['message' => 'Votre note a été enregistrée. Elle sera visible quand votre partenaire aura également noté.']);
    }

    #[Route('/api/mentoring/sessions/{id}/ratings', name: 'session_ratings', methods: ['GET'])]
    #[OA\Get(
        summary: 'Récupère les notations d\'une session (logique aveugle)',
        responses: [
            new OA\Response(response: 200, description: 'Ratings ou statut pending'),
            new OA\Response(response: 403, description: 'Non participant'),
            new OA\Response(response: 404, description: 'Session non trouvée'),
        ]
    )]
    public function getRatings(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }

        $isParticipant = $session->getJunior() === $user || $session->getMentor()->getUser() === $user;
        if (!$isParticipant) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        $ratings = $this->ratingRepo->findBy(['session' => $session]);
        $submitted = array_filter($ratings, fn($r) => $r->getSubmittedAt() !== null);

        // Logique aveugle : ne révéler les scores que si les 2 ont soumis
        if (count($submitted) < 2) {
            return $this->json([
                'status'    => 'pending',
                'submitted' => count($submitted),
                'total'     => 2,
            ]);
        }

        return $this->json(array_map(fn($r) => [
            'id'          => $r->getId(),
            'score'       => $r->isVisible() ? $r->getScore() : null,
            'comment'     => $r->isVisible() ? $r->getComment() : null,
            'isVisible'   => $r->isVisible(),
            'submittedAt' => $r->getSubmittedAt()?->format('c'),
            'rater'       => ['id' => $r->getRater()->getId(), 'username' => $r->getRater()->getUsername()],
            'ratee'       => ['id' => $r->getRatee()->getId(), 'username' => $r->getRatee()->getUsername()],
        ], $ratings));
    }
}
