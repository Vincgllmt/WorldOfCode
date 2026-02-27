<?php

namespace App\Controller;

use App\Entity\TechGroup;
use App\Repository\TechGroupRepository;
use App\Dto\TechGroupResponse;
use App\Mapper\TechGroupMapper;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\UserResponse;
use App\Mapper\UserMapper;
use App\Mapper\PostMapper;
use App\Dto\PostResponse;
use App\Entity\User;
use App\Service\TechGroupMembershipService;
use Doctrine\ORM\EntityNotFoundException;

#[Route('/api/group')]
#[OA\Tag(name: 'TechGroup')]
class TechGroupController extends AbstractController
{
    public function __construct(
        private TechGroupRepository $repo,
        private TechGroupMapper $mapper,
        private UserMapper $userMapper,
        private PostMapper $postMapper,
        private TechGroupMembershipService $membershipService
    ) {}

    #[Route('', name: 'group_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste tous les groupes',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des groupes',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: TechGroupResponse::class))
                )
            )
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $groups = $this->repo->findAll();
        $data = array_map([$this->mapper, 'toDto'], $groups);

        return $this->json($data);
    }
    ####
    ##
    ####
    #[Route('/{id}', name: 'group_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Détail d\'un groupe',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Groupe trouvé',
                content: new Model(type: TechGroupResponse::class)
            ),
            new OA\Response(response: 404, description: 'Groupe non trouvé')
        ]
    )]
    public function get(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $group = $this->repo->find($id);

        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        return $this->json($this->mapper->toDto($group));
    }
    ####
    ##
    ####
    #[Route('', name: 'group_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un groupe',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'description', type: 'string', nullable: true)
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Groupe créé', content: new Model(type: TechGroupResponse::class)),
            new OA\Response(response: 400, description: 'Erreur de validation'),
            new OA\Response(response: 403, description: 'Non autorisé'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true);
        if (!isset($data['name'])) {
            return $this->json(['error' => 'Missing name'], 400);
        }

        if ($this->repo->findByNameInsensitive($data['name'])) {
            return $this->json(['error' => 'Group name already exists'], 409);
        }

        $group = new TechGroup();
        $group->setName($data['name']);
        $group->setDescription($data['description'] ?? null);
        $group->setCreator($this->getUser());

        $this->repo->save($group, true);

        return $this->json($this->mapper->toDto($group), 201);
    }
    ####
    ##
    ####
    #[Route('/{id}', name: 'group_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met à jour un groupe',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string'),
                    new OA\Property(property: 'description', type: 'string', nullable: true)
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Groupe mis à jour', content: new Model(type: TechGroupResponse::class)),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé')
        ]
    )]
    public function update(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->repo->find($id);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $group->setName($data['name'] ?? $group->getName());
        $group->setDescription($data['description'] ?? $group->getDescription());

        $this->repo->save($group, true);

        return $this->json($this->mapper->toDto($group));
    }
    ####
    ##
    ####
    #[Route('/{id}', name: 'group_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime un groupe',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Groupe supprimé'),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé')
        ]
    )]
    public function delete(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->repo->find($id);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $this->repo->remove($group, true);

        return $this->json(['success' => true]);
    }
    ####
    ##
    ####
    #[Route('/{id}/users', name: 'group_users', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les utilisateurs membres d’un groupe',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des utilisateurs du groupe',
                content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: new Model(type: UserResponse::class)))
            ),
            new OA\Response(response: 404, description: 'Groupe non trouvé')
        ]
    )]
    public function listUsers(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $group = $this->repo->find($id);
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $users = $group->getUsers();
        $data = array_map(fn($user) => $this->userMapper->toDto($user), $users->toArray());

        return $this->json($data);
    }
    ####
    ##
    ####
    #[Route('/{id}/join', name: 'group_join', methods: ['POST'])]
    #[OA\Post(
        summary: 'Rejoindre un groupe en tant qu’utilisateur connecté',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Utilisateur ajouté au groupe'),
            new OA\Response(response: 403, description: 'Non autorisé'),
            new OA\Response(response: 404, description: 'Groupe non trouvé')
        ]
    )]
    public function joinGroup(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $joined = $this->membershipService->join($id, $user);
        } catch (EntityNotFoundException) {
            return $this->json(['error' => 'Group not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$joined) {
            return $this->json(['message' => 'Already a member of the group.']);
        }

        return $this->json(['message' => 'Successfully joined the group.']);
    }
    ####
    ##
    ####
    #[Route('/{id}/join', name: 'group_leave', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Quitter un groupe en tant qu’utilisateur connecté',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 204, description: 'Utilisateur retiré (ou déjà absent) du groupe'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
        ]
    )]
    public function leaveGroup(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $this->membershipService->leave($id, $user);
        } catch (EntityNotFoundException) {
            return $this->json(['error' => 'Group not found'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
    ####
    ##
    ####
    #[Route('/{id}/posts', name: 'group_posts', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les posts d’un groupe donné',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des posts',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: PostResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Groupe non trouvé')
        ]
    )]
    #[OA\Tag(name: 'TechGroup')]
    public function getGroupPosts(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $group = $this->repo->find($id); // $this->repo = TechGroupRepository
        if (!$group) {
            return $this->json(['error' => 'Group not found'], 404);
        }

        $posts = $group->getPosts(); // Assure-toi que TechGroup a une relation getPosts()
        $data = array_map([$this->postMapper, 'toDto'], $posts->toArray());

        return $this->json($data);
    }
}
