<?php

namespace App\Controller;

use App\Dto\TechWatchItemResponse;
use App\Entity\TechWatchSource;
use App\Repository\TechGroupRepository;
use App\Repository\TechWatchSourceRepository;
use App\Repository\TechWatchItemRepository;
use App\Mapper\TechWatchSourceMapper;
use App\Mapper\TechWatchItemMapper;
use App\Service\TechWatchAutoDetector;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'TechWatch')]
class TechWatchController extends AbstractController
{
    public function __construct(
        private TechGroupRepository $groupRepo,
        private TechWatchSourceRepository $sourceRepo,
        private TechWatchItemRepository $itemRepo,
        private TechWatchSourceMapper $sourceMapper,
        private TechWatchItemMapper $itemMapper,
        private TechWatchAutoDetector $autoDetector,
    ) {}

    #[Route('/api/tech-watch/feed', name: 'tech_watch_feed', methods: ['GET'])]
    #[OA\Get(
        summary: 'Fil d\'actualités de l\'utilisateur',
        description: 'Retourne les articles de veille tech agrégés de tous les groupes rejoints par l\'utilisateur connecté, triés par date de publication décroissante.',
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', required: false, description: 'Numéro de page (défaut: 1)', schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', required: false, description: 'Nombre d\'articles par page (défaut: 20, max: 50)', schema: new OA\Schema(type: 'integer', default: 20)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste paginée des articles de veille tech',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'items', type: 'array', items: new OA\Items(ref: TechWatchItemResponse::class)),
                        new OA\Property(property: 'totalItems', type: 'integer', example: 42),
                        new OA\Property(property: 'page', type: 'integer', example: 1),
                        new OA\Property(property: 'limit', type: 'integer', example: 20),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function getFeed(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->getUser();
        $groupIds = $user->getJoinedGroups()->map(fn($g) => $g->getId())->toArray();

        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(50, max(1, $request->query->getInt('limit', 20)));

        $result = $this->itemRepo->findByMultipleGroupsPaginated($groupIds, $page, $limit);
        $data = array_map([$this->itemMapper, 'toDto'], $result['items']);

        return $this->json([
            'items' => $data,
            'totalItems' => $result['totalItems'],
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/api/group/{groupId}/tech-watch', name: 'tech_watch_items', methods: ['GET'])]
    #[OA\Get(summary: 'Liste les articles de veille tech d\'un groupe')]
    public function getItems(int $groupId, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $group = $this->groupRepo->find($groupId);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(50, max(1, $request->query->getInt('limit', 20)));

        $result = $this->itemRepo->findByTechGroupPaginated($groupId, $page, $limit);
        $data = array_map([$this->itemMapper, 'toDto'], $result['items']);

        return $this->json([
            'items' => $data,
            'totalItems' => $result['totalItems'],
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/api/group/{groupId}/tech-watch/sources', name: 'tech_watch_sources', methods: ['GET'])]
    #[OA\Get(summary: 'Liste les sources RSS d\'un groupe')]
    public function getSources(int $groupId): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->groupRepo->find($groupId);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $sources = $this->sourceRepo->findByTechGroup($groupId);
        $data = array_map([$this->sourceMapper, 'toDto'], $sources);

        return $this->json($data);
    }

    #[Route('/api/group/{groupId}/tech-watch/sources', name: 'tech_watch_source_create', methods: ['POST'])]
    #[OA\Post(summary: 'Ajouter une source RSS à un groupe')]
    public function createSource(int $groupId, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->groupRepo->find($groupId);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!isset($data['feedUrl']) || !isset($data['name'])) {
            return $this->json(['error' => 'Missing feedUrl or name'], 400);
        }

        $source = new TechWatchSource();
        $source->setTechGroup($group);
        $source->setFeedUrl($data['feedUrl']);
        $source->setName($data['name']);
        $source->setIsAutoDetected(false);

        $this->sourceRepo->save($source, true);

        return $this->json($this->sourceMapper->toDto($source), 201);
    }

    #[Route('/api/group/{groupId}/tech-watch/sources/{sourceId}', name: 'tech_watch_source_delete', methods: ['DELETE'])]
    #[OA\Delete(summary: 'Supprimer une source RSS')]
    public function deleteSource(int $groupId, int $sourceId): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $source = $this->sourceRepo->find($sourceId);
        if (!$source || $source->getTechGroup()->getId() !== $groupId) {
            return $this->json(['error' => 'Source not found'], 404);
        }

        $this->sourceRepo->remove($source, true);

        return $this->json(['success' => true]);
    }

    #[Route('/api/group/{groupId}/tech-watch/auto-detect', name: 'tech_watch_auto_detect', methods: ['POST'])]
    #[OA\Post(summary: 'Lancer l\'auto-détection des sources RSS')]
    public function autoDetect(int $groupId): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->groupRepo->find($groupId);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $created = $this->autoDetector->detectAndCreateSources($group);
        $data = array_map([$this->sourceMapper, 'toDto'], $created);

        return $this->json([
            'message' => sprintf('%d source(s) auto-detected', count($created)),
            'sources' => $data,
        ]);
    }
}
