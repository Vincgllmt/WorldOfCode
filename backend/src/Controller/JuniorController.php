<?php

namespace App\Controller;

use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Repository\MentoringRatingRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentoringSessionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Junior')]
class JuniorController extends AbstractController
{
    public function __construct(
        private MentoringSessionRepository $sessionRepo,
        private MentoringRequestRepository $requestRepo,
        private MentoringRatingRepository $ratingRepo,
    ) {}

    #[Route('/api/mentoring/junior/stats', name: 'junior_stats', methods: ['GET'])]
    #[OA\Get(summary: 'Statistiques du junior connecté', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function stats(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $sessions = $this->sessionRepo->findBy(['junior' => $user]);

        $activeSessions = array_filter($sessions, fn($s) => in_array(
            $s->getStatus(),
            [MentoringSessionStatus::SCHEDULED, MentoringSessionStatus::IN_PROGRESS],
            true
        ));
        $completedSessions = array_filter($sessions, fn($s) => $s->getStatus() === MentoringSessionStatus::COMPLETED);

        $mentorIds = array_unique(array_map(fn($s) => $s->getMentor()->getId(), $sessions));

        $ratingsReceived = array_filter(
            $this->ratingRepo->findBy(['ratee' => $user]),
            fn($r) => $r->getScore() !== null && $r->isVisible()
        );
        $avgRating = count($ratingsReceived) > 0
            ? array_sum(array_map(fn($r) => $r->getScore(), $ratingsReceived)) / count($ratingsReceived)
            : null;

        $totalRequests = count($this->requestRepo->findBy(['junior' => $user]));

        return $this->json([
            'totalSessions'     => count($sessions),
            'activeSessions'    => count($activeSessions),
            'completedSessions' => count($completedSessions),
            'totalMentors'      => count($mentorIds),
            'totalRequests'     => $totalRequests,
            'averageRating'     => $avgRating !== null ? round($avgRating, 2) : null,
        ]);
    }
}
