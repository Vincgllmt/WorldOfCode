<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\FollowRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentorProfile')]
class MentorFollowersController extends AbstractController
{
    public function __construct(
        private FollowRepository $followRepo,
    ) {}

    #[Route('/api/mentor/followers', name: 'mentor_followers', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste des abonnés du mentor authentifié',
        responses: [
            new OA\Response(response: 200, description: 'Liste retournée'),
            new OA\Response(response: 403, description: 'Non autorisé'),
        ]
    )]
    public function getFollowers(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();

        $follows = $this->followRepo->findBy(['followed' => $user]);

        return $this->json(array_map(fn($f) => [
            'id'       => $f->getFollower()->getId(),
            'username' => $f->getFollower()->getUsername(),
        ], $follows));
    }
}
