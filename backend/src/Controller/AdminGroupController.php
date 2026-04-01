<?php
namespace App\Controller;

use App\Dto\AdminGroupListItemDto;
use App\Repository\TechGroupRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminGroupController extends AbstractController
{
    public function __construct(
        private TechGroupRepository $groupRepo,
    ) {}

    #[Route('/groups', name: 'admin_groups_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste enrichie des groupes pour l\'administration',
        responses: [
            new OA\Response(response: 200, description: 'Liste des groupes avec métriques'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $rows = $this->groupRepo->findAllWithCounts();

        $dtos = array_map(fn($row) => new AdminGroupListItemDto(
            id: $row['id'],
            name: $row['name'],
            description: $row['description'] ?? null,
            memberCount: (int) $row['memberCount'],
            postCount: (int) $row['postCount'],
            creatorUsername: $row['creatorUsername'] ?? null,
            createdAt: $row['createdAt'] instanceof \DateTimeInterface
                ? $row['createdAt']->format(\DateTimeInterface::ATOM)
                : (string) $row['createdAt'],
        ), $rows);

        return $this->json($dtos);
    }
}
