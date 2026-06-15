<?php

namespace App\Tests\Controller;

use App\Controller\AuthenticationController;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\SkillMapper;
use App\Mapper\UserLinkMapper;
use App\Mapper\UserMapper;
use App\Repository\UserRepository;
use App\Service\PasswordResetService;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\RateLimiter\Storage\InMemoryStorage;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use App\Service\LoginNotificationService;
use App\Service\TwoFactorService;
use App\Service\TrustedDeviceService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

/**
 * 🎮 Portal - Tests unitaires du AuthenticationController
 *
 * Chell     = utilisateur standard (testeur principal)
 * GLaDOS    = utilisateur avec email déjà pris
 * Wheatley  = utilisateur avec username déjà pris
 */
class AuthenticationControllerTest extends TestCase
{
    private const CHELL_USERNAME = 'Chell';
    private const CHELL_PASSWORD = 'Ap3rtur3Sc!ence';
    private const CHELL_EMAIL    = 'chell@aperture.lab';

    private UserMapper $userMapper;
    private LoggerInterface $userErrorLogger;
    private AuthenticationController $controller;

    protected function setUp(): void
    {
        $skillMapper            = new SkillMapper();
        $linkMapper             = new UserLinkMapper();
        $this->userMapper       = new UserMapper($skillMapper, $linkMapper);
        $this->userErrorLogger  = $this->createMock(LoggerInterface::class);
        $this->controller       = new AuthenticationController($this->userMapper, $this->userErrorLogger);
        $this->controller->setContainer(new Container());
    }

    // ======================================================================
    //  Helpers
    // ======================================================================

    private function makeRegisterRequest(array $overrides = []): Request
    {
        $data = array_merge([
            'username'  => self::CHELL_USERNAME,
            'password'  => self::CHELL_PASSWORD,
            'firstname' => 'Chell',
            'lastname'  => 'Aperture',
            'email'     => self::CHELL_EMAIL,
        ], $overrides);

        return new Request(content: json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function makePasswordHasher(string $hash = 'hashed-password'): UserPasswordHasherInterface
    {
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('hashPassword')->willReturn($hash);
        return $hasher;
    }

    private function makeRateLimiter(bool $accepted = true): RateLimiterFactory
    {
        $storage = new InMemoryStorage();
        $limit   = $accepted ? 100000 : 1;

        $factory = new RateLimiterFactory([
            'id'     => 'login_attempts',
            'policy' => 'token_bucket',
            'limit'  => $limit,
            'rate'   => ['interval' => '1 minute'],
        ], $storage);

        if (!$accepted) {
            // authenticate() construit la clé : sprintf('%s_%s', strtolower($username), $request->getClientIp())
            // Avec new Request() sans paramètres, getClientIp() retourne null → clé = 'chell_'
            $factory->create(sprintf('%s_', strtolower(self::CHELL_USERNAME)))->consume(1);
        }

        return $factory;
    }

    /**
     * Limiteur pour register() : la clé est l'IP cliente ($request->getClientIp()).
     * Avec new Request() sans server params, getClientIp() retourne null → clé = null.
     */
    private function makeRegisterRateLimiter(bool $accepted = true): RateLimiterFactory
    {
        $storage = new InMemoryStorage();
        $factory = new RateLimiterFactory([
            'id'     => 'register_attempts',
            'policy' => 'token_bucket',
            'limit'  => $accepted ? 100000 : 1,
            'rate'   => ['interval' => '1 hour'],
        ], $storage);

        if (!$accepted) {
            // Épuise le quota sur la clé utilisée par register() (IP null).
            $factory->create(null)->consume(1);
        }

        return $factory;
    }

    /**
     * Crée un container mocké qui expose le TokenStorage avec un utilisateur donné.
     * has('serializer') retourne false pour que json() utilise le fallback JsonResponse.
     */
    private function makeContainerWithUser(?User $user): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => $id === 'security.token_storage'
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage' => $tokenStorage,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    /**
     * Container mocké avec un token null (utilisateur non authentifié).
     */
    private function makeContainerWithNullToken(): ContainerInterface
    {
        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn(null);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => $id === 'security.token_storage'
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage' => $tokenStorage,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function buildUserWithId(int $id = 1): User
    {
        $user = new User();
        $user->setUsername(self::CHELL_USERNAME)
            ->setEmail(self::CHELL_EMAIL)
            ->setFirstname('Chell')
            ->setLastname('Aperture')
            ->setPassword('hashed-password')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    // ======================================================================
    //  register()
    // ======================================================================

    public function testRegisterSuccess(): void
    {
        $request = $this->makeRegisterRequest(['avatarUrl' => 'https://aperture.lab/chell.png']);
        $hasher  = $this->makePasswordHasher();

        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->once())->method('findByUsernameInsensitive')->willReturn(null);
        $repo->expects($this->once())->method('findOneBy')->willReturn(null);
        // SEC-3 (fixé) : findAll() n'est plus appelé dans register() — l'auto-élévation a été retirée.
        $repo->expects($this->never())->method('findAll');
        $repo->expects($this->once())->method('save')->willReturnCallback(function (User $user): void {
            $idProp = new \ReflectionProperty(User::class, 'id');
            $idProp->setValue($user, 1);
            $user->onCreate();
        });

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['id']);
        $this->assertSame(self::CHELL_USERNAME, $payload['username']);
        $this->assertSame('ROLE_USER', $payload['role']);
        $this->assertSame('https://aperture.lab/chell.png', $payload['avatarUrl']);
    }

    public function testRegisterAlwaysCreatesRegularUserEvenWhenDatabaseIsEmpty(): void
    {
        // SEC-3 (fixé) : l'auto-élévation du premier inscrit en ADMIN a été retirée.
        // Même si la base est vide, /api/register ne doit JAMAIS créer un admin.
        // Pour créer un admin, utiliser la commande php bin/console app:create-admin.
        $request = $this->makeRegisterRequest();
        $hasher  = $this->makePasswordHasher();

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByUsernameInsensitive')->willReturn(null);
        $repo->method('findOneBy')->willReturn(null);
        // findAll() ne doit plus être appelé du tout ; on ne le configure plus.
        $repo->method('save')->willReturnCallback(function (User $user): void {
            $idProp = new \ReflectionProperty(User::class, 'id');
            $idProp->setValue($user, 1);
            $user->onCreate();
        });

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('ROLE_USER', $payload['role']);
    }

    public function testRegisterFailsWhenRequiredFieldsAreMissing(): void
    {
        $request = new Request(content: json_encode(['username' => self::CHELL_USERNAME], JSON_THROW_ON_ERROR));
        $hasher  = $this->makePasswordHasher();
        $repo    = $this->createMock(UserRepository::class);

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testRegisterFailsWhenEmailFormatIsInvalid(): void
    {
        $request = $this->makeRegisterRequest(['email' => 'not-a-valid-email']);
        $hasher  = $this->makePasswordHasher();
        $repo    = $this->createMock(UserRepository::class);

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testRegisterFailsWhenUsernameIsAlreadyTaken(): void
    {
        // Wheatley essaie de prendre le username de Chell
        $request = $this->makeRegisterRequest(['username' => 'Wheatley']);
        $hasher  = $this->makePasswordHasher();

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByUsernameInsensitive')->willReturn(new User()); // username pris

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testRegisterFailsWhenEmailIsAlreadyTaken(): void
    {
        // GLaDOS essaie de s'enregistrer avec l'email de Chell
        $request = $this->makeRegisterRequest(['username' => 'GLaDOS', 'email' => self::CHELL_EMAIL]);
        $hasher  = $this->makePasswordHasher();

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByUsernameInsensitive')->willReturn(null);
        $repo->method('findOneBy')->willReturn(new User()); // email pris

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testRegisterFailsWhenPasswordIsTooWeak(): void
    {
        $request = $this->makeRegisterRequest(['password' => 'weak']);
        $hasher  = $this->makePasswordHasher();

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findByUsernameInsensitive')->willReturn(null);
        $repo->method('findOneBy')->willReturn(null);

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter());

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testRegisterFailsWhenRateLimitIsExceeded(): void
    {
        // SEC-5 : /api/register est désormais protégé par un rate limiter (3/h par IP).
        $request = $this->makeRegisterRequest();
        $hasher  = $this->makePasswordHasher();

        // Le repo ne doit jamais être touché : le rejet se fait avant toute logique.
        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->never())->method('save');

        $response = $this->controller->register($request, $hasher, $repo, $this->makeRegisterRateLimiter(false));

        $this->assertSame(429, $response->getStatusCode());
    }

    // ======================================================================
    //  authenticate()
    // ======================================================================

    public function testAuthenticateSuccess(): void
    {
        $request = new Request(content: json_encode([
            'username' => self::CHELL_USERNAME,
            'password' => self::CHELL_PASSWORD,
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->willReturn(true);

        $user = new User();
        $user->setEmail('chell@aperture.science');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $methodName = method_exists(JWTTokenManagerInterface::class, 'createFromPayload') ? 'onlyMethods' : 'addMethods';
        $jwt = $this->getMockBuilder(JWTTokenManagerInterface::class)
            ->{$methodName}(['createFromPayload'])
            ->getMockForAbstractClass();
        $jwt->method('createFromPayload')->willReturn('aperture.jwt.temptoken');

        $response = $this->controller->authenticate($request, $hasher, $jwt, $repo, $this->makeRateLimiter(), $this->createMock(TwoFactorService::class), $this->createMock(TrustedDeviceService::class), $this->createMock(LoginNotificationService::class));

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['requires2FA']);
        $this->assertSame('aperture.jwt.temptoken', $payload['tempToken']);
    }

    public function testAuthenticateFailsWhenFieldsAreMissing(): void
    {
        $request = new Request(content: json_encode(['username' => self::CHELL_USERNAME], JSON_THROW_ON_ERROR));

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $repo   = $this->createMock(UserRepository::class);
        $jwt    = $this->createMock(JWTTokenManagerInterface::class);

        $response = $this->controller->authenticate($request, $hasher, $jwt, $repo, $this->makeRateLimiter(), $this->createMock(TwoFactorService::class), $this->createMock(TrustedDeviceService::class), $this->createMock(LoginNotificationService::class));

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testAuthenticateFailsWhenRateLimitIsExceeded(): void
    {
        $request = new Request(content: json_encode([
            'username' => self::CHELL_USERNAME,
            'password' => self::CHELL_PASSWORD,
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $repo   = $this->createMock(UserRepository::class);
        $jwt    = $this->createMock(JWTTokenManagerInterface::class);

        $response = $this->controller->authenticate($request, $hasher, $jwt, $repo, $this->makeRateLimiter(false), $this->createMock(TwoFactorService::class), $this->createMock(TrustedDeviceService::class), $this->createMock(LoginNotificationService::class));

        $this->assertSame(429, $response->getStatusCode());
    }

    public function testAuthenticateFailsWhenCredentialsAreInvalid(): void
    {
        $request = new Request(content: json_encode([
            'username' => self::CHELL_USERNAME,
            'password' => 'Wr0ngP4ssw0rd!',
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->willReturn(false);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn(new User());

        $jwt = $this->createMock(JWTTokenManagerInterface::class);

        $response = $this->controller->authenticate($request, $hasher, $jwt, $repo, $this->makeRateLimiter(), $this->createMock(TwoFactorService::class), $this->createMock(TrustedDeviceService::class), $this->createMock(LoginNotificationService::class));

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testAuthenticateBypassesTwoFAWhenDeviceIsTrusted(): void
    {
        // Request avec cookie de device trusted
        $cookieName = TrustedDeviceService::getCookieName();
        $request = new Request(
            cookies: [$cookieName => 'trusted-device-token-xyz'],
            content: json_encode([
                'username' => self::CHELL_USERNAME,
                'password' => self::CHELL_PASSWORD,
            ], JSON_THROW_ON_ERROR),
        );

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->willReturn(true);

        $user = new User();
        $user->setEmail('chell@aperture.science');
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('create')->willReturn('direct.jwt.no2fa');

        // Device trusted → bypass 2FA
        $trustedDeviceService = $this->createMock(TrustedDeviceService::class);
        $trustedDeviceService->method('isDeviceTrusted')->willReturn(true);

        // recordLogin doit être appelé (ligne 208)
        $loginNotificationService = $this->createMock(LoginNotificationService::class);
        $loginNotificationService->expects($this->once())->method('recordLogin');

        $response = $this->controller->authenticate(
            $request,
            $hasher,
            $jwt,
            $repo,
            $this->makeRateLimiter(),
            $this->createMock(TwoFactorService::class),
            $trustedDeviceService,
            $loginNotificationService,
        );

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('direct.jwt.no2fa', $payload['token']);
        // Pas de requires2FA ni tempToken
        $this->assertArrayNotHasKey('requires2FA', $payload);
        $this->assertArrayNotHasKey('tempToken', $payload);
    }

    public function testAuthenticateReturns500WhenTwoFAEmailCannotBeSent(): void
    {
        $request = new Request(content: json_encode([
            'username' => self::CHELL_USERNAME,
            'password' => self::CHELL_PASSWORD,
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('isPasswordValid')->willReturn(true);

        $user = new User();
        $user->setEmail('chell@aperture.science');
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $jwt = $this->createMock(JWTTokenManagerInterface::class);

        // L'envoi du code 2FA jette une TransportException
        $twoFactorService = $this->createMock(TwoFactorService::class);
        $twoFactorService->method('generateAndSend')
            ->willThrowException($this->createMock(TransportExceptionInterface::class));

        $response = $this->controller->authenticate(
            $request,
            $hasher,
            $jwt,
            $repo,
            $this->makeRateLimiter(),
            $twoFactorService,
            $this->createMock(TrustedDeviceService::class),
            $this->createMock(LoginNotificationService::class),
        );

        $this->assertSame(500, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Unable to send verification email.', $payload['error']);
    }

    public function testAuthenticateFailsWhenUserDoesNotExist(): void
    {
        $request = new Request(content: json_encode([
            'username' => 'Cave Johnson',
            'password' => self::CHELL_PASSWORD,
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $repo   = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn(null);
        $jwt = $this->createMock(JWTTokenManagerInterface::class);

        $response = $this->controller->authenticate($request, $hasher, $jwt, $repo, $this->makeRateLimiter(), $this->createMock(TwoFactorService::class), $this->createMock(TrustedDeviceService::class), $this->createMock(LoginNotificationService::class));

        $this->assertSame(401, $response->getStatusCode());
    }

    // ======================================================================
    //  me()
    // ======================================================================

    public function testMeReturnsCurrentUser(): void
    {
        $user = $this->buildUserWithId(42);

        $controller = new AuthenticationController($this->userMapper, $this->userErrorLogger);
        $controller->setContainer($this->makeContainerWithUser($user));

        $response = $controller->me();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(self::CHELL_USERNAME, $payload['username']);
        $this->assertSame(self::CHELL_EMAIL, $payload['email']);
    }

    public function testMeFailsWhenUserIsNotAuthenticated(): void
    {
        $controller = new AuthenticationController($this->userMapper, $this->userErrorLogger);
        $controller->setContainer($this->makeContainerWithNullToken());

        $response = $controller->me();

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testMeReturns400WhenUserIsUnexpectedType(): void
    {
        // L'utilisateur n'est pas une instance de App\Entity\User (cas défensif)
        $nonAppUser = $this->createMock(\Symfony\Component\Security\Core\User\UserInterface::class);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($nonAppUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(fn(string $id) => $id === 'security.token_storage');
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage' => $tokenStorage,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        $controller = new AuthenticationController($this->userMapper, $this->userErrorLogger);
        $controller->setContainer($container);

        $response = $controller->me();

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Unexpected user type', $payload['error']);
    }

    // ======================================================================
    //  requestPasswordReset()
    // ======================================================================

    public function testRequestPasswordResetSuccessWhenUserExists(): void
    {
        $user    = new User();
        $request = new Request(content: json_encode(['email' => self::CHELL_EMAIL], JSON_THROW_ON_ERROR));

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $resetService = $this->createMock(PasswordResetService::class);
        $resetService->expects($this->once())->method('requestReset')->with($user);

        $response = $this->controller->requestPasswordReset($request, $repo, $resetService, $this->makeRegisterRateLimiter());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('message', $payload);
    }

    public function testRequestPasswordResetSuccessWhenUserDoesNotExist(): void
    {
        // Sécurité : même réponse 200 même si l'email est inconnu (évite l'énumération)
        $request = new Request(content: json_encode(['email' => 'glados@aperture.lab'], JSON_THROW_ON_ERROR));

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $resetService = $this->createMock(PasswordResetService::class);
        $resetService->expects($this->never())->method('requestReset');

        $response = $this->controller->requestPasswordReset($request, $repo, $resetService, $this->makeRegisterRateLimiter());

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testRequestPasswordResetFailsWhenEmailIsMissing(): void
    {
        $request      = new Request(content: json_encode([], JSON_THROW_ON_ERROR));
        $repo         = $this->createMock(UserRepository::class);
        $resetService = $this->createMock(PasswordResetService::class);

        $response = $this->controller->requestPasswordReset($request, $repo, $resetService, $this->makeRegisterRateLimiter());

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testRequestPasswordResetFailsWhenEmailFormatIsInvalid(): void
    {
        $request      = new Request(content: json_encode(['email' => 'not-an-email'], JSON_THROW_ON_ERROR));
        $repo         = $this->createMock(UserRepository::class);
        $resetService = $this->createMock(PasswordResetService::class);

        $response = $this->controller->requestPasswordReset($request, $repo, $resetService, $this->makeRegisterRateLimiter());

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testRequestPasswordResetFailsWhenEmailTransportFails(): void
    {
        $user    = new User();
        $request = new Request(content: json_encode(['email' => self::CHELL_EMAIL], JSON_THROW_ON_ERROR));

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $resetService = $this->createMock(PasswordResetService::class);
        $resetService->method('requestReset')
            ->willThrowException($this->createMock(TransportExceptionInterface::class));

        $response = $this->controller->requestPasswordReset($request, $repo, $resetService, $this->makeRegisterRateLimiter());

        $this->assertSame(500, $response->getStatusCode());
    }

    public function testRequestPasswordResetFailsWhenRateLimitIsExceeded(): void
    {
        // SEC-10 : /api/reset-password/request est désormais protégé (3/h par IP).
        $request = new Request(content: json_encode(['email' => self::CHELL_EMAIL], JSON_THROW_ON_ERROR));

        // Aucun email ne doit partir quand le quota est dépassé.
        $repo         = $this->createMock(UserRepository::class);
        $resetService = $this->createMock(PasswordResetService::class);
        $resetService->expects($this->never())->method('requestReset');

        $response = $this->controller->requestPasswordReset($request, $repo, $resetService, $this->makeRegisterRateLimiter(false));

        $this->assertSame(429, $response->getStatusCode());
    }

    // ======================================================================
    //  confirmPasswordReset()
    // ======================================================================

    public function testConfirmPasswordResetSuccess(): void
    {
        $request = new Request(content: json_encode([
            'token'    => 'valid-aperture-token',
            'password' => self::CHELL_PASSWORD,
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->makePasswordHasher();

        $resetService = $this->createMock(PasswordResetService::class);
        $resetService->method('resetPassword')->willReturn(true);

        $response = $this->controller->confirmPasswordReset($request, $resetService, $hasher);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('message', $payload);
    }

    public function testConfirmPasswordResetFailsWhenFieldsAreMissing(): void
    {
        $request = new Request(content: json_encode(['token' => 'some-token'], JSON_THROW_ON_ERROR));

        $hasher       = $this->makePasswordHasher();
        $resetService = $this->createMock(PasswordResetService::class);

        $response = $this->controller->confirmPasswordReset($request, $resetService, $hasher);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testConfirmPasswordResetFailsWhenPasswordIsTooWeak(): void
    {
        $request = new Request(content: json_encode([
            'token'    => 'valid-aperture-token',
            'password' => 'weak',
        ], JSON_THROW_ON_ERROR));

        $hasher       = $this->makePasswordHasher();
        $resetService = $this->createMock(PasswordResetService::class);

        $response = $this->controller->confirmPasswordReset($request, $resetService, $hasher);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testConfirmPasswordResetFailsWhenTokenIsInvalidOrExpired(): void
    {
        $request = new Request(content: json_encode([
            'token'    => 'expired-or-invalid-token',
            'password' => self::CHELL_PASSWORD,
        ], JSON_THROW_ON_ERROR));

        $hasher = $this->makePasswordHasher();

        $resetService = $this->createMock(PasswordResetService::class);
        $resetService->method('resetPassword')->willReturn(false);

        $response = $this->controller->confirmPasswordReset($request, $resetService, $hasher);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    // ======================================================================
    //  verify2FA()
    // ======================================================================

    private function makeVerify2FARequest(array $overrides = []): Request
    {
        $data = array_merge([
            'tempToken'      => 'valid.temp.token',
            'code'           => '123456',
            'rememberDevice' => false,
        ], $overrides);

        return new Request(content: json_encode($data, JSON_THROW_ON_ERROR));
    }

    private function makeRateLimiterFor2FA(int $userId, bool $accepted = true): RateLimiterFactory
    {
        $storage = new InMemoryStorage();
        $limit   = $accepted ? 100000 : 1;

        $factory = new RateLimiterFactory([
            'id'     => '2fa_attempts',
            'policy' => 'token_bucket',
            'limit'  => $limit,
            'rate'   => ['interval' => '1 minute'],
        ], $storage);

        if (!$accepted) {
            $factory->create(sprintf('2fa_%d', $userId))->consume(1);
        }

        return $factory;
    }

    public function testVerify2FAFailsWhenFieldsAreMissing(): void
    {
        $request = new Request(content: json_encode(['tempToken' => 'some.token'], JSON_THROW_ON_ERROR));

        $response = $this->controller->verify2FA(
            $request,
            $this->createMock(JWTTokenManagerInterface::class),
            $this->createMock(UserRepository::class),
            $this->createMock(TwoFactorService::class),
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA(1),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testVerify2FAFailsWhenTokenIsInvalid(): void
    {
        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willThrowException(new \Exception('Invalid token'));

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(),
            $jwt,
            $this->createMock(UserRepository::class),
            $this->createMock(TwoFactorService::class),
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA(1),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testVerify2FAFailsWhenTokenHasNo2FAPendingFlag(): void
    {
        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['username' => self::CHELL_USERNAME]); // pas de 2fa_pending

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(),
            $jwt,
            $this->createMock(UserRepository::class),
            $this->createMock(TwoFactorService::class),
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA(1),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testVerify2FAFailsWhenUsernameIsMissingFromToken(): void
    {
        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['2fa_pending' => true]); // pas de username

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(),
            $jwt,
            $this->createMock(UserRepository::class),
            $this->createMock(TwoFactorService::class),
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA(1),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testVerify2FAFailsWhenUserNotFound(): void
    {
        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['2fa_pending' => true, 'username' => 'GLaDOS']);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(),
            $jwt,
            $repo,
            $this->createMock(TwoFactorService::class),
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA(1),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testVerify2FAFailsWhenRateLimitIsExceeded(): void
    {
        $user = $this->buildUserWithId(1);

        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['2fa_pending' => true, 'username' => self::CHELL_USERNAME]);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(),
            $jwt,
            $repo,
            $this->createMock(TwoFactorService::class),
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA($user->getId(), false),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(429, $response->getStatusCode());
    }

    public function testVerify2FAFailsWhenCodeIsInvalid(): void
    {
        $user = $this->buildUserWithId(1);

        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['2fa_pending' => true, 'username' => self::CHELL_USERNAME]);

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $twoFactorService = $this->createMock(TwoFactorService::class);
        $twoFactorService->method('verifyCode')->willReturn(false);

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(['code' => '000000']),
            $jwt,
            $repo,
            $twoFactorService,
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA($user->getId()),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(401, $response->getStatusCode());
    }

    public function testVerify2FASuccessWithoutRememberDevice(): void
    {
        $user = $this->buildUserWithId(1);

        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['2fa_pending' => true, 'username' => self::CHELL_USERNAME]);
        $jwt->method('create')->willReturn('final.aperture.token');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $twoFactorService = $this->createMock(TwoFactorService::class);
        $twoFactorService->method('verifyCode')->willReturn(true);

        $loginNotificationService = $this->createMock(LoginNotificationService::class);
        $loginNotificationService->expects($this->once())->method('recordLogin');

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(['rememberDevice' => false]),
            $jwt,
            $repo,
            $twoFactorService,
            $this->createMock(TrustedDeviceService::class),
            $this->makeRateLimiterFor2FA($user->getId()),
            $loginNotificationService
        );

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('final.aperture.token', $payload['token']);
        $this->assertEmpty($response->headers->getCookies());
    }

    public function testVerify2FASuccessWithRememberDeviceSetsCookie(): void
    {
        $user = $this->buildUserWithId(1);

        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('parse')->willReturn(['2fa_pending' => true, 'username' => self::CHELL_USERNAME]);
        $jwt->method('create')->willReturn('final.aperture.token');

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn($user);

        $twoFactorService = $this->createMock(TwoFactorService::class);
        $twoFactorService->method('verifyCode')->willReturn(true);

        $trustedDeviceService = $this->createMock(TrustedDeviceService::class);
        $trustedDeviceService->method('generateToken')->willReturn('raw-device-token-aperture');
        $trustedDeviceService->method('getTrustDays')->willReturn(90);

        $response = $this->controller->verify2FA(
            $this->makeVerify2FARequest(['rememberDevice' => true]),
            $jwt,
            $repo,
            $twoFactorService,
            $trustedDeviceService,
            $this->makeRateLimiterFor2FA($user->getId()),
            $this->createMock(LoginNotificationService::class)
        );

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('final.aperture.token', $payload['token']);

        $cookies = $response->headers->getCookies();
        $this->assertNotEmpty($cookies);
        $this->assertSame(TrustedDeviceService::getCookieName(), $cookies[0]->getName());
        $this->assertSame('raw-device-token-aperture', $cookies[0]->getValue());
    }

    // ======================================================================
    //  refresh()
    // ======================================================================

    public function testRefreshReturnsNewTokenForAuthenticatedUser(): void
    {
        $user = $this->buildUserWithId(42);

        $controller = new AuthenticationController($this->userMapper, $this->userErrorLogger);
        $controller->setContainer($this->makeContainerWithUser($user));

        $jwt = $this->createMock(JWTTokenManagerInterface::class);
        $jwt->method('create')->willReturn('refreshed.aperture.token');

        $response = $controller->refresh($jwt);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('refreshed.aperture.token', $payload['token']);
    }

    public function testRefreshFailsWhenUserIsNotAuthenticated(): void
    {
        $controller = new AuthenticationController($this->userMapper, $this->userErrorLogger);
        $controller->setContainer($this->makeContainerWithNullToken());

        $response = $controller->refresh($this->createMock(JWTTokenManagerInterface::class));

        $this->assertSame(401, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }
}
