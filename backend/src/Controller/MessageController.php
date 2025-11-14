<?php

namespace App\Controller;

use App\Repository\Messaging\ConversationRepository;
use App\Repository\Messaging\MessageRepository;
use App\Mapper\MessageMapper;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Repository\Messaging\MessageReadRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Security;


#[Route('/api/messaging/conversations')]
#[OA\Tag(name: 'Messaging')]
class MessageController extends AbstractController
{
    public function __construct(
        private MessageRepository $repo,
        private ConversationRepository $convRepo,
        private MessageMapper $mapper
    ) {}

    #[Route('/{id}/messages', name: 'messages_list', methods: ['GET'])]
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



    #[Route('/{id}/read', name: 'messages_mark_read', methods: ['POST'])]
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
        if (!$currentUser instanceof \App\Entity\User) {
            throw new \LogicException('Expected current user to be an instance of App\Entity\User');
        }

        $messages = $messageRepo->findByConversationOrdered($id);

        foreach ($messages as $message) {
            $messageReadRepo->markAsRead($message, $currentUser);
        }

        $em->flush();

        return $this->json(['status' => 'ok']);
    }
}
