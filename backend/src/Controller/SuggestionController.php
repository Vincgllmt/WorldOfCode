<?php

namespace App\Controller;

use App\Entity\User;
use App\Service\SuggestionService;
use App\Mapper\UserMapper;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route("/api/suggestions")]
#[OA\Tag(name: "Suggestions")]
final class SuggestionController extends AbstractController
{
    public function __construct(
        private SuggestionService $suggestionService,
        private UserMapper $userMapper,
    ) {}

    #[Route("/users", name: "suggestions_users", methods: ["GET"])]
    #[OA\Get(
        summary: "Utilisateurs suggeres pour l'utilisateur connecte",
        parameters: [
            new OA\Parameter(name: "limit", in: "query", required: false, description: "Nombre max de suggestions", schema: new OA\Schema(type: "integer", default: 5)),
            new OA\Parameter(name: "offset", in: "query", required: false, description: "Offset pour la pagination", schema: new OA\Schema(type: "integer", default: 0)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: "Liste des utilisateurs suggeres avec preferences en commun",
                content: new OA\JsonContent(
                    type: "array",
                    items: new OA\Items(
                        properties: [
                            new OA\Property(property: "id", type: "integer"),
                            new OA\Property(property: "username", type: "string"),
                            new OA\Property(property: "firstname", type: "string", nullable: true),
                            new OA\Property(property: "lastname", type: "string", nullable: true),
                            new OA\Property(property: "avatarUrl", type: "string", nullable: true),
                            new OA\Property(property: "bio", type: "string", nullable: true),
                            new OA\Property(property: "location", type: "string", nullable: true),
                            new OA\Property(property: "score", type: "number"),
                            new OA\Property(property: "sharedSkills", type: "array", items: new OA\Items(type: "string")),
                            new OA\Property(property: "sharedGroups", type: "array", items: new OA\Items(type: "string")),
                            new OA\Property(property: "mutualFollowsCount", type: "integer"),
                        ],
                        type: "object"
                    )
                )
            ),
        ]
    )]
    public function suggestedUsers(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted("IS_AUTHENTICATED_FULLY");

        /** @var User $user */
        $user = $this->getUser();
        $limit = min($request->query->getInt("limit", 5), 20);
        $offset = min($request->query->getInt("offset", 0), 100);

        $suggestions = $this->suggestionService->getSuggestedUsers($user, $limit, $offset);

        $data = array_map(fn(array $item) => [
            "id" => $item["user"]->getId(),
            "username" => $item["user"]->getUsername(),
            "firstname" => $item["user"]->getFirstname(),
            "lastname" => $item["user"]->getLastname(),
            "avatarUrl" => $item["user"]->getAvatarUrl(),
            "bio" => $item["user"]->getBio(),
            "location" => $item["user"]->getLocation(),
            "score" => $item["score"],
            "sharedSkills" => $item["sharedSkills"],
            "sharedGroups" => $item["sharedGroups"],
            "mutualFollowsCount" => $item["mutualFollowsCount"],
        ], $suggestions);

        return $this->json($data);
    }
}
