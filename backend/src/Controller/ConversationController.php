<?php

namespace App\Controller;

use App\Entity\Messaging\Conversation;
use App\Entity\Messaging\ConversationParticipant;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Repository\ConversationRepository;
use App\Mapper\ConversationMapper;
use App\Dto\ConversationResponse;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use Ramsey\Uuid\Uuid;

#[Route('/api/messaging/conversations')]
#[OA\Tag(name: 'Messaging')]
class ConversationController extends AbstractController
{
    public function __construct(
        private ConversationRepository $repo,
        private UserRepository $userRepo,
        private ConversationMapper $mapper,
        private EntityManagerInterface $em
    ) {}

    #[Route('', name: 'conversation_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Create a new private conversation',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'targetUserId', type: 'integer')
            ], type: 'object')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Conversation created',
                content: new Model(type: ConversationResponse::class)
            ),
            new OA\Response(response: 200, description: 'Conversation already exists'),
            new OA\Response(response: 400, description: 'Invalid request'),
            new OA\Response(response: 404, description: 'Target user not found'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);
        $targetUserId = $data['targetUserId'] ?? null;

        if (!$targetUserId) {
            return $this->json(['error' => 'Missing targetUserId'], 400);
        }

        $currentUser = $this->getUser();
        $targetUser = $this->userRepo->find($targetUserId);

        if (!$targetUser) {
            return $this->json(['error' => 'Target user not found'], 404);
        }

        /** @var User $currentUser */
        $currentUser = $this->getUser();
        if (!$currentUser instanceof \App\Entity\User) {
            throw new \LogicException('Expected current user to be an instance of App\Entity\User');
        }

        $existingConv = $this->repo->findDirectConversationBetween(
            $currentUser->getId(),
            $targetUser->getId()
        );

        if ($existingConv) {
            return $this->json($this->mapper->toDto($existingConv), 200);
        }
        $conv = new Conversation();
        $conv->setId(Uuid::uuid4()->toString());
        $conv->setType('direct');
        $conv->setTitle(null);

        $p1 = new ConversationParticipant();
        $p1->setUser($currentUser);
        $p1->setRole('member');
        $conv->addParticipant($p1);

        $p2 = new ConversationParticipant();
        $p2->setUser($targetUser);
        $p2->setRole('member');
        $conv->addParticipant($p2);

        $this->repo->save($conv, true);

        return $this->json($this->mapper->toDto($conv), 201);
    }
    ####
    ##
    ####
    #[Route('', name: 'conversation_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Lister les conversations de l’utilisateur courant',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des conversations',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: ConversationResponse::class))
                )
            )
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        /** @var \App\Entity\User $currentUser */
        $currentUser = $this->getUser();
        if (!$currentUser instanceof \App\Entity\User) {
            throw new \LogicException('Expected current user to be an instance of App\Entity\User');
        }

        $convs = $this->repo->findByUserId($currentUser->getId());

        $data = array_map([$this->mapper, 'toDto'], $convs);

        return $this->json($data);
    }
}
