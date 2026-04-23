<?php

namespace App\Controller;

use App\Dto\FeedItemResponse;
use App\Entity\User;
use App\Service\FeedService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;

#[Route('/api/feed')]
#[OA\Tag(name: 'Feed')]
class FeedController extends AbstractController
{
    public function __construct(
        private FeedService $feedService,
    ) {}

    #[Route('', name: 'feed_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Feed scoré : posts + articles RSS des groupes et follows',
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 20)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Feed paginé',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'items',
                            type: 'array',
                            items: new OA\Items(ref: new Model(type: FeedItemResponse::class))
                        ),
                        new OA\Property(property: 'page', type: 'integer', example: 1),
                        new OA\Property(property: 'limit', type: 'integer', example: 20),
                        new OA\Property(property: 'totalItems', type: 'integer', example: 120),
                        new OA\Property(property: 'totalPages', type: 'integer', example: 6),
                    ],
                    type: 'object'
                )
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function list(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));

        $feed = $this->feedService->getFeed($user, $page, $limit);

        return $this->json($feed);
    }
}
