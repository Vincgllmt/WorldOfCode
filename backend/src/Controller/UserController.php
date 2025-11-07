<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\Request;
use App\Enum\UserRole;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\UserResponse;
use App\Mapper\UserMapper;
use App\Dto\TechGroupResponse;
use App\Mapper\TechGroupMapper;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;
use App\Dto\UserUpdateRequest;


final class UserController extends AbstractController
{
    public function __construct(
        private UserRepository $repo,
        private UserMapper $mapper,
        private TechGroupMapper $groupMapper,
        private ValidatorInterface $validator
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
        requestBody: new OA\RequestBody(
            required: true,
            content: new Model(type: UserUpdateRequest::class)
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Utilisateur mis à jour',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé'),
            new OA\Response(response: 409, description: 'Nom ou email déjà utilisés'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
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

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $dto = UserUpdateRequest::fromArray($payload);
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            return $this->json(
                ['error' => 'Validation failed', 'details' => $this->formatViolations($violations)],
                422
            );
        }

        if ($this->repo->existsOtherWithUsername($user->getId(), $dto->username)) {
            return $this->json(['error' => 'Username already in use'], 409);
        }

        if ($this->repo->existsOtherWithEmail($user->getId(), $dto->email)) {
            return $this->json(['error' => 'Email already in use'], 409);
        }

        $targetRole = UserRole::from($dto->role);
        if (!$this->isGranted('ROLE_ADMIN') && $targetRole !== $user->getRole()) {
            return $this->json(['error' => 'Only admins can modify roles'], 403);
        }

        $user->setUsername($dto->username)
            ->setFirstname($dto->firstname)
            ->setLastname($dto->lastname)
            ->setEmail($dto->email);

        if ($this->isGranted('ROLE_ADMIN')) {
            $user->setRole($targetRole);
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
    #[Route('api/user/{id}/password', name: 'user_change_password', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Modifier son mot de passe',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'currentPassword', type: 'string'),
                    new OA\Property(property: 'newPassword', type: 'string')
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Mot de passe mis à jour'),
            new OA\Response(response: 400, description: 'Requête invalide'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouvé')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function changePassword(
        int $id,
        Request $request,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $currentUser = $this->getUser();
        $user = $this->repo->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $currentPassword = $data['currentPassword'] ?? null;
        $newPassword = $data['newPassword'] ?? null;

        if (!$currentPassword || !$newPassword) {
            return $this->json(['error' => 'Missing parameters'], 400);
        }

        if (!$passwordHasher->isPasswordValid($user, $currentPassword)) {
            return $this->json(['error' => 'Current password is incorrect'], 403);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
        $this->repo->save($user, true);

        return $this->json(['message' => 'Password updated successfully']);
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

    /**
     * @return array<int, array<string, string>>
     */
    private function formatViolations(ConstraintViolationListInterface $violations): array
    {
        $errors = [];
        foreach ($violations as $violation) {
            $errors[] = [
                'field' => (string) $violation->getPropertyPath(),
                'message' => $violation->getMessage(),
            ];
        }

        return $errors;
    }
}
