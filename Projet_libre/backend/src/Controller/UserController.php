<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\Request;
use App\Enum\UserRole;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\UserResponse;
use App\Mapper\UserMapper;
use App\Dto\TechGroupResponse;
use App\Mapper\TechGroupMapper;

final class UserController extends AbstractController
{
    public function __construct(
        private UserRepository $repo,
        private UserMapper $mapper,
        private TechGroupMapper $groupMapper
    ) {}

    #[Route('api/user', name: 'user_list', methods: ['GET'])]
    #[OA\Response(
        response: 200,
        description: 'Liste des utilisateurs',
        content: new OA\JsonContent(
            type: 'array',
            items: new OA\Items(ref: new Model(type: UserResponse::class))
        )
    )]
    #[OA\Tag(name: 'User')]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $users = $this->repo->findAll();
        $data = array_map([$this->mapper, 'toDto'], $users);

        return $this->json($data);
    }
    ####
    ##
    ####
    #[Route('api/user/{id}', name: 'user_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Détail d\'un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Utilisateur trouvé',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function get(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->repo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        return $this->json($this->mapper->toDto($user));
    }
    ####
    ##
    ####
    #[Route('api/user/{id}', name: 'user_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met à jour un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'username', type: 'string'),
                    new OA\Property(property: 'role', type: 'string', description: 'Uniquement modifiable par un admin')
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Utilisateur mis à jour',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function update(int $id, Request $request): JsonResponse
    {
        $currentUser = $this->getUser();
        $user = $this->repo->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['username'])) {
            $user->setUsername($data['username']);
        }

        if (isset($data['role'])) {
            if (!$this->isGranted('ROLE_ADMIN')) {
                return $this->json(['error' => 'Only admins can modify roles'], 403);
            }
            $user->setRole(UserRole::from($data['role']));
        }

        $this->repo->save($user, true);

        return $this->json($this->mapper->toDto($user));
    }
    ####
    ##
    ####
    #[Route('api/user/{id}', name: 'user_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Utilisateur supprimé'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function delete(int $id): JsonResponse
    {
        $currentUser = $this->getUser();
        $user = $this->repo->find($id);

        if (!$user) {
            return $this->json(['success' => false, 'error' => 'User not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $user !== $currentUser) {
            return $this->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $this->repo->remove($user, true);

        return $this->json(['success' => true]);
    }
    ####
    ##
    ####
    #[Route('api/user/{id}/groups', name: 'user_joined_groups_by_id', methods: ['GET'])]
    #[OA\Get(
        summary: 'Groupes rejoints par un utilisateur donné',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des groupes',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: TechGroupResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function getGroupsByUserId(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->repo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $groups = $user->getJoinedGroups();
        $data = array_map(fn($group) => $this->groupMapper->toDto($group), $groups->toArray());

        return $this->json($data);
    }
}
