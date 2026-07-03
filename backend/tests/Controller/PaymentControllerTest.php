<?php

namespace App\Tests\Controller;

use App\Controller\PaymentController;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\UserRepository;
use App\Service\StripeConnectService;
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
 * KimKitsuragi = mentor (le destinataire du paiement, rigoureusement onboardé)
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

    private function buildOnboardedMentorProfile(User $mentor, string $stripeAccountId = 'acct_kim123'): MentorProfile
    {
        $profile = new MentorProfile();
        $profile->setUser($mentor)
            ->setStripeAccountId($stripeAccountId)
            ->setStripeTransfersEnabled(true);

        return $profile;
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
        ?StripeConnectService $connectService = null,
        ?UserRepository $userRepository = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        bool $isGranted = true,
    ): PaymentController {
        $controller = new PaymentController(
            $stripeService     ?? $this->createMock(StripeService::class),
            $connectService    ?? $this->createMock(StripeConnectService::class),
            $userRepository    ?? $this->createMock(UserRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
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
    //  createIntent() — cas nominal
    // ======================================================================

    public function testCreateIntentReturnsClientSecretAndIntentId(): void
    {
        $harry   = $this->buildUser(1);
        $kim     = $this->buildUser(2, 'KimKitsuragi');
        $profile = $this->buildOnboardedMentorProfile($kim);
        $intent  = $this->makeFakeIntent('pi_abc123', 'secret_xyz');

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('createPaymentIntent')->willReturn($intent);

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->method('calculateApplicationFee')->willReturn(725);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($kim);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($harry, $stripeService, $connectService, $userRepo, $mentorRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 5000]));

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('secret_xyz', $payload['client_secret']);
        $this->assertSame('pi_abc123', $payload['payment_intent_id']);
        $this->assertSame(725, $payload['application_fee_cents']);
    }

    public function testCreateIntentPassesDestinationAccountAndFeeToStripeService(): void
    {
        $harry   = $this->buildUser(1);
        $kim     = $this->buildUser(2, 'KimKitsuragi');
        $profile = $this->buildOnboardedMentorProfile($kim, 'acct_kim_connect');

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->method('calculateApplicationFee')->willReturn(700);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->once())
            ->method('createPaymentIntent')
            ->with($harry, $kim, 5000, 'eur', 'acct_kim_connect', 700)
            ->willReturn($this->makeFakeIntent());

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $this->makeController($harry, $stripeService, $connectService, $userRepo, $mentorRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 5000]));
    }

    public function testCreateIntentUsesEurAsDefaultCurrency(): void
    {
        $harry   = $this->buildUser(1);
        $kim     = $this->buildUser(2, 'KimKitsuragi');
        $profile = $this->buildOnboardedMentorProfile($kim);

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->method('calculateApplicationFee')->willReturn(700);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->expects($this->once())
            ->method('createPaymentIntent')
            ->with($harry, $kim, 5000, 'eur', $this->anything(), $this->anything())
            ->willReturn($this->makeFakeIntent());

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $this->makeController($harry, $stripeService, $connectService, $userRepo, $mentorRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 5000]));
    }

    public function testCreateIntentAcceptsMinimumAmount(): void
    {
        $harry   = $this->buildUser(1);
        $kim     = $this->buildUser(2, 'KimKitsuragi');
        $profile = $this->buildOnboardedMentorProfile($kim);

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->method('calculateApplicationFee')->willReturn(32);

        $stripeService = $this->createMock(StripeService::class);
        $stripeService->method('createPaymentIntent')->willReturn($this->makeFakeIntent());

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($harry, $stripeService, $connectService, $userRepo, $mentorRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 50]));

        $this->assertSame(200, $response->getStatusCode());
    }

    // ======================================================================
    //  createIntent() — validations d'entrée
    // ======================================================================

    public function testCreateIntentReturns400WhenMentorIdIsMissing(): void
    {
        $harry  = $this->buildUser(1);
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        $response = $this->makeController($harry, $stripe)
            ->createIntent($this->makeRequest(['amount' => 5000]));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertArrayHasKey('error', json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR));
    }

    public function testCreateIntentReturns400WhenAmountIsMissing(): void
    {
        $harry  = $this->buildUser(1);
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        $response = $this->makeController($harry, $stripe)
            ->createIntent($this->makeRequest(['mentor_id' => 2]));

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateIntentReturns400WhenAmountIsBelowMinimum(): void
    {
        $harry  = $this->buildUser(1);
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        $response = $this->makeController($harry, $stripe)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 49]));

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  createIntent() — validations métier
    // ======================================================================

    public function testCreateIntentReturns404WhenMentorNotFound(): void
    {
        $harry  = $this->buildUser(1);
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($harry, $stripe, null, $userRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 999, 'amount' => 5000]));

        $this->assertSame(404, $response->getStatusCode());
        $this->assertArrayHasKey('error', json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR));
    }

    public function testCreateIntentReturns400WhenPayerAndMentorAreSameUser(): void
    {
        $harry  = $this->buildUser(1);
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($harry);

        $response = $this->makeController($harry, $stripe, null, $userRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 1, 'amount' => 5000]));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertArrayHasKey('error', json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR));
    }

    public function testCreateIntentReturns400WhenMentorHasNoMentorProfile(): void
    {
        $harry  = $this->buildUser(1);
        $kim    = $this->buildUser(2, 'KimKitsuragi');
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn(null); // pas de profil mentor

        $response = $this->makeController($harry, $stripe, null, $userRepo, $mentorRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 5000]));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertArrayHasKey('error', json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR));
    }

    public function testCreateIntentReturns400WhenMentorTransfersNotEnabled(): void
    {
        $harry  = $this->buildUser(1);
        $kim    = $this->buildUser(2, 'KimKitsuragi');
        $stripe = $this->createMock(StripeService::class);
        $stripe->expects($this->never())->method('createPaymentIntent');

        // Profil mentor existe mais onboarding non terminé
        $profile = new MentorProfile();
        $profile->setUser($kim)
            ->setStripeAccountId('acct_pending')
            ->setStripeTransfersEnabled(false);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn($kim);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($harry, $stripe, null, $userRepo, $mentorRepo)
            ->createIntent($this->makeRequest(['mentor_id' => 2, 'amount' => 5000]));

        $this->assertSame(400, $response->getStatusCode());
        $this->assertArrayHasKey('error', json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR));
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

        $response = $this->makeController($harry, $stripeService)->webhook(new Request());

        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame('Invalid payload', $response->getContent());
    }
}
