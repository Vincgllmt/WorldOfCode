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

    #[Route('/posts', name: 'admin_reports_grouped_by_post', methods: ['GET'])]
    #[OA\Get(
        summary: 'Reports groupés par post (un item = un post signalé)',
        parameters: [
            new OA\Parameter(name: 'page',      in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit',     in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'sortField', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sortDir',   in: 'query', schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Posts signalés avec compteurs agrégés'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function listGroupedByPost(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $page      = max(1, (int) $request->query->get('page', 1));
        $limit     = min(100, max(1, (int) $request->query->get('limit', 20)));
        $sortField = $request->query->get('sortField', 'latestReportAt');
        $sortDir   = $request->query->get('sortDir', 'DESC');

        $result = $this->reportRepo->findGroupedByPost(
            page: $page,
            limit: $limit,
            sortField: $sortField,
            sortDir: $sortDir,
        );

        return $this->json([
            'items' => $result['items'],
            'total' => $result['total'],
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('', name: 'admin_reports_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste paginée des reports pour la modération admin',
        parameters: [
            new OA\Parameter(name: 'page',      in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit',     in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'status',    in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'reason',    in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'dateFrom',  in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'dateTo',    in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sortField',   in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sortDir',     in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'claimedByMe', in: 'query', schema: new OA\Schema(type: 'boolean')),
            new OA\Parameter(name: 'postId',      in: 'query', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste paginée des reports'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $page      = max(1, (int) $request->query->get('page', 1));
        $limit     = min(100, max(1, (int) $request->query->get('limit', 20)));
        $status    = $request->query->get('status') ?: null;
        $reason    = $request->query->get('reason') ?: null;
        $dateFrom  = $request->query->get('dateFrom') ?: null;
        $dateTo    = $request->query->get('dateTo') ?: null;
        $sortField   = $request->query->get('sortField', 'createdAt');
        $sortDir     = $request->query->get('sortDir', 'DESC');
        $claimedByMe = filter_var($request->query->get('claimedByMe', false), FILTER_VALIDATE_BOOLEAN);
        $postId      = $request->query->get('postId') ? (int) $request->query->get('postId') : null;

        $result = $this->reportRepo->findPaginatedWithFilters(
            page: $page,
            limit: $limit,
            status: $status,
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            reason: $reason,
            sortField: $sortField,
            sortDir: $sortDir,
            claimedByUser: $claimedByMe ? $this->getUser() : null,
            postId: $postId,
        );

        $dtos = array_map([$this->mapper, 'toDto'], $result['items']);

        return $this->json([
            'items' => $dtos,
            'total' => $result['total'],
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/posts/{postId}/claim', name: 'admin_report_claim_by_post', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Prendre en charge tous les reports PENDING d\'un post',
        responses: [
            new OA\Response(response: 200, description: 'Reports pris en charge'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Aucun report PENDING pour ce post'),
        ]
    )]
    public function claimByPost(int $postId): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $reports = $this->reportRepo->findPendingByPostId($postId);

        if (empty($reports)) {
            return $this->json(['error' => 'Aucun report PENDING pour ce post'], 404);
        }

        $currentUser = $this->getUser();
        $now = new \DateTime();

        foreach ($reports as $report) {
            $report->setStatus(ReportStatus::IN_PROGRESS);
            $report->setClaimedBy($currentUser);
            $report->setClaimedAt($now);
            $this->reportRepo->save($report, flush: false);
        }
        $this->reportRepo->getEntityManager()->flush();

        return $this->json(['claimed' => count($reports)]);
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

            // Récupérer tous les reports du même post AVANT suppression
            // (après, post_id sera NULL via ON DELETE SET NULL)
            $siblingReports = $post
                ? $this->reportRepo->findByPostId($post->getId())
                : [];

            if ($post) {
                $this->postRepo->remove($post, flush: true);
                $this->reportRepo->getEntityManager()->refresh($report);
            }

            $now = new \DateTime();
            $allReports = array_unique(array_merge([$report], $siblingReports), SORT_REGULAR);

            foreach ($allReports as $r) {
                if (in_array($r->getStatus(), [ReportStatus::RESOLVED, ReportStatus::REJECTED], true)) {
                    continue;
                }
                $r->setStatus(ReportStatus::RESOLVED);
                $r->setResolvedBy($currentUser);
                $r->setResolvedAt($now);
                if ($resolutionNote) {
                    $r->setResolutionNote($resolutionNote);
                }
                $this->reportRepo->save($r, flush: false);
            }
            $this->reportRepo->getEntityManager()->flush();
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
