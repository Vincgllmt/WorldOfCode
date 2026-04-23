<?php

namespace App\Controller;

use App\Dto\AdminPostListItemDto;
use App\Repository\PostRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminPostController extends AbstractController
{
    public function __construct(
        private PostRepository $postRepo,
    ) {}

    #[Route('/posts', name: 'admin_posts_list', methods: ['GET'])]
    #[OA\Get(
        summary: "Liste paginée des posts pour l'administration",
        parameters: [
            new OA\Parameter(name: 'page',       in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit',      in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'search',     in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'minReports', in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'sortField',  in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sortDir',    in: 'query', schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste paginée des posts avec métriques'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $page       = max(1, (int) $request->query->get('page', 1));
        $limit      = min(100, max(1, (int) $request->query->get('limit', 20)));
        $search     = $request->query->get('search') ?: null;
        $minReports = max(0, (int) $request->query->get('minReports', 0));
        $sortField  = $request->query->get('sortField', 'createdAt');
        $sortDir    = $request->query->get('sortDir', 'DESC');

        $result = $this->postRepo->findPaginatedWithCounts(
            page: $page,
            limit: $limit,
            search: $search,
            minReports: $minReports,
            sortField: $sortField,
            sortDir: $sortDir,
        );

        $items = array_map(function ($row) {
            $content = $row['content'] ?? '';
            $excerpt = mb_strlen($content) > 100
                ? mb_substr($content, 0, 100) . '…'
                : ($content ?: null);

            return new AdminPostListItemDto(
                id: $row['id'],
                excerpt: $excerpt,
                authorUsername: $row['authorUsername'],
                techGroupName: $row['techGroupName'] ?? null,
                likesCount: (int) $row['likesCount'],
                commentsCount: (int) $row['commentsCount'],
                reportsCount: (int) $row['reportsCount'],
                createdAt: $row['createdAt'] instanceof \DateTimeInterface
                    ? $row['createdAt']->format(\DateTimeInterface::ATOM)
                    : (string) $row['createdAt'],
            );
        }, $result['items']);

        return $this->json([
            'items' => $items,
            'total' => $result['total'],
            'page'  => $page,
            'limit' => $limit,
        ]);
    }
}
