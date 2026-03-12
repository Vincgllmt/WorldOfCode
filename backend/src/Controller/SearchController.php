<?php

namespace App\Controller;

use App\Repository\UserRepository;
use App\Repository\TechGroupRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api')]
#[OA\Tag(name: 'Search')]
final class SearchController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private TechGroupRepository $groupRepo,
    ) {}

    #[Route('/search', name: 'search', methods: ['GET'])]
    #[OA\Get(
        summary: "Recherche unifiee utilisateurs et groupes",
        parameters: [
            new OA\Parameter(name: "q", in: "query", required: true, description: "Terme de recherche", schema: new OA\Schema(type: "string")),
            new OA\Parameter(name: "limit", in: "query", required: false, description: "Nombre max de resultats par type", schema: new OA\Schema(type: "integer", default: 5)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: "Resultats de recherche",
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: "users",
                            type: "array",
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: "id", type: "integer"),
                                    new OA\Property(property: "username", type: "string"),
                                    new OA\Property(property: "firstname", type: "string", nullable: true),
                                    new OA\Property(property: "lastname", type: "string", nullable: true),
                                    new OA\Property(property: "avatarUrl", type: "string", nullable: true),
                                ],
                                type: "object"
                            )
                        ),
                        new OA\Property(
                            property: "groups",
                            type: "array",
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: "id", type: "integer"),
                                    new OA\Property(property: "name", type: "string"),
                                ],
                                type: "object"
                            )
                        ),
                    ],
                    type: "object"
                )
            ),
        ]
    )]
    public function search(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $q = trim($request->query->getString('q', ''));
        if ($q === '') {
            return $this->json(['users' => [], 'groups' => []]);
        }

        $limit = min($request->query->getInt('limit', 5), 50);

        $users = $this->userRepo->searchByQuery($q, $limit);
        $groups = $this->groupRepo->searchByQuery($q, $limit);

        return $this->json([
            'users' => array_map(fn($u) => [
                'id' => $u->getId(),
                'username' => $u->getUsername(),
                'firstname' => $u->getFirstname(),
                'lastname' => $u->getLastname(),
                'avatarUrl' => $u->getAvatarUrl(),
            ], $users),
            'groups' => array_map(fn($g) => [
                'id' => $g->getId(),
                'name' => $g->getName(),
            ], $groups),
        ]);
    }
}
