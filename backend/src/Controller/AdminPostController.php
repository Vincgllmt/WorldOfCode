<?php

namespace App\Controller;

use App\Dto\AdminPostDetailDto;
use App\Dto\AdminPostListItemDto;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminPostController extends AbstractController
{
    public function __construct(
        private PostRepository $postRepo,
        private ReportRepository $reportRepo,
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

    #[Route('/posts/{id}', name: 'admin_post_detail', methods: ['GET'])]
    #[OA\Get(
        summary: "Détail complet d'un post pour l'administration",
        responses: [
            new OA\Response(response: 200, description: 'Détail du post'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Post non trouvé'),
        ]
    )]
    public function detail(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $post = $this->postRepo->find($id);
        if (!$post) {
            throw new NotFoundHttpException('Post non trouvé');
        }

        $author = $post->getAuthor();

        $comments = $post->getComments()->toArray();
        usort($comments, fn($a, $b) => $b->getCreatedAt() <=> $a->getCreatedAt());
        $lastComments = array_map(fn($c) => [
            'id'             => $c->getId(),
            'content'        => $c->getContent(),
            'authorUsername' => $c->getAuthor()->getUsername(),
            'createdAt'      => $c->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], array_slice($comments, 0, 5));

        $reports = $this->reportRepo->findBy(['post' => $post], ['createdAt' => 'DESC']);
        $reportDtos = array_map(fn($r) => [
            'id'                 => $r->getId(),
            'reason'             => $r->getReason(),
            'status'             => $r->getStatus()->value,
            'reportedByUsername' => $r->getUser()->getUsername(),
            'createdAt'          => $r->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], $reports);

        $sharedFrom = $post->getSharedFrom();
        $sharedExcerpt = null;
        if ($sharedFrom?->getContent()) {
            $c = $sharedFrom->getContent();
            $sharedExcerpt = mb_strlen($c) > 80 ? mb_substr($c, 0, 80) . '…' : $c;
        }

        $content = $post->getContent();
        $dto = new AdminPostDetailDto(
            id: $post->getId(),
            content: $content,
            imageUrl: $post->getImageUrl(),
            createdAt: $post->getCreatedAt()->format(\DateTimeInterface::ATOM),
            authorId: $author->getId(),
            authorUsername: $author->getUsername(),
            authorAvatarUrl: $author->getAvatarUrl(),
            authorEmail: $author->getEmail(),
            techGroupName: $post->getTechGroup()?->getName(),
            likesCount: $post->getLikes()->count(),
            commentsCount: $post->getComments()->count(),
            reportsCount: count($reports),
            sharedFromId: $sharedFrom?->getId(),
            sharedFromExcerpt: $sharedExcerpt,
            sharedFromAuthorUsername: $sharedFrom?->getAuthor()->getUsername(),
            lastComments: $lastComments,
            reports: $reportDtos,
        );

        return $this->json($dto);
    }
}
