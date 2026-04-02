<?php

namespace App\Controller;

use App\Enum\ReportStatus;
use App\Mapper\AdminReportMapper;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin/reports')]
#[OA\Tag(name: 'Admin')]
final class AdminReportController extends AbstractController
{
    public function __construct(
        private ReportRepository $reportRepo,
        private PostRepository $postRepo,
        private AdminReportMapper $mapper,
    ) {}

    #[Route('', name: 'admin_reports_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste tous les reports pour la modération admin',
        responses: [
            new OA\Response(response: 200, description: 'Liste des reports'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $reports = $this->reportRepo->findBy([], ['createdAt' => 'DESC']);
        $dtos = array_map([$this->mapper, 'toDto'], $reports);

        return $this->json($dtos);
    }

    #[Route('/{id}/claim', name: 'admin_report_claim', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Prendre en charge un report (PENDING → IN_PROGRESS)',
        responses: [
            new OA\Response(response: 200, description: 'Report pris en charge'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Report non trouvé'),
            new OA\Response(response: 409, description: 'Report déjà pris en charge par un autre admin'),
        ]
    )]
    public function claim(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $report = $this->reportRepo->find($id);
        if (!$report) {
            throw new NotFoundHttpException('Report non trouvé');
        }

        if ($report->getStatus() === ReportStatus::IN_PROGRESS) {
            $claimedBy = $report->getClaimedBy();
            $currentUser = $this->getUser();
            if ($claimedBy && $claimedBy->getId() !== $currentUser->getId()) {
                return $this->json([
                    'error' => 'Report déjà pris en charge par ' . $claimedBy->getUsername(),
                ], 409);
            }
        }

        if ($report->getStatus() !== ReportStatus::PENDING) {
            return $this->json([
                'error' => 'Seuls les reports PENDING peuvent être claim. Statut actuel : ' . $report->getStatus()->value,
            ], 409);
        }

        $report->setStatus(ReportStatus::IN_PROGRESS);
        $report->setClaimedBy($this->getUser());
        $report->setClaimedAt(new \DateTime());
        $this->reportRepo->save($report);

        return $this->json($this->mapper->toDto($report));
    }

    #[Route('/{id}/resolve', name: 'admin_report_resolve', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Résoudre un report : supprime le post et marque RESOLVED',
        responses: [
            new OA\Response(response: 200, description: 'Report résolu, post supprimé'),
            new OA\Response(response: 403, description: "Accès interdit ou pas l'admin qui a claim"),
            new OA\Response(response: 404, description: 'Report non trouvé'),
        ]
    )]
    public function resolve(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $report = $this->reportRepo->find($id);
        if (!$report) {
            throw new NotFoundHttpException('Report non trouvé');
        }

        $currentUser = $this->getUser();
        if ($report->getClaimedBy()?->getId() !== $currentUser->getId()) {
            return $this->json(['error' => "Seul l'admin ayant claim ce report peut le résoudre"], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $resolutionNote = $data['resolutionNote'] ?? null;

        $em = $this->reportRepo->getEntityManager();
        $em->wrapInTransaction(function () use ($report, $currentUser, $resolutionNote) {
            $post = $report->getPost();
            if ($post) {
                $this->postRepo->remove($post, flush: true);
                $this->reportRepo->getEntityManager()->refresh($report);
            }

            $report->setStatus(ReportStatus::RESOLVED);
            $report->setResolvedBy($currentUser);
            $report->setResolvedAt(new \DateTime());
            if ($resolutionNote) {
                $report->setResolutionNote($resolutionNote);
            }
            $this->reportRepo->save($report);
        });

        return $this->json($this->mapper->toDto($report));
    }

    #[Route('/{id}/reject', name: 'admin_report_reject', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Rejeter un report (post conservé) avec note obligatoire',
        responses: [
            new OA\Response(response: 200, description: 'Report rejeté'),
            new OA\Response(response: 400, description: 'resolutionNote manquante'),
            new OA\Response(response: 403, description: "Accès interdit ou pas l'admin qui a claim"),
            new OA\Response(response: 404, description: 'Report non trouvé'),
        ]
    )]
    public function reject(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $report = $this->reportRepo->find($id);
        if (!$report) {
            throw new NotFoundHttpException('Report non trouvé');
        }

        $currentUser = $this->getUser();
        if ($report->getClaimedBy()?->getId() !== $currentUser->getId()) {
            return $this->json(['error' => "Seul l'admin ayant claim ce report peut le rejeter"], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $resolutionNote = trim($data['resolutionNote'] ?? '');
        if (!$resolutionNote) {
            return $this->json(['error' => 'resolutionNote est obligatoire pour rejeter un report'], 400);
        }

        $report->setStatus(ReportStatus::REJECTED);
        $report->setResolvedBy($currentUser);
        $report->setResolvedAt(new \DateTime());
        $report->setResolutionNote($resolutionNote);
        $this->reportRepo->save($report);

        return $this->json($this->mapper->toDto($report));
    }
}
