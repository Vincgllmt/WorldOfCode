<?php

namespace App\Controller;

use App\Repository\Messaging\ConversationRepository;
use App\Repository\Messaging\MessageRepository;
use App\Mapper\MessageMapper;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Repository\Messaging\MessageReadRepository;
use Doctrine\ORM\EntityManagerInterface;

#[Route('/api/messaging')]
#[OA\Tag(name: 'Messaging')]
class MessageController extends AbstractController
{
    public function __construct(
        private MessageRepository $repo,
        private ConversationRepository $convRepo,
        private MessageMapper $mapper
    ) {}

    #[Route('/conversations/{id}/messages', name: 'messages_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Récupère tous les messages d’une conversation',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des messages',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: \App\Dto\MessageResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Conversation non trouvée')
        ]
    )]
    public function list(string $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $conversation = $this->convRepo->find($id);
        if (!$conversation) {
            return $this->json(['error' => 'Conversation not found'], 404);
        }

        $messages = $this->repo->findByConversationOrdered($id);

        $data = array_map([$this->mapper, 'toDto'], $messages);

        return $this->json($data);
    }



    #[Route('/conversations/{id}/read', name: 'messages_mark_read', methods: ['POST'])]
    #[OA\Post(
        summary: "Marque tous les messages d'une conversation comme lus",
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "string"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Messages marqués comme lus")
        ]
    )]
    public function markConversationAsRead(
        string $id,
        MessageRepository $messageRepo,
        MessageReadRepository $messageReadRepo,
        EntityManagerInterface $em
    ): JsonResponse {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var User $currentUser */
        $currentUser = $this->getUser();
        // @codeCoverageIgnoreStart
        // Garde-fou type-safe : inatteignable car denyAccessUnlessGranted plus haut.
        if (!$currentUser instanceof \App\Entity\User) {
            throw new \LogicException('Expected current user to be an instance of App\Entity\User');
        }
        // @codeCoverageIgnoreEnd

        $messages = $messageRepo->findByConversationOrdered($id);

        foreach ($messages as $message) {
            $messageReadRepo->markAsRead($message, $currentUser);
        }

        $em->flush();

        return $this->json(['status' => 'ok']);
    }

    #[Route('/messages/search', name: 'messages_search', methods: ['GET'])]
    #[OA\Get(
        summary: 'Recherche globale dans les messages de l\'utilisateur',
        parameters: [
            new OA\Parameter(name: 'q', in: 'query', required: true, schema: new OA\Schema(type: 'string', minLength: 2))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Résultats de recherche'),
            new OA\Response(response: 400, description: 'Requête invalide')
        ]
    )]
    public function search(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $query = trim($request->query->getString('q', ''));
        if (mb_strlen($query) < 2) {
            return $this->json(['error' => 'La recherche doit contenir au moins 2 caractères'], 400);
        }

        $user = $this->getUser();
        $results = $this->repo->searchByUserAndQuery($user->getId(), $query);

        // Regrouper les infos de conversation pour chaque résultat
        $conversationCache = [];
        $data = [];

        foreach ($results as $row) {
            $convId = $row['conversation_id'];

            if (!isset($conversationCache[$convId])) {
                $conv = $this->convRepo->find($convId);
                if ($conv) {
                    $participants = [];
                    foreach ($conv->getParticipants() as $p) {
                        $participants[] = [
                            'id' => $p->getUser()->getId(),
                            'username' => $p->getUser()->getUsername(),
                        ];
                    }
                    $conversationCache[$convId] = [
                        'id' => $convId,
                        'type' => $conv->getType(),
                        'participants' => $participants,
                    ];
                }
            }

            $data[] = [
                'id' => $row['id'],
                'body' => $row['body'],
                'type' => $row['type'],
                'createdAt' => $row['created_at'],
                'conversationId' => $convId,
                'sender' => [
                    'id' => $row['sender_id'],
                    'username' => $row['sender_username'],
                ],
                'conversation' => $conversationCache[$convId] ?? null,
            ];
        }

        return $this->json($data);
    }
}
