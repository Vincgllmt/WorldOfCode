<?php

namespace App\Controller;

use App\Repository\NotificationRepository;
use App\Mapper\NotificationMapper;
use App\Dto\NotificationResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/notifications')]
#[OA\Tag(name: 'Notification')]
class NotificationController extends AbstractController
{
    public function __construct(
        private NotificationRepository $repo,
        private NotificationMapper $mapper
    ) {}

    #[Route('', name: 'notification_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les notifications de l\'utilisateur connecté',
        description: 'Retourne les notifications paginées de l\'utilisateur authentifié, triées par date décroissante.',
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', required: false, description: 'Numéro de page (défaut: 1)', schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', required: false, description: 'Nombre par page (défaut: 20, max: 50)', schema: new OA\Schema(type: 'integer', default: 20)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste paginée des notifications',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'items', type: 'array', items: new OA\Items(ref: NotificationResponse::class)),
                        new OA\Property(property: 'page', type: 'integer', example: 1),
                        new OA\Property(property: 'limit', type: 'integer', example: 20),
                        new OA\Property(property: 'totalItems', type: 'integer', example: 42),
                        new OA\Property(property: 'totalPages', type: 'integer', example: 3),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function list(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $user = $this->getUser();

        $page = max((int) $request->query->get('page', 1), 1);
        $limit = min(max((int) $request->query->get('limit', 20), 1), 50);

        $paginated = $this->repo->findPaginatedByRecipient($user, $page, $limit);
        $items = array_map([$this->mapper, 'toDto'], $paginated['items']);

        return $this->json([
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'totalItems' => $paginated['totalItems'],
            'totalPages' => (int) ceil($paginated['totalItems'] / $limit),
        ]);
    }

    #[Route('/unread-count', name: 'notification_unread_count', methods: ['GET'])]
    #[OA\Get(
        summary: 'Nombre de notifications non lues',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Nombre de notifications non lues',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'count', type: 'integer', example: 5),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function unreadCount(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $count = $this->repo->countUnreadByRecipient($this->getUser());
        return $this->json(['count' => $count]);
    }

    #[Route('/read-all', name: 'notification_mark_all_read', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Marquer toutes les notifications comme lues',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Toutes les notifications ont été marquées comme lues',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function markAllRead(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $this->repo->markAllReadByRecipient($this->getUser());
        return $this->json(['success' => true]);
    }

    #[Route('/{id}/read', name: 'notification_mark_read', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Marquer une notification comme lue',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID de la notification', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Notification marquée comme lue',
                content: new OA\JsonContent(ref: NotificationResponse::class)
            ),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Notification non trouvée'),
        ]
    )]
    public function markRead(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $notification = $this->repo->find($id);

        if (!$notification) {
            return $this->json(['error' => 'Notification not found'], 404);
        }
        if ($notification->getRecipient() !== $this->getUser()) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $notification->setIsRead(true);
        $this->repo->save($notification);

        return $this->json($this->mapper->toDto($notification));
    }
}
