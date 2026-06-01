<?php

namespace App\Controller;

use App\Repository\MentorProfileRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Users')]
class UserSearchController extends AbstractController
{
    public function __construct(
        private MentorProfileRepository $mentorProfileRepo,
    ) {}

    #[Route('/api/users', name: 'users_search', methods: ['GET'])]
    #[OA\Get(
        summary: 'Rechercher des utilisateurs',
        parameters: [
            new OA\Parameter(name: 'q', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'isMentor', in: 'query', schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function search(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $query = (string) $request->query->get('q', '');
        $isMentor = $request->query->getBoolean('isMentor', false);

        if ($isMentor) {
            $profiles = $this->mentorProfileRepo->searchMentors($query, 10);
            return $this->json(array_map(fn($p) => [
                'id'          => $p->getUser()->getId(),
                'username'    => $p->getUser()->getUsername(),
                'mentorId'    => $p->getId(),
                'specialties' => array_map(
                    fn($s) => $s->getName(),
                    $p->getSpecialties()->toArray()
                ),
                'isAvailable' => $p->isAvailable(),
            ], $profiles));
        }

        return $this->json([]);
    }
}
