<?php

namespace App\Controller;

use App\Dto\AdminStatsResponse;
use App\Repository\ReportRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminStatsController extends AbstractController
{
    public function __construct(
        private ReportRepository $reportRepo,
    ) {}

    #[Route('/stats', name: 'admin_stats', methods: ['GET'])]
    #[OA\Get(
        summary: 'Statistiques globales pour le dashboard admin',
        responses: [
            new OA\Response(response: 200, description: 'Statistiques admin'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function stats(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        // TODO Epic 4.1: filter by status = PENDING once ReportStatus enum is added
        $pendingReportsCount = $this->reportRepo->count([]);

        return $this->json(new AdminStatsResponse(
            pendingReportsCount: $pendingReportsCount,
        ));
    }
}
