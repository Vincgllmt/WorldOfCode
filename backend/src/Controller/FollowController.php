<?php

namespace App\Controller;

use App\Entity\Follow;
use App\Repository\UserRepository;
use App\Repository\FollowRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use App\Entity\User;
use App\Service\NotificationService;
use App\Enum\NotificationType;
#[Route('/api/follow')]
#[OA\Tag(name: 'Follow')]
class FollowController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private FollowRepository $followRepo,
        private NotificationService $notificationService,
    ) {}

    #[Route('/{id}', name: 'follow_user', methods: ['POST'])]
    #[OA\Post(
        summary: 'Suivre un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 201, description: 'Utilisateur suivi'),
            new OA\Response(response: 400, description: 'Déjà suivi ou invalide'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé')
        ]
    )]
    public function follow(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $follower = $this->getUser();
        // @codeCoverageIgnoreStart
        // Garde-fou type-safe : inatteignable car denyAccessUnlessGranted plus haut
        // garantit qu'un User est authentifié.
        if (!$follower instanceof User) {
            throw new \LogicException('Expected User entity');
        }
        // @codeCoverageIgnoreEnd

        $followed = $this->userRepo->find($id);

        if (!$followed) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if ($follower->getId() === $followed->getId()) {
            return $this->json(['error' => 'You cannot follow yourself'], 400);
        }

        $existing = $this->followRepo->findOneBy([
            'follower' => $follower,
            'followed' => $followed
        ]);
        if ($existing) {
            return $this->json(['error' => 'Already following this user'], 400);
        }

        $follow = new Follow();
        $follow->setFollower($follower);
        $follow->setFollowed($followed);
        $this->followRepo->save($follow);

        // Notifier l'utilisateur suivi
        $this->notificationService->createAndPush(
            $followed,
            $follower,
            NotificationType::FOLLOW,
            $follower->getUsername() . ' a commencé à vous suivre',
            null
        );

        return $this->json(['success' => true, 'message' => 'User followed'], 201);
    }

    #[Route('/{id}', name: 'unfollow_user', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Ne plus suivre un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Utilisateur désuivi'),
            new OA\Response(response: 404, description: 'Relation non trouvée')
        ]
    )]
    public function unfollow(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $follower = $this->getUser();
        $followed = $this->userRepo->find($id);

        if (!$followed) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $follow = $this->followRepo->findOneBy([
            'follower' => $follower,
            'followed' => $followed
        ]);

        if (!$follow) {
            return $this->json(['error' => 'Not following this user'], 404);
        }

        $this->followRepo->remove($follow);

        return $this->json(['success' => true, 'message' => 'User unfollowed']);
    }

    #[Route("/{id}/followers", name: "user_followers", methods: ["GET"])]
    #[OA\Get(
        summary: "Liste les followers d’un utilisateur",
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, description: "ID de l’utilisateur", schema: new OA\Schema(type: "integer")),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: "Liste des followers",
                content: new OA\JsonContent(
                    type: "array",
                    items: new OA\Items(type: "object")
                )
            ),
            new OA\Response(response: 404, description: "Utilisateur non trouvé"),
        ]
    )]
    public function followers(int $id): JsonResponse
    {
        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(["error" => "User not found"], 404);
        }

        $followers = $this->followRepo->findBy(["followed" => $user]);
        $data = array_map(fn($f) => [
            "id" => $f->getFollower()->getId(),
            "username" => $f->getFollower()->getUsername()
        ], $followers);

        return $this->json($data);
    }

    #[Route("/{id}/following", name: "user_following", methods: ["GET"])]
    #[OA\Get(
        summary: "Liste les utilisateurs suivis par un utilisateur",
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, description: "ID de l’utilisateur", schema: new OA\Schema(type: "integer")),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: "Liste des utilisateurs suivis",
                content: new OA\JsonContent(
                    type: "array",
                    items: new OA\Items(type: "object")
                )
            ),
            new OA\Response(response: 404, description: "Utilisateur non trouvé"),
        ]
    )]
    public function following(int $id): JsonResponse
    {
        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(["error" => "User not found"], 404);
        }

        $following = $this->followRepo->findBy(["follower" => $user]);
        $data = array_map(fn($f) => [
            "id" => $f->getFollowed()->getId(),
            "username" => $f->getFollowed()->getUsername()
        ], $following);

        return $this->json($data);
    }
}
