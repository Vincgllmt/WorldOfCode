<?php

namespace App\Controller;

use App\Dto\ExperienceRequest;
use App\Entity\Experience;
use App\Enum\Visibility;
use App\Mapper\ExperienceMapper;
use App\Repository\ExperienceRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\ExperienceResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;

#[OA\Tag(name: 'Experience')]
final class ExperienceController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ExperienceRepository $expRepo,
        private UserRepository $userRepo,
        private ExperienceMapper $mapper,
        private ValidatorInterface $validator
    ) {}

    #[Route('api/user/{id}/experiences', name: 'experience_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Ajoute une experience au profil utilisateur',
        requestBody: new OA\RequestBody(required: true, content: new Model(type: ExperienceRequest::class)),
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 201, description: 'Experience creee', content: new Model(type: ExperienceResponse::class)),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
        ]
    )]
    public function create(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $user = $this->userRepo->find($id);
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

        $dto = ExperienceRequest::fromArray($payload);
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            return $this->json(['error' => 'Validation failed', 'details' => $this->formatViolations($violations)], 422);
        }

        $position = $this->expRepo->count(['user' => $user]);

        $experience = new Experience();
        $experience->setUser($user);
        $experience->setTitle($dto->title);
        $experience->setCompany($dto->company);
        $experience->setStartDate($dto->startDate);
        $experience->setEndDate($dto->endDate);
        $experience->setLocation($dto->location);
        $experience->setDescription($dto->description);
        $experience->setPosition($position);

        $this->em->persist($experience);
        $this->em->flush();

        return $this->json($this->mapper->toDto($experience), 201);
    }

    #[Route('api/user/{id}/experiences/reorder', name: 'experience_reorder', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Reordonne les experiences de l\'utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [new OA\Property(property: 'ids', type: 'array', items: new OA\Items(type: 'string'))],
                type: 'object'
            )
        ),
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Reordonnancement effectue'),
            new OA\Response(response: 400, description: 'IDs invalides'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    public function reorder(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $payload = json_decode($request->getContent(), true);
        $ids = $payload['ids'] ?? [];

        if (!is_array($ids) || empty($ids)) {
            return $this->json(['error' => 'ids must be a non-empty array'], 400);
        }

        $experiences = [];
        foreach ($ids as $eid) {
            $exp = $this->expRepo->find($eid);
            if (!$exp || $exp->getUser()->getId() !== $user->getId()) {
                return $this->json(['error' => 'Invalid experience id: ' . $eid], 400);
            }
            $experiences[] = $exp;
        }

        foreach ($experiences as $i => $exp) {
            $exp->setPosition($i);
        }
        $this->em->flush();

        return $this->json(['message' => 'Reordered successfully']);
    }

    #[Route('api/experiences/{expId}', name: 'experience_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Met a jour une experience',
        requestBody: new OA\RequestBody(required: true, content: new Model(type: ExperienceRequest::class)),
        parameters: [new OA\Parameter(name: 'expId', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Experience mise a jour', content: new Model(type: ExperienceResponse::class)),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Experience non trouvee'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
        ]
    )]
    public function update(string $expId, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $experience = $this->expRepo->find($expId);
        if (!$experience) {
            return $this->json(['error' => 'Experience not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $experience->getUser() !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $dto = ExperienceRequest::fromArray($payload);
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            return $this->json(['error' => 'Validation failed', 'details' => $this->formatViolations($violations)], 422);
        }

        $experience->setTitle($dto->title);
        $experience->setCompany($dto->company);
        $experience->setStartDate($dto->startDate);
        $experience->setEndDate($dto->endDate);
        $experience->setLocation($dto->location);
        $experience->setDescription($dto->description);

        $this->em->flush();

        return $this->json($this->mapper->toDto($experience));
    }

    #[Route('api/experiences/{expId}', name: 'experience_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprime une experience',
        parameters: [new OA\Parameter(name: 'expId', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 204, description: 'Experience supprimee'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Experience non trouvee')
        ]
    )]
    public function delete(string $expId): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $experience = $this->expRepo->find($expId);
        if (!$experience) {
            return $this->json(['error' => 'Experience not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $experience->getUser() !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $this->em->remove($experience);
        $this->em->flush();

        return $this->json(null, 204);
    }

    #[Route('api/experiences/{expId}/visibility', name: 'experience_update_visibility', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Met a jour la visibilite d\'une experience',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [new OA\Property(property: 'visibility', type: 'string', example: 'CONNECTED')],
                type: 'object'
            )
        ),
        parameters: [new OA\Parameter(name: 'expId', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(response: 200, description: 'Visibilite mise a jour', content: new Model(type: ExperienceResponse::class)),
            new OA\Response(response: 400, description: 'Valeur de visibilite invalide'),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Experience non trouvee')
        ]
    )]
    public function updateVisibility(string $expId, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $experience = $this->expRepo->find($expId);
        if (!$experience) {
            return $this->json(['error' => 'Experience not found'], 404);
        }

        if (!$this->isGranted('ROLE_ADMIN') && $experience->getUser() !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $payload = json_decode($request->getContent(), true);
        $visibilityValue = $payload['visibility'] ?? null;

        if (!in_array($visibilityValue, Visibility::values(), true)) {
            return $this->json(['error' => 'Invalid visibility value. Allowed: ' . implode(', ', Visibility::values())], 400);
        }

        $experience->setVisibility(Visibility::from($visibilityValue));
        $this->em->flush();

        return $this->json($this->mapper->toDto($experience));
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function formatViolations(ConstraintViolationListInterface $violations): array
    {
        $errors = [];
        foreach ($violations as $violation) {
            $errors[] = [
                'field'   => (string) $violation->getPropertyPath(),
                'message' => $violation->getMessage(),
            ];
        }
        return $errors;
    }
}
