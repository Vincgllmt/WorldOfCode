<?php

namespace App\Controller;

use App\Repository\MentorProfileRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentorProfile')]
class PublicMentorProfileController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private MentorProfileRepository $mentorProfileRepo,
    ) {}

    #[Route('/api/users/{id}/mentor-profile', name: 'user_mentor_profile_public', methods: ['GET'])]
    #[OA\Get(
        summary: "Profil mentor public d'un utilisateur",
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Profil mentor retourné'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: "Utilisateur ou profil mentor introuvable"),
        ]
    )]
    public function getPublicProfile(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'Utilisateur non trouvé.'], 404);
        }

        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        if (!$profile) {
            return $this->json(['error' => "Cet utilisateur n'est pas mentor."], 404);
        }

        return $this->json([
            'id'               => $profile->getId(),
            'isAvailable'      => $profile->isAvailable(),
            'teachingStyle'    => $profile->getTeachingStyle()?->value,
            'maxActiveMentees' => $profile->getMaxActiveMentees(),
            'specialties'      => array_map(
                fn($s) => ['id' => $s->getId(), 'name' => $s->getName()],
                $profile->getSpecialties()->toArray()
            ),
            'averageRating'    => $profile->getAverageRating(),
            'reliabilityRate'  => $profile->getReliabilityRate(),
            'totalSessions'    => $profile->getTotalSessions(),
            'createdAt'        => $profile->getCreatedAt()->format('c'),
        ]);
    }
}
