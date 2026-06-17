<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use App\Repository\UserRepository;
use App\Repository\SkillRepository;
use App\Repository\UserLinkRepository;
use Symfony\Component\HttpFoundation\Request;
use App\Enum\UserRole;
use App\Enum\Availability;
use App\Enum\LinkType;
use App\Entity\UserLink;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\UserResponse;
use App\Dto\SkillResponse;
use App\Dto\UserLinkResponse;
use App\Dto\UserLinkRequest;
use App\Dto\UserProfileUpdateRequest;
use App\Mapper\UserMapper;
use App\Mapper\SkillMapper;
use App\Mapper\UserLinkMapper;
use App\Dto\TechGroupResponse;
use App\Mapper\TechGroupMapper;
use App\Service\PasswordValidator;
use App\Repository\TrustedDeviceRepository;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;
use App\Dto\UserUpdateRequest;


final class UserController extends AbstractController
{
    public function __construct(
        private UserRepository $repo,
        private UserMapper $mapper,
        private TechGroupMapper $groupMapper,
        private ValidatorInterface $validator,
        private SkillRepository $skillRepo,
        private UserLinkRepository $linkRepo,
        private SkillMapper $skillMapper,
        private UserLinkMapper $linkMapper
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

        $viewer = $this->getUser();
        $users = $this->repo->findAll();
        $data = array_map(fn($u) => $this->mapper->toDto($u, $viewer), $users);

        return $this->json($data);
    }
    #[Route('api/user/{id}', name: 'user_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Detail d\'un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Utilisateur trouve',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
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

        return $this->json($this->mapper->toDto($user, $this->getUser()));
    }
    #[Route('api/user/{id}', name: 'user_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met a jour un utilisateur',
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
                description: 'Utilisateur mis a jour',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve'),
            new OA\Response(response: 409, description: 'Nom ou email deja utilises'),
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

        return $this->json($this->mapper->toDto($user, $currentUser));
    }
    #[Route('api/user/{id}', name: 'user_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Utilisateur supprime'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
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
            new OA\Response(response: 200, description: 'Mot de passe mis a jour'),
            new OA\Response(response: 400, description: 'Requete invalide'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function changePassword(
        int $id,
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        TrustedDeviceRepository $trustedDeviceRepository
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

        if ($currentPassword === $newPassword) {
            return $this->json([
                'error' => 'New password must be different from current password'
            ], 400);
        }

        // Valider la force du mot de passe
        $error = PasswordValidator::validate($newPassword);
        if ($error) {
            return $this->json(['error' => $error], 400);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
        $this->repo->save($user, true);

        // Révoquer tous les appareils de confiance : nouveau mot de passe = sessions précédentes non fiables
        $trustedDeviceRepository->deleteAllForUser($user);

        return $this->json(['message' => 'Password updated successfully']);
    }


    #[Route('api/user/{id}/groups', name: 'user_joined_groups_by_id', methods: ['GET'])]
    #[OA\Get(
        summary: 'Groupes rejoints par un utilisateur donne',
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
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
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

    #[Route('api/user/{id}/theme', name: 'user_update_theme', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met a jour le theme d\'interface de l\'utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'theme', type: 'string', example: 'dark')
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Theme mis a jour',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 400, description: 'Theme invalide'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function updateTheme(int $id, Request $request): JsonResponse
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
        $theme = $data['theme'] ?? null;

        $allowedThemes = ['light', 'dark', 'cyberpunk-dark', 'cyberpunk-light'];
        if ($theme !== null && !in_array($theme, $allowedThemes, true)) {
            return $this->json(['error' => 'Invalid theme. Allowed: ' . implode(', ', $allowedThemes)], 400);
        }

        $user->setTheme($theme);
        $this->repo->save($user, true);

        return $this->json($this->mapper->toDto($user, $currentUser));
    }

    ##  PROFIL CV
    #[Route('api/user/{id}/profile', name: 'user_update_profile', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met a jour le profil CV de l\'utilisateur',
        description: 'Permet de mettre a jour la bio, localisation, disponibilite, experiences et skills du profil.',
        requestBody: new OA\RequestBody(
            required: true,
            content: new Model(type: UserProfileUpdateRequest::class)
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Profil mis a jour',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function updateProfile(int $id, Request $request): JsonResponse
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

        $dto = UserProfileUpdateRequest::fromArray($payload);
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            return $this->json(
                ['error' => 'Validation failed', 'details' => $this->formatViolations($violations)],
                422
            );
        }

        // Bio, location, availability
        if (array_key_exists('bio', $payload)) {
            $user->setBio($dto->bio);
        }
        if (array_key_exists('location', $payload)) {
            $user->setLocation($dto->location);
        }
        if (array_key_exists('availability', $payload)) {
            $availability = $dto->availability ? Availability::from($dto->availability) : null;
            $user->setAvailability($availability);
        }
        if (array_key_exists('experiences', $payload)) {
            $user->setExperiences($dto->experiences);
        }

        if (array_key_exists('avatarUrl', $payload)) {
            $user->setAvatarUrl($dto->avatarUrl);
        }
        if (array_key_exists('fieldVisibility', $payload) && $dto->fieldVisibility !== null) {
            $allowed = ['bio', 'location', 'availability', 'email'];
            $validValues = ['PUBLIC', 'CONNECTED', 'PRIVATE'];
            $current = $user->getEffectiveFieldVisibility();
            foreach ($dto->fieldVisibility as $key => $value) {
                if (in_array($key, $allowed, true) && in_array($value, $validValues, true)) {
                    $current[$key] = $value;
                }
            }
            $user->setFieldVisibility($current);
        }

        // Skills (replace all)
        if (array_key_exists('skillIds', $payload) && is_array($dto->skillIds)) {
            // Clear existing skills
            foreach ($user->getSkills()->toArray() as $existingSkill) {
                $user->removeSkill($existingSkill);
            }
            // Add new skills
            $skills = $this->skillRepo->findByIds($dto->skillIds);
            foreach ($skills as $skill) {
                $user->addSkill($skill);
            }
        }

        $this->repo->save($user, true);

        return $this->json($this->mapper->toDto($user, $currentUser));
    }

    ##  LIENS EXTERNES
    #[Route('api/user/{id}/links', name: 'user_links_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les liens externes d\'un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des liens',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: UserLinkResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function getLinks(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->repo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $data = array_map([$this->linkMapper, 'toDto'], $user->getLinks()->toArray());

        return $this->json($data);
    }

    #[Route('api/user/{id}/links', name: 'user_links_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Ajoute un lien externe au profil utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new Model(type: UserLinkRequest::class)
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 201,
                description: 'Lien cree',
                content: new Model(type: UserLinkResponse::class)
            ),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function createLink(int $id, Request $request): JsonResponse
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

        $dto = UserLinkRequest::fromArray($payload);
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            return $this->json(
                ['error' => 'Validation failed', 'details' => $this->formatViolations($violations)],
                422
            );
        }

        $link = new UserLink();
        $link->setUser($user);
        $link->setType(LinkType::from($dto->type));
        $link->setUrl($dto->url);

        $this->linkRepo->save($link, true);

        return $this->json($this->linkMapper->toDto($link), 201);
    }

    #[Route('api/user/{id}/links/{linkId}', name: 'user_links_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Modifie un lien externe du profil utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new Model(type: UserLinkRequest::class)
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'linkId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lien mis a jour',
                content: new Model(type: UserLinkResponse::class)
            ),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur ou lien non trouve'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function updateLink(int $id, int $linkId, Request $request): JsonResponse
    {
        $currentUser = $this->getUser();
        $user = $this->repo->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $link = $this->linkRepo->find($linkId);
        if (!$link || $link->getUser()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Link not found'], 404);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $dto = UserLinkRequest::fromArray($payload);
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            return $this->json(
                ['error' => 'Validation failed', 'details' => $this->formatViolations($violations)],
                422
            );
        }

        $link->setType(LinkType::from($dto->type));
        $link->setUrl($dto->url);

        $this->linkRepo->save($link, true);

        return $this->json($this->linkMapper->toDto($link));
    }

    #[Route('api/user/{id}/links/{linkId}', name: 'user_links_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime un lien externe du profil utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'linkId', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lien supprime'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur ou lien non trouve')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function deleteLink(int $id, int $linkId): JsonResponse
    {
        $currentUser = $this->getUser();
        $user = $this->repo->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $link = $this->linkRepo->find($linkId);
        if (!$link || $link->getUser()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Link not found'], 404);
        }

        $this->linkRepo->remove($link, true);

        return $this->json(['success' => true]);
    }

    ##  SKILLS UTILISATEUR
    #[Route('api/user/{id}/skills', name: 'user_skills_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les competences d\'un utilisateur',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des competences de l\'utilisateur',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: SkillResponse::class))
                )
            ),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function getUserSkills(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->repo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $data = array_map([$this->skillMapper, 'toDto'], $user->getSkills()->toArray());

        return $this->json($data);
    }

    #[Route('api/user/{id}/skills', name: 'user_skills_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Remplace les competences de l\'utilisateur',
        description: 'Remplace toutes les skills de l\'utilisateur par la liste fournie (tableau d\'IDs).',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'skillIds',
                        type: 'array',
                        items: new OA\Items(type: 'integer', example: 1),
                        description: 'Liste des IDs de skills'
                    )
                ],
                type: 'object'
            )
        ),
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Competences mises a jour',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: SkillResponse::class))
                )
            ),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    #[OA\Tag(name: 'User')]
    public function updateUserSkills(int $id, Request $request): JsonResponse
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
        $skillIds = $data['skillIds'] ?? [];

        if (!is_array($skillIds)) {
            return $this->json(['error' => 'skillIds must be an array'], 400);
        }

        // Clear existing skills
        foreach ($user->getSkills()->toArray() as $existingSkill) {
            $user->removeSkill($existingSkill);
        }

        // Add new skills
        if (!empty($skillIds)) {
            $skills = $this->skillRepo->findByIds($skillIds);
            foreach ($skills as $skill) {
                $user->addSkill($skill);
            }
        }

        $this->repo->save($user, true);

        $result = array_map([$this->skillMapper, 'toDto'], $user->getSkills()->toArray());

        return $this->json($result);
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
