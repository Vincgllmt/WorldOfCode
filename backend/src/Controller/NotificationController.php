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
    #[OA\Get(summary: 'Liste les notifications de l\'utilisateur connecté')]
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
    #[OA\Get(summary: 'Nombre de notifications non lues')]
    public function unreadCount(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $count = $this->repo->countUnreadByRecipient($this->getUser());
        return $this->json(['count' => $count]);
    }

    #[Route('/read-all', name: 'notification_mark_all_read', methods: ['PUT'])]
    #[OA\Put(summary: 'Marquer toutes les notifications comme lues')]
    public function markAllRead(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $this->repo->markAllReadByRecipient($this->getUser());
        return $this->json(['success' => true]);
    }

    #[Route('/{id}/read', name: 'notification_mark_read', methods: ['PUT'])]
    #[OA\Put(summary: 'Marquer une notification comme lue')]
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
