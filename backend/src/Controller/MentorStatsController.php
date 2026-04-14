<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\MentorProfileRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/mentor/stats')]
#[OA\Tag(name: 'MentorStats')]
class MentorStatsController extends AbstractController
{
    public function __construct(
        private MentorProfileRepository $mentorProfileRepo,
    ) {}

    #[Route('', name: 'mentor_stats_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Récupère les stats du mentor authentifié',
        responses: [
            new OA\Response(response: 200, description: 'Stats retournées'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Pas de profil mentor'),
            new OA\Response(response: 404, description: 'Profil introuvable'),
        ]
    )]
    public function getStats(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();

        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        if (!$profile) {
            return $this->json(['error' => 'Profil mentor non trouvé.'], 404);
        }

        return $this->json($this->mentorProfileRepo->getStats($profile));
    }
}
