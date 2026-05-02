<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
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
use App\Service\TwoFactorService;
use App\Service\TrustedDeviceService;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use App\Service\LoginNotificationService;
use App\Service\PasswordResetService;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\HttpFoundation\Cookie;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;


class AuthenticationController extends AbstractController
{
    private UserMapper $userMapper;
    private LoggerInterface $userErrorLogger;

    public function __construct(
        UserMapper $userMapper,
        #[Autowire(service: 'monolog.logger.user_error')]
        LoggerInterface $userErrorLogger
    ) {
        $this->userMapper = $userMapper;
        $this->userErrorLogger = $userErrorLogger;
    }

    #[Route('api/register', name: 'register', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un nouveau compte utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['username', 'password', 'firstname', 'lastname', 'email'],
                properties: [
                    new OA\Property(property: 'username', type: 'string', example: 'alice'),
                    new OA\Property(property: 'password', type: 'string', example: '12345678'),
                    new OA\Property(property: 'firstname', type: 'string', example: 'Alice'),
                    new OA\Property(property: 'lastname', type: 'string', example: 'Dupont'),
                    new OA\Property(property: 'email', type: 'string', example: 'alice@example.com')
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
            new OA\Response(response: 400, description: 'Champs manquants ou invalides'),
            new OA\Response(response: 409, description: 'Nom d’utilisateur ou email déjà pris')
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
        $firstname = $data['firstname'] ?? null;
        $lastname = $data['lastname'] ?? null;
        $email = $data['email'] ?? null;
        $avatarUrl = $data['avatarUrl'] ?? null;

        if (!$username || !$plainPassword || !$firstname || !$lastname || !$email) {
            return $this->json(['error' => 'Il manque un/des champs obligatoire. '], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Mauvais format de mail.'], 400);
        }

        if ($userRepository->findByUsernameInsensitive($username)) {
            return $this->json(['error' => 'Ce nom d\'utilisateur est déjà pris.'], 409);
        }

        if ($userRepository->findOneBy(['email' => $email])) {
            return $this->json(['error' => 'Un compte avec cet email existe déjà.'], 409);
        }

        $error = PasswordValidator::validate($plainPassword);
        if ($error) {
            return $this->json(['error' => $error], 400);
        }

        $user = new User();
        $user->setUsername($username)
            ->setPassword($passwordHasher->hashPassword($user, $plainPassword))
            ->setFirstname($firstname)
            ->setLastname($lastname)
            ->setEmail($email)
            ->setRole(UserRole::ROLE_USER)
            ->setAvatarUrl($avatarUrl);

        if (count($userRepository->findAll()) === 0) {
            $user->setRole(UserRole::ROLE_ADMIN);
        }

        $userRepository->save($user);

        return $this->json($this->userMapper->toDto($user), 201);
    }

    #[Route('/api/authenticate', name: 'authenticate', methods: ['POST'])]
    #[OA\Post(
        summary: 'Authentifie un utilisateur (étape 1 : credentials puis code 2FA envoyé par email)',
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
                description: '2FA requis, code envoyé par email',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'requires2FA', type: 'boolean', example: true),
                        new OA\Property(property: 'tempToken', type: 'string', example: 'eyJ0eXAiOiJK...')
                    ],
                    type: 'object'
                )
            ),
            new OA\Response(response: 400, description: 'Champs manquants'),
            new OA\Response(response: 401, description: 'Identifiants invalides'),
            new OA\Response(response: 429, description: 'Trop de tentatives')
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function authenticate(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager,
        UserRepository $userRepository,
        RateLimiterFactory $loginAttemptsLimiter,
        TwoFactorService $twoFactorService,
        TrustedDeviceService $trustedDeviceService,
        LoginNotificationService $loginNotificationService
    ): JsonResponse {

        $data = json_decode($request->getContent(), true);

        $username = $data['username'] ?? null;
        $plainPassword = $data['password'] ?? null;

        if (!$username || !$plainPassword) {
            return $this->json(['error' => 'Missing username or password'], 400);
        }

        $key = sprintf('%s_%s', strtolower($username), $request->getClientIp());
        $limiter = $loginAttemptsLimiter->create($key);

        if (false === $limiter->consume(1)->isAccepted()) {
            $this->userErrorLogger->warning('Too many login attempts', [
                'route'       => 'authenticate',
                'method'      => $request->getMethod(),
                'ip'          => $request->getClientIp(),
                'user'        => 'anonymous',
                'status_code' => 429,
            ]);
            return $this->json(['error' => 'Too many login attempts. Please try again later.'], 429);
        }

        $user = $userRepository->findOneBy(['username' => $username]);

        if (!$user || !$passwordHasher->isPasswordValid($user, $plainPassword)) {
            $this->userErrorLogger->warning('Invalid credentials', [
                'route'       => 'authenticate',
                'method'      => $request->getMethod(),
                'ip'          => $request->getClientIp(),
                'user'        => 'anonymous',
                'status_code' => 401,
            ]);
            return $this->json(['error' => 'Invalid credentials'], 401);
        }

        // Appareil de confiance → pas besoin de 2FA, JWT direct
        $deviceToken = $request->cookies->get(TrustedDeviceService::getCookieName());
        if ($deviceToken && $trustedDeviceService->isDeviceTrusted($user, $deviceToken)) {
            $token = $jwtManager->create($user);
            $loginNotificationService->recordLogin($user, $request->getClientIp());
            return $this->json(['token' => $token]);
        }

        // Générer et envoyer le code 2FA par email
        try {
            $twoFactorService->generateAndSend($user);
        } catch (TransportExceptionInterface $e) {
            return $this->json(['error' => 'Unable to send verification email.'], 500);
        }

        // Token temporaire avec claim 2fa_pending (bloqué sur les routes protégées)
        $tempToken = $jwtManager->createFromPayload($user, [
            '2fa_pending' => true,
        ]);

        // Masquer l'email : ex "eugenie@gmail.com" → "eu***@gmail.com"
        $email = $user->getEmail();
        $parts = explode('@', $email);
        $local = $parts[0];
        $domain = $parts[1] ?? '';
        $visibleChars = min(2, strlen($local));
        $maskedEmail = substr($local, 0, $visibleChars) . str_repeat('*', max(0, strlen($local) - $visibleChars)) . '@' . $domain;

        return $this->json([
            'requires2FA' => true,
            'tempToken' => $tempToken,
            'maskedEmail' => $maskedEmail,
        ]);
    }

    #[Route('/api/2fa/verify', name: '2fa_verify', methods: ['POST'])]
    #[OA\Post(
        summary: 'Vérifie le code 2FA et renvoie le token JWT final (étape 2)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['tempToken', 'code'],
                properties: [
                    new OA\Property(property: 'tempToken', type: 'string', example: 'eyJ0eXAiOiJK...'),
                    new OA\Property(property: 'code', type: 'string', example: '123456'),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Vérification réussie, token JWT final',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'token', type: 'string', example: 'eyJ0eXAiOiJK...')
                    ],
                    type: 'object'
                )
            ),
            new OA\Response(response: 400, description: 'Champs manquants'),
            new OA\Response(response: 401, description: 'Code invalide ou expiré'),
            new OA\Response(response: 429, description: 'Trop de tentatives')
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function verify2FA(
        Request $request,
        JWTTokenManagerInterface $jwtManager,
        UserRepository $userRepository,
        TwoFactorService $twoFactorService,
        TrustedDeviceService $trustedDeviceService,
        RateLimiterFactory $loginAttemptsLimiter,
        LoginNotificationService $loginNotificationService
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $tempToken      = $data['tempToken'] ?? null;
        $code           = $data['code'] ?? null;
        $rememberDevice = (bool) ($data['rememberDevice'] ?? false);

        if (!$tempToken || !$code) {
            return $this->json(['error' => 'Missing tempToken or code'], 400);
        }

        try {
            $payload = $jwtManager->parse($tempToken);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Invalid or expired token'], 401);
        }

        if (empty($payload['2fa_pending'])) {
            return $this->json(['error' => 'Invalid token type'], 401);
        }

        $username = $payload['username'] ?? null;
        if (!$username) {
            return $this->json(['error' => 'Invalid token'], 401);
        }

        $user = $userRepository->findOneBy(['username' => $username]);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 401);
        }

        // Rate limiter sur les tentatives 2FA
        $key = sprintf('2fa_%s', $user->getId());
        $limiter = $loginAttemptsLimiter->create($key);
        if (false === $limiter->consume(1)->isAccepted()) {
            return $this->json(['error' => 'Too many attempts. Please try again later.'], 429);
        }

        if (!$twoFactorService->verifyCode($user, $code)) {
            $this->userErrorLogger->warning('Invalid 2FA code', [
                'route'       => '2fa_verify',
                'method'      => $request->getMethod(),
                'ip'          => $request->getClientIp(),
                'user'        => $user->getUserIdentifier(),
                'status_code' => 401,
            ]);
            return $this->json(['error' => 'Invalid or expired code'], 401);
        }

        // Code valide → JWT final
        $token    = $jwtManager->create($user);
        $response = $this->json(['token' => $token]);

        // Enregistrer le contexte de connexion et notifier si nouveau pays
        $loginNotificationService->recordLogin($user, $request->getClientIp());

        // Si l'utilisateur veut faire confiance à cet appareil, on pose le cookie
        if ($rememberDevice) {
            $rawToken   = $trustedDeviceService->generateToken($user, $request->headers->get('User-Agent'));
            $cookie = Cookie::create(TrustedDeviceService::getCookieName())
                ->withValue($rawToken)
                ->withExpires(new \DateTimeImmutable(sprintf('+%d days', $trustedDeviceService->getTrustDays())))
                ->withSecure(true)
                ->withHttpOnly(true)
                ->withSameSite(Cookie::SAMESITE_STRICT);
            $response->headers->setCookie($cookie);
        }

        return $response;
    }

    #[Route('/api/auth/refresh', name: 'auth_refresh', methods: ['POST'])]
    #[OA\Post(
        summary: 'Renouvelle le token JWT sans deconnecter l\'utilisateur',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Nouveau token JWT',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'token', type: 'string', example: 'eyJ0eXAiOiJK...')],
                    type: 'object'
                )
            ),
            new OA\Response(response: 401, description: 'Token invalide ou expiré')
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function refresh(JWTTokenManagerInterface $jwtManager): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthenticated'], 401);
        }

        $token = $jwtManager->create($user);

        return $this->json(['token' => $token]);
    }
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
        if (!$user) {
            return $this->json(['error' => 'Invalid request or unauthenticated'], 401);
        }

        return $this->json($this->userMapper->toDto($user));
    }
    #[Route('api/reset-password/request', name: 'reset_password_request', methods: ['POST'])]
    #[OA\Post(
        summary: 'Demande un lien de réinitialisation de mot de passe',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'alice@example.com'),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Email de réinitialisation envoyé'),
            new OA\Response(response: 400, description: 'Champ email manquant ou invalide'),
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function requestPasswordReset(
        Request $request,
        UserRepository $userRepository,
        PasswordResetService $passwordResetService
    ): JsonResponse {

        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? null;

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Invalid or missing email'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json(['message' => 'If the email exists, a reset link was sent.'], 200);
        }

        try {
            $passwordResetService->requestReset($user);
        } catch (TransportExceptionInterface $e) {
            return $this->json(['error' => 'Unable to send email.'], 500);
        }

        return $this->json(['message' => 'Password reset email sent.'], 200);
    }

    #[Route('api/reset-password/confirm', name: 'reset_password_confirm', methods: ['POST'])]
    #[OA\Post(
        summary: 'Réinitialise le mot de passe via un token reçu par email',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['token', 'password'],
                properties: [
                    new OA\Property(property: 'token', type: 'string', example: 'fa3f20b8-8cc5-4d84-987b-3af90b6a69ad'),
                    new OA\Property(property: 'password', type: 'string', example: 'NouveauMotDePasseFort123!'),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Mot de passe réinitialisé avec succès'),
            new OA\Response(response: 400, description: 'Token invalide ou mot de passe incorrect'),
        ]
    )]
    #[OA\Tag(name: 'Authentication')]
    public function confirmPasswordReset(
        Request $request,
        PasswordResetService $passwordResetService,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $token = $data['token'] ?? null;
        $newPassword = $data['password'] ?? null;

        if (!$token || !$newPassword) {
            return $this->json(['error' => 'Missing token or password'], 400);
        }

        if ($error = PasswordValidator::validate($newPassword)) {
            return $this->json(['error' => $error], 400);
        }

        $success = $passwordResetService->resetPassword($token, $newPassword, $passwordHasher);

        if (!$success) {
            return $this->json(['error' => 'Le lien est invalide ou expiré. Veuillez regénérer une modification de mot de passe.'], 400);
        }

        return $this->json(['message' => 'Password successfully reset.'], 200);
    }
}
