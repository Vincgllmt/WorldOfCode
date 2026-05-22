<?php

namespace App\Controller;

use App\Repository\UserRepository;
use App\Repository\TechGroupRepository;
use App\Service\Elasticsearch\SearchService;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api')]
#[OA\Tag(name: 'Search')]
final class SearchController extends AbstractController
{
    private LoggerInterface $logger;

    public function __construct(
        private UserRepository $userRepo,
        private TechGroupRepository $groupRepo,
        private SearchService $searchService,
        ?LoggerInterface $logger = null,
    ) {
        $this->logger = $logger ?? new NullLogger();
    }

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
                        new OA\Property(
                            property: "posts",
                            type: "array",
                            items: new OA\Items(
                                properties: [
                                    new OA\Property(property: "id", type: "integer"),
                                    new OA\Property(property: "authorId", type: "integer", nullable: true),
                                    new OA\Property(property: "authorUsername", type: "string", nullable: true),
                                    new OA\Property(property: "snippet", type: "string"),
                                    new OA\Property(property: "createdAt", type: "string", nullable: true),
                                    new OA\Property(property: "score", type: "number"),
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
            return $this->json(['users' => [], 'groups' => [], 'posts' => []]);
        }

        $limit = min($request->query->getInt('limit', 5), 50);

        return $this->json([
            'users'  => $this->searchUsers($q, $limit),
            'groups' => $this->searchGroups($q, $limit),
            'posts'  => $this->searchPosts($q, $limit),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function searchUsers(string $q, int $limit): array
    {
        try {
            return $this->searchService->searchUsers($q, $limit);
        } catch (\Throwable $e) {
            $this->logger->warning('Recherche Elasticsearch users indisponible, fallback SQL.', [
                'query' => $q,
                'error' => $e->getMessage(),
            ]);
            return array_map(fn($u) => [
                'id'        => $u->getId(),
                'username'  => $u->getUsername(),
                'firstname' => $u->getFirstname(),
                'lastname'  => $u->getLastname(),
                'avatarUrl' => $u->getAvatarUrl(),
                'score'     => 0.0,
            ], $this->userRepo->searchByQuery($q, $limit));
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function searchGroups(string $q, int $limit): array
    {
        try {
            return $this->searchService->searchGroups($q, $limit);
        } catch (\Throwable $e) {
            $this->logger->warning('Recherche Elasticsearch groups indisponible, fallback SQL.', [
                'query' => $q,
                'error' => $e->getMessage(),
            ]);
            return array_map(fn($g) => [
                'id'          => $g->getId(),
                'name'        => $g->getName(),
                'description' => null,
                'score'       => 0.0,
            ], $this->groupRepo->searchByQuery($q, $limit));
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function searchPosts(string $q, int $limit): array
    {
        try {
            return $this->searchService->searchPosts($q, $limit);
        } catch (\Throwable $e) {
            $this->logger->warning('Recherche Elasticsearch posts indisponible, posts ignorés.', [
                'query' => $q,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
