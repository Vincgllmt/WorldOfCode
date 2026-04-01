<?php

namespace App\Controller;

use App\Dto\AdminPostListItemDto;
use App\Repository\PostRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
        summary: "Liste enrichie des posts pour l'administration",
        responses: [
            new OA\Response(response: 200, description: 'Liste des posts avec métriques'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $rows = $this->postRepo->findAllWithCounts();

        $dtos = array_map(function ($row) {
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
        }, $rows);

        return $this->json($dtos);
    }
}
