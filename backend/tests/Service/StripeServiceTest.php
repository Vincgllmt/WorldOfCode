<?php

namespace App\Tests\Service;

use App\Entity\Payment;
use App\Entity\User;
use App\Enum\PaymentStatus;
use App\Enum\UserRole;
use App\Repository\PaymentRepository;
use App\Service\StripeService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

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

    private function makeService(
        ?EntityManagerInterface $em = null,
        ?PaymentRepository $repo = null,
    ): StripeService {
        return new StripeService(
            'sk_test_fake_key_for_unit_tests',
            'whsec_fake_webhook_secret',
            $em   ?? $this->createMock(EntityManagerInterface::class),
            $repo ?? $this->createMock(PaymentRepository::class),
        );
    }

    private function makeEvent(string $type, string $intentId): \Stripe\Event
    {
        return \Stripe\Event::constructFrom([
            'id'      => 'evt_test_' . uniqid(),
            'type'    => $type,
            'object'  => 'event',
            'data'    => ['object' => ['id' => $intentId, 'object' => 'payment_intent']],
        ]);
    }

    // ======================================================================
    //  handleEvent() - statuts
    // ======================================================================

    public function testHandleEventSetsStatusToSucceeded(): void
    {
        $payment = $this->buildPayment('pi_success');
        $this->assertSame(PaymentStatus::PENDING, $payment->getStatus());

        $repo = $this->createMock(PaymentRepository::class);
        $repo->method('findByStripeIntentId')->with('pi_success')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $event = $this->makeEvent('payment_intent.succeeded', 'pi_success');
        $this->makeService($em, $repo)->handleEvent($event);

        $this->assertSame(PaymentStatus::SUCCEEDED, $payment->getStatus());
    }

    public function testHandleEventSetsStatusToFailed(): void
    {
        $payment = $this->buildPayment('pi_failed');

        $repo = $this->createMock(PaymentRepository::class);
        $repo->method('findByStripeIntentId')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $event = $this->makeEvent('payment_intent.payment_failed', 'pi_failed');
        $this->makeService($em, $repo)->handleEvent($event);

        $this->assertSame(PaymentStatus::FAILED, $payment->getStatus());
    }

    public function testHandleEventSetsStatusToCanceled(): void
    {
        $payment = $this->buildPayment('pi_canceled');

        $repo = $this->createMock(PaymentRepository::class);
        $repo->method('findByStripeIntentId')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $event = $this->makeEvent('payment_intent.canceled', 'pi_canceled');
        $this->makeService($em, $repo)->handleEvent($event);

        $this->assertSame(PaymentStatus::CANCELED, $payment->getStatus());
    }

    public function testHandleEventDoesNotFlushForUnknownEventType(): void
    {
        $payment = $this->buildPayment('pi_unknown');

        $repo = $this->createMock(PaymentRepository::class);
        $repo->method('findByStripeIntentId')->willReturn($payment);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $event = $this->makeEvent('payment_intent.amount_capturable_updated', 'pi_unknown');
        $this->makeService($em, $repo)->handleEvent($event);

        $this->assertSame(PaymentStatus::PENDING, $payment->getStatus());
    }

    // ======================================================================
    //  handleEvent() - cas sans payment trouvé
    // ======================================================================

    public function testHandleEventDoesNothingWhenPaymentNotFound(): void
    {
        $repo = $this->createMock(PaymentRepository::class);
        $repo->method('findByStripeIntentId')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $event = $this->makeEvent('payment_intent.succeeded', 'pi_not_in_db');
        $this->makeService($em, $repo)->handleEvent($event);
    }

    // ======================================================================
    //  handleEvent() - cas sans intentId
    // ======================================================================

    public function testHandleEventDoesNothingWhenNoIntentId(): void
    {
        $repo = $this->createMock(PaymentRepository::class);
        $repo->expects($this->never())->method('findByStripeIntentId');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $event = \Stripe\Event::constructFrom([
            'id'     => 'evt_no_id',
            'type'   => 'payment_intent.succeeded',
            'object' => 'event',
            'data'   => ['object' => ['object' => 'payment_intent']],
        ]);

        $this->makeService($em, $repo)->handleEvent($event);
    }
}
