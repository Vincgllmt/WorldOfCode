<?php

namespace App\Controller;

use App\Entity\Report;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use App\Mapper\ReportMapper;
use App\Dto\ReportResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;

#[Route('/api/report')]
#[OA\Tag(name: 'Report')]
class ReportController extends AbstractController
{
    public function __construct(
        private PostRepository $postRepo,
        private ReportRepository $reportRepo,
        private ReportMapper $mapper
    ) {}

    #[Route('/post/{id}', name: 'report_post', methods: ['POST'])]
    #[OA\Post(
        summary: 'Signaler un post',
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'reason', type: 'string', example: 'Spam / contenu inapproprié')
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 201, description: 'Signalement enregistré'),
            new OA\Response(response: 400, description: 'Déjà signalé'),
            new OA\Response(response: 404, description: 'Post non trouvé')
        ]
    )]
    public function report(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $post = $this->postRepo->find($id);
        if (!$post) {
            return $this->json(['error' => 'Post not found'], 404);
        }

        $user = $this->getUser();
        $existing = $this->reportRepo->findOneBy(['post' => $post, 'user' => $user]);
        if ($existing) {
            return $this->json(['error' => 'Already reported'], 400);
        }

        $data = json_decode($request->getContent(), true);
        $reason = $data['reason'] ?? null;

        $report = new Report();
        $report->setUser($user);
        $report->setPost($post);
        $report->setReason($reason);

        $this->reportRepo->save($report);

        return $this->json(['success' => true, 'message' => 'Post reported'], 201);
    }

    #[Route('/post/all', name: 'report_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste tous les signalements (admin uniquement)',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des signalements',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: ReportResponse::class))
                )
            ),
            new OA\Response(response: 403, description: 'Accès interdit')
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $reports = $this->reportRepo->findAll();
        $data = array_map([$this->mapper, 'toDto'], $reports);

        return $this->json($data);
    }
}
