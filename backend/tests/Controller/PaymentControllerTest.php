<?php

namespace App\Tests\Controller;

use App\Controller\PaymentController;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use App\Service\StripeService;
use PHPUnit\Framework\TestCase;
use Stripe\PaymentIntent;
use Stripe\Exception\SignatureVerificationException;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Disco Elysium - Tests unitaires du PaymentController
 *
 * HarryDuBois  = utilisateur authentifié (le payeur)
 * KimKitsuragi = mentor (le destinataire du paiement)
 */
class PaymentControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'HarryDuBois'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@revachol.com')
            ->setFirstname($username)
            ->setLastname('Detective')
            ->setPassword('Apocalypse!2051')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeContainer(User $currentUser, bool $isGranted = true): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn($isGranted);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'         => $tokenStorage,
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function makeController(
        User $currentUser,
        ?StripeService $stripeService = null,
        ?UserRepository $userRepository = null,
        bool $isGranted = true,
    ): PaymentController {
        $controller = new PaymentController(
            $stripeService   ?? $this->createMock(StripeService::class),
            $userRepository  ?? $this->createMock(UserRepository::class),
        );

        $controller->setContainer($this->makeContainer($currentUser, $isGranted));

        return $controller;
    }

    private function makeFakeIntent(string $id = 'pi_abc123', string $clientSecret = 'secret_xyz'): PaymentIntent
    {
        return PaymentIntent::constructFrom([
            'id'            => $id,
            'client_secret' => $clientSecret,
            'object'        => 'payment_intent',
        ]);
    }

    private function makeRequest(array $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data));
    }

    // ======================================================================
    //  createIntent()
    // ======================================================================

    public function testCreateIntentReturnsClientSecretAndIntentId(): void
    {
        $harry = $this->buildUser(1);
        $kim   = $this->buildUser(2, 'KimKitsuragi');

        $intent = $this->makeFakeIntent('pi_abc123', 'secret_xyz');

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('createPaymentIntent')->willReturn($intent);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($kim);

        $request  = $this->makeRequest(['mentor_id' => 2, 'amount' => 5000]);
        $response = $this->makeController($harry, $stripeService, $userRepo)->createIntent($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('secret_xyz', $payload['client_secret']);
        $this->assertSame('pi_abc123', $payload['payment_intent_id']);
    }

    public function testCreateIntentPassesCorrectCurrencyToStripe(): void
    {
        $harry = $this->buildUser(1);
        $kim   = $this->buildUser(2, 'KimKitsuragi');

        $intent = $this->makeFakeIntent();

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->once())
            ->method('createPaymentIntent')
            ->with($harry, $kim, 3000, 'usd')
            ->willReturn($intent);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $request  = $this->makeRequest(['mentor_id' => 2, 'amount' => 3000, 'currency' => 'usd']);
        $response = $this->makeController($harry, $stripeService, $userRepo)->createIntent($request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testCreateIntentUsesEurAsDefaultCurrency(): void
    {
        $harry = $this->buildUser(1);
        $kim   = $this->buildUser(2, 'KimKitsuragi');

        $intent = $this->makeFakeIntent();

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->once())
            ->method('createPaymentIntent')
            ->with($harry, $kim, 1000, 'eur')
            ->willReturn($intent);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $request  = $this->makeRequest(['mentor_id' => 2, 'amount' => 1000]);
        $this->makeController($harry, $stripeService, $userRepo)->createIntent($request);
    }

    public function testCreateIntentReturns400WhenMentorIdIsMissing(): void
    {
        $harry = $this->buildUser(1);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->never())->method('createPaymentIntent');

        $request  = $this->makeRequest(['amount' => 5000]);
        $response = $this->makeController($harry, $stripeService)->createIntent($request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testCreateIntentReturns400WhenAmountIsMissing(): void
    {
        $harry = $this->buildUser(1);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->never())->method('createPaymentIntent');

        $request  = $this->makeRequest(['mentor_id' => 2]);
        $response = $this->makeController($harry, $stripeService)->createIntent($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateIntentReturns400WhenAmountIsBelowMinimum(): void
    {
        $harry = $this->buildUser(1);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->never())->method('createPaymentIntent');

        $request  = $this->makeRequest(['mentor_id' => 2, 'amount' => 49]);
        $response = $this->makeController($harry, $stripeService)->createIntent($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateIntentAcceptsMinimumAmount(): void
    {
        $harry = $this->buildUser(1);
        $kim   = $this->buildUser(2, 'KimKitsuragi');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('createPaymentIntent')->willReturn($this->makeFakeIntent());

        $request  = $this->makeRequest(['mentor_id' => 2, 'amount' => 50]);
        $response = $this->makeController($harry, $stripeService, $userRepo)->createIntent($request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testCreateIntentReturns404WhenMentorNotFound(): void
    {
        $harry = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->never())->method('createPaymentIntent');

        $request  = $this->makeRequest(['mentor_id' => 999, 'amount' => 5000]);
        $response = $this->makeController($harry, $stripeService, $userRepo)->createIntent($request);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testCreateIntentReturns400WhenPayerAndMentorAreSame(): void
    {
        $harry = $this->buildUser(1);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($harry);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->never())->method('createPaymentIntent');

        $request  = $this->makeRequest(['mentor_id' => 1, 'amount' => 5000]);
        $response = $this->makeController($harry, $stripeService, $userRepo)->createIntent($request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    // ======================================================================
    //  webhook()
    // ======================================================================

    public function testWebhookReturnsOkOnValidEvent(): void
    {
        $harry = $this->buildUser(1);

        $fakeEvent = \Stripe\Event::constructFrom([
            'id'   => 'evt_1',
            'type' => 'payment_intent.succeeded',
            'data' => ['object' => ['id' => 'pi_test']],
        ]);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('constructWebhookEvent')->willReturn($fakeEvent);
        $stripeService->expects($this->once())->method('handleEvent')->with($fakeEvent);

        $request = new Request();
        $request->headers->set('Stripe-Signature', 't=1,v1=abc');

        $response = $this->makeController($harry, $stripeService)->webhook($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('OK', $response->getContent());
    }

    public function testWebhookReturns400OnInvalidSignature(): void
    {
        $harry = $this->buildUser(1);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('constructWebhookEvent')
            ->willThrowException(SignatureVerificationException::factory('bad sig', 'payload'));

        $stripeService->expects($this->never())->method('handleEvent');

        $request = new Request();
        $request->headers->set('Stripe-Signature', 'invalid');

        $response = $this->makeController($harry, $stripeService)->webhook($request);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame('Invalid signature', $response->getContent());
    }

    public function testWebhookReturns400OnInvalidPayload(): void
    {
        $harry = $this->buildUser(1);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('constructWebhookEvent')
            ->willThrowException(new \UnexpectedValueException('bad payload'));

        $stripeService->expects($this->never())->method('handleEvent');

        $request = new Request();

        $response = $this->makeController($harry, $stripeService)->webhook($request);

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame('Invalid payload', $response->getContent());
    }
}
