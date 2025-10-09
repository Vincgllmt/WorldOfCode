<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\UserResponse;
use App\Mapper\UserMapper;
use App\Service\PasswordValidator;
use Symfony\Component\RateLimiter\RateLimiterFactory;



class AuthenticationController extends AbstractController
{
    private UserMapper $userMapper;

    public function __construct(UserMapper $userMapper)
    {
        $this->userMapper = $userMapper;
    }

    #[Route('api/register', name: 'register', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un nouveau compte utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['username', 'password'],
                properties: [
                    new OA\Property(property: 'username', type: 'string', example: 'alice'),
                    new OA\Property(property: 'password', type: 'string', example: '12345678')
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Utilisateur créé avec succès',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 400, description: 'Champs manquants'),
            new OA\Response(response: 409, description: 'Nom d’utilisateur déjà pris')
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        UserRepository $userRepository
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $username = $data['username'] ?? null;
        $plainPassword = $data['password'] ?? null;

        if (!$username || !$plainPassword) {
            return $this->json(['error' => 'Missing username or password'], 400);
        }

        $existingUser = $userRepository->findByUsernameInsensitive($username);

        if ($existingUser) {
            return $this->json(['error' => 'Username already exists'], 409);
        }

        $error = PasswordValidator::validate($plainPassword);
        if ($error) {
            return $this->json(['error' => $error], 400);
        }

        $user = new User();
        $user->setUsername($username);
        $user->setPassword($passwordHasher->hashPassword($user, $plainPassword));
        $user->setRole(UserRole::ROLE_USER);

        if (count($userRepository->findAll()) === 0) {
            $user->setRole(UserRole::ROLE_ADMIN);
        }

        $userRepository->save($user);

        return $this->json($this->userMapper->toDto($user), 201);
    }
    ####
    ##
    ####
    #[Route('/api/authenticate', name: 'authenticate', methods: ['POST'])]
    #[OA\Post(
        summary: 'Authentifie un utilisateur et renvoie un token JWT',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['username', 'password'],
                properties: [
                    new OA\Property(property: 'username', type: 'string', example: 'alice'),
                    new OA\Property(property: 'password', type: 'string', example: '12345678')
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Authentification réussie',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'token', type: 'string', example: 'eyJ0eXAiOiJK...')
                    ],
                    type: 'object'
                )
            ),
            new OA\Response(response: 400, description: 'Champs manquants'),
            new OA\Response(response: 401, description: 'Identifiants invalides')
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function authenticate(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager,
        UserRepository $userRepository,
        RateLimiterFactory $loginAttemptsLimiter
    ): JsonResponse {


        $data = json_decode($request->getContent(), true);

        $username = $data['username'] ?? null;
        $plainPassword = $data['password'] ?? null;

        if (!$username || !$plainPassword) {
            return $this->json(['error' => 'Missing username or password'], 400);
        }

        // bloquer si trop de tentative - multi IP
        $key = sprintf('%s_%s', strtolower($username), $request->getClientIp());
        $limiter = $loginAttemptsLimiter->create($key);


        if (false === $limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Too many login attempts. Please try again later.'], 429);
        }

        $user = $userRepository->findOneBy(['username' => $username]);

        if (!$user || !$passwordHasher->isPasswordValid($user, $plainPassword)) {
            return $this->json(['error' => 'Invalid credentials'], 401);
        }

        $token = $jwtManager->create($user);

        return $this->json(['token' => $token]);
    }
    ####
    ##
    ####
    #[Route('api/me', name: 'me', methods: ['GET'])]
    #[OA\Get(
        summary: 'Renvoie les informations de l’utilisateur connecté',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Utilisateur connecté',
                content: new Model(type: UserResponse::class)
            ),
            new OA\Response(response: 400, description: 'Type de user inattendu'),
            new OA\Response(response: 401, description: 'Utilisateur non authentifié')
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function me(): JsonResponse
    {
        $user = $this->getUser();

        if ($user && !$user instanceof User) {
            return $this->json(['error' => 'Unexpected user type'], 400);
        }
        if (!$user && !$user instanceof User) {
            return $this->json(['error' => 'Invalid request or unauthenticated'], 401);
        }

        return $this->json($this->userMapper->toDto($user));
    }
}
