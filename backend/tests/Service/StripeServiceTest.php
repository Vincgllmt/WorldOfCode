<?php

namespace App\Tests\Service;

use App\Entity\MentoringSession;
use App\Entity\MentorProfile;
use App\Entity\Payment;
use App\Entity\User;
use App\Enum\PaymentStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\PaymentRepository;
use App\Service\StripeService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Stripe\Exception\SignatureVerificationException;

/**
 * 🎮 Factorio - Tests unitaires du StripeService
 *
 * EngineerBuilder = utilisateur payeur (le joueur qui automatise tout)
 * BitersHorde     = mentor (la faction adverse)
 */
class StripeServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'EngineerBuilder'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@nauvis.io')
            ->setFirstname($username)
            ->setLastname('Factory')
            ->setPassword('SpeedrunAny!%')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildPayment(string $intentId = 'pi_test123'): Payment
    {
        $payment = new Payment();
        $payment->setPayer($this->buildUser(1))
            ->setMentor($this->buildUser(2, 'BitersHorde'))
            ->setAmount(5000)
            ->setCurrency('eur')
            ->setStripePaymentIntentId($intentId);

        return $payment;
    }

    private function buildMentorProfile(string $stripeAccountId = 'acct_nauvis123'): MentorProfile
    {
        $profile = new MentorProfile();
        $profile->setUser($this->buildUser(2, 'BitersHorde'))
            ->setStripeAccountId($stripeAccountId)
            ->setStripeTransfersEnabled(false);

        return $profile;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior): MentoringSession
    {
        $session = new MentoringSession();
        (new \ReflectionProperty(MentoringSession::class, 'id'))->setValue($session, $id);
        $session->setMentor($mentor)->setJunior($junior)->setFormat(SessionFormat::TEXT);
        $session->onCreate();

        return $session;
    }

    private function makeService(
        ?EntityManagerInterface $em = null,
        ?PaymentRepository $paymentRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
    ): StripeService {
        return new StripeService(
            'sk_test_fake_key_for_unit_tests',
            'whsec_fake_webhook_secret',
            $em              ?? $this->createMock(EntityManagerInterface::class),
            $paymentRepo     ?? $this->createMock(PaymentRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
        );
    }

    private function makePaymentEvent(string $type, string $intentId): \Stripe\Event
    {
        return \Stripe\Event::constructFrom([
            'id'     => 'evt_test_' . uniqid(),
            'type'   => $type,
            'object' => 'event',
            'data'   => ['object' => ['id' => $intentId, 'object' => 'payment_intent']],
        ]);
    }

    private function makeAccountEvent(string $stripeAccountId, bool $payoutsEnabled): \Stripe\Event
    {
        return \Stripe\Event::constructFrom([
            'id'     => 'evt_account_' . uniqid(),
            'type'   => 'account.updated',
            'object' => 'event',
            'data'   => ['object' => [
                'id'              => $stripeAccountId,
                'object'          => 'account',
                'payouts_enabled' => $payoutsEnabled,
            ]],
        ]);
    }

    // ======================================================================
    //  handleEvent() — payment_intent.*
    // ======================================================================

    public function testHandleEventSetsStatusToSucceeded(): void
    {
        $payment = $this->buildPayment('pi_success');
        $this->assertSame(PaymentStatus::PENDING, $payment->getStatus());

        $paymentRepo = $this->createMock(PaymentRepository::class);
        $paymentRepo->method('findByStripeIntentId')->with('pi_success')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $this->makeService($em, $paymentRepo)->handleEvent(
            $this->makePaymentEvent('payment_intent.succeeded', 'pi_success')
        );

        $this->assertSame(PaymentStatus::SUCCEEDED, $payment->getStatus());
    }

    public function testHandleEventSetsStatusToFailed(): void
    {
        $payment     = $this->buildPayment('pi_failed');
        $paymentRepo = $this->createMock(PaymentRepository::class);
        $paymentRepo->method('findByStripeIntentId')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $this->makeService($em, $paymentRepo)->handleEvent(
            $this->makePaymentEvent('payment_intent.payment_failed', 'pi_failed')
        );

        $this->assertSame(PaymentStatus::FAILED, $payment->getStatus());
    }

    public function testHandleEventSetsStatusToCanceled(): void
    {
        $payment     = $this->buildPayment('pi_canceled');
        $paymentRepo = $this->createMock(PaymentRepository::class);
        $paymentRepo->method('findByStripeIntentId')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $this->makeService($em, $paymentRepo)->handleEvent(
            $this->makePaymentEvent('payment_intent.canceled', 'pi_canceled')
        );

        $this->assertSame(PaymentStatus::CANCELED, $payment->getStatus());
    }

    public function testHandleEventDoesNotFlushForUnknownEventType(): void
    {
        $payment     = $this->buildPayment('pi_unknown');
        $paymentRepo = $this->createMock(PaymentRepository::class);
        $paymentRepo->method('findByStripeIntentId')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $this->makeService($em, $paymentRepo)->handleEvent(
            $this->makePaymentEvent('payment_intent.amount_capturable_updated', 'pi_unknown')
        );

        $this->assertSame(PaymentStatus::PENDING, $payment->getStatus());
    }

    public function testHandleEventDoesNothingWhenPaymentNotFound(): void
    {
        $paymentRepo = $this->createMock(PaymentRepository::class);
        $paymentRepo->method('findByStripeIntentId')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $this->makeService($em, $paymentRepo)->handleEvent(
            $this->makePaymentEvent('payment_intent.succeeded', 'pi_not_in_db')
        );
    }

    public function testHandleEventDoesNothingWhenNoIntentId(): void
    {
        $paymentRepo = $this->createMock(PaymentRepository::class);
        $paymentRepo->expects($this->never())->method('findByStripeIntentId');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $event = \Stripe\Event::constructFrom([
            'id'     => 'evt_no_id',
            'type'   => 'payment_intent.succeeded',
            'object' => 'event',
            'data'   => ['object' => ['object' => 'payment_intent']],
        ]);

        $this->makeService($em, $paymentRepo)->handleEvent($event);
    }

    // ======================================================================
    //  handleEvent() — account.updated
    // ======================================================================

    public function testHandleAccountUpdatedEnablesTransfersWhenPayoutsAreEnabled(): void
    {
        $profile     = $this->buildMentorProfile('acct_nauvis123');
        $mentorRepo  = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findByStripeAccountId')->with('acct_nauvis123')->willReturn($profile);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $this->makeService($em, null, $mentorRepo)->handleEvent(
            $this->makeAccountEvent('acct_nauvis123', payoutsEnabled: true)
        );

        $this->assertTrue($profile->isStripeTransfersEnabled());
    }

    public function testHandleAccountUpdatedDisablesTransfersWhenPayoutsAreDisabled(): void
    {
        $profile = $this->buildMentorProfile('acct_nauvis123');
        $profile->setStripeTransfersEnabled(true); // was enabled before

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findByStripeAccountId')->willReturn($profile);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $this->makeService($em, null, $mentorRepo)->handleEvent(
            $this->makeAccountEvent('acct_nauvis123', payoutsEnabled: false)
        );

        $this->assertFalse($profile->isStripeTransfersEnabled());
    }

    public function testHandleAccountUpdatedDoesNothingWhenProfileNotFound(): void
    {
        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findByStripeAccountId')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $this->makeService($em, null, $mentorRepo)->handleEvent(
            $this->makeAccountEvent('acct_unknown', payoutsEnabled: true)
        );
    }

    public function testHandleAccountUpdatedDoesNothingWhenEventHasNoAccountId(): void
    {
        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->expects($this->never())->method('findByStripeAccountId');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $event = \Stripe\Event::constructFrom([
            'id'     => 'evt_no_account_id',
            'type'   => 'account.updated',
            'object' => 'event',
            'data'   => ['object' => ['object' => 'account']],
        ]);

        $this->makeService($em, null, $mentorRepo)->handleEvent($event);
    }

    // ======================================================================
    //  constructWebhookEvent()
    // ======================================================================

    public function testConstructWebhookEventThrowsWithInvalidSignature(): void
    {
        $this->expectException(SignatureVerificationException::class);

        $this->makeService()->constructWebhookEvent(
            '{"id":"evt_test","type":"payment_intent.succeeded"}',
            't=' . time() . ',v1=' . str_repeat('0', 64)
        );
    }

    // ======================================================================
    //  createPaymentIntent()
    // ======================================================================

    public function testCreatePaymentIntentPersistsPaymentAndReturnsIntent(): void
    {
        $payer  = $this->buildUser(1);
        $mentor = $this->buildUser(2, 'BitersHorde');

        $fakeIntent = json_encode([
            'id'            => 'pi_mock_nauvis123',
            'object'        => 'payment_intent',
            'amount'        => 5000,
            'currency'      => 'eur',
            'status'        => 'requires_payment_method',
            'livemode'      => false,
            'client_secret' => 'pi_mock_nauvis123_secret',
        ]);

        $httpClient = $this->createMock(\Stripe\HttpClient\ClientInterface::class);
        $httpClient->method('request')->willReturn([$fakeIntent, 200, []]);
        \Stripe\ApiRequestor::setHttpClient($httpClient);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist')->with($this->isInstanceOf(Payment::class));
        $em->expects($this->once())->method('flush');

        $intent = $this->makeService($em)->createPaymentIntent($payer, $mentor, 5000, 'eur');

        $this->assertSame('pi_mock_nauvis123', $intent->id);
        $this->assertSame(5000, $intent->amount);
        $this->assertSame('eur', $intent->currency);
    }

    public function testCreatePaymentIntentIncludesTransferDataWhenDestinationAccountProvided(): void
    {
        $payer  = $this->buildUser(1);
        $mentor = $this->buildUser(2, 'BitersHorde');

        $fakeIntent = json_encode([
            'id'            => 'pi_destination_test',
            'object'        => 'payment_intent',
            'amount'        => 5000,
            'currency'      => 'eur',
            'status'        => 'requires_payment_method',
            'livemode'      => false,
            'client_secret' => 'pi_destination_test_secret',
            'transfer_data' => ['destination' => 'acct_biter_connect'],
        ]);

        $httpClient = $this->createMock(\Stripe\HttpClient\ClientInterface::class);
        $httpClient->method('request')->willReturn([$fakeIntent, 200, []]);
        \Stripe\ApiRequestor::setHttpClient($httpClient);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist');
        $em->expects($this->once())->method('flush');

        $intent = $this->makeService($em)->createPaymentIntent(
            $payer, $mentor, 5000, 'eur', 'acct_biter_connect', 700
        );

        $this->assertSame('pi_destination_test', $intent->id);
    }

    public function testCreatePaymentIntentLinksPaymentToSessionWhenProvided(): void
    {
        $mentorProfile = $this->buildMentorProfile();
        $payer  = $this->buildUser(1);
        $mentor = $mentorProfile->getUser();
        $session = $this->buildSession(10, $mentorProfile, $payer);

        $fakeIntent = json_encode([
            'id'            => 'pi_session_test',
            'object'        => 'payment_intent',
            'amount'        => 1000,
            'currency'      => 'eur',
            'status'        => 'requires_payment_method',
            'livemode'      => false,
            'client_secret' => 'pi_session_test_secret',
        ]);

        $httpClient = $this->createMock(\Stripe\HttpClient\ClientInterface::class);
        $httpClient->method('request')->willReturn([$fakeIntent, 200, []]);
        \Stripe\ApiRequestor::setHttpClient($httpClient);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())
            ->method('persist')
            ->with($this->callback(fn (Payment $p) => $p->getSession() === $session));
        $em->expects($this->once())->method('flush');

        $this->makeService($em)->createPaymentIntent($payer, $mentor, 1000, 'eur', null, null, $session);
    }

    public function testCreatePaymentIntentLeavesSessionNullByDefault(): void
    {
        $payer  = $this->buildUser(1);
        $mentor = $this->buildUser(2, 'BitersHorde');

        $fakeIntent = json_encode([
            'id'            => 'pi_no_session_test',
            'object'        => 'payment_intent',
            'amount'        => 1000,
            'currency'      => 'eur',
            'status'        => 'requires_payment_method',
            'livemode'      => false,
            'client_secret' => 'pi_no_session_test_secret',
        ]);

        $httpClient = $this->createMock(\Stripe\HttpClient\ClientInterface::class);
        $httpClient->method('request')->willReturn([$fakeIntent, 200, []]);
        \Stripe\ApiRequestor::setHttpClient($httpClient);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())
            ->method('persist')
            ->with($this->callback(fn (Payment $p) => $p->getSession() === null));
        $em->expects($this->once())->method('flush');

        $this->makeService($em)->createPaymentIntent($payer, $mentor, 1000, 'eur');
    }

    protected function tearDown(): void
    {
        \Stripe\ApiRequestor::setHttpClient(null);
    }
}
