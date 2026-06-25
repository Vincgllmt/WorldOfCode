<?php

namespace App\Controller;

use App\Dto\CvLayoutRequest;
use App\Mapper\UserMapper;
use App\Repository\UserRepository;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\UserResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[OA\Tag(name: 'CV Public')]
final class CvPublicController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private UserMapper $mapper,
        private ValidatorInterface $validator
    ) {}

    #[Route('api/user/{id}/cv/share-link', name: 'cv_share_link_generate', methods: ['POST'])]
    #[OA\Post(
        summary: 'Genere ou regenere le lien de partage public du CV',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Token genere',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'token', type: 'string'),
                        new OA\Property(property: 'url', type: 'string')
                    ],
                    type: 'object'
                )
            ),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve')
        ]
    )]
    public function generateShareLink(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        if ($user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $token = Uuid::v4()->toRfc4122();
        $user->setCvPublicToken($token);
        $this->userRepo->save($user, true);

        return $this->json(['token' => $token, 'url' => '/cv/' . $token]);
    }

    #[Route('api/cv/{token}', name: 'cv_public_get', methods: ['GET'])]
    #[OA\Get(
        summary: 'Acces public au CV via token de partage (sans authentification)',
        parameters: [new OA\Parameter(name: 'token', in: 'path', required: true, schema: new OA\Schema(type: 'string'))],
        responses: [
            new OA\Response(
                response: 200,
                description: 'CV public (champs PUBLIC uniquement)',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 404, description: 'Token invalide ou revoque')
        ]
    )]
    public function getPublicCv(string $token): JsonResponse
    {
        $user = $this->userRepo->findOneBy(['cvPublicToken' => $token]);
        if (!$user) {
            return $this->json(['error' => 'Not found'], 404);
        }

        return $this->json($this->mapper->toDto($user, null));
    }

    #[Route('api/user/{id}/cv/layout', name: 'cv_layout_update', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Met a jour le template et la couleur d\'accent du CV',
        parameters: [new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))],
        responses: [
            new OA\Response(response: 200, description: 'Layout mis a jour', content: new Model(type: UserResponse::class)),
            new OA\Response(response: 403, description: 'Acces interdit'),
            new OA\Response(response: 404, description: 'Utilisateur non trouve'),
            new OA\Response(response: 422, description: 'Erreurs de validation')
        ]
    )]
    public function updateCvLayout(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        $currentUser = $this->getUser();

        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }
        if ($user !== $currentUser) {
            return $this->json(['error' => 'Access denied'], 403);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Invalid JSON payload'], 400);
        }

        $dto = new CvLayoutRequest();
        $dto->cvLayout = $payload['cvLayout'] ?? null;
        $dto->cvAccentColor = $payload['cvAccentColor'] ?? null;

        $violations = $this->validator->validate($dto);
        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $v) {
                $errors[$v->getPropertyPath()] = $v->getMessage();
            }
            return $this->json(['error' => 'Validation failed', 'details' => $errors], 422);
        }

        if (array_key_exists('cvLayout', $payload) && $dto->cvLayout !== null) {
            $user->setCvLayout($dto->cvLayout);
        }
        if (array_key_exists('cvAccentColor', $payload)) {
            $user->setCvAccentColor($dto->cvAccentColor);
        }

        $this->userRepo->save($user, true);

        return $this->json($this->mapper->toDto($user, $currentUser));
    }
}
