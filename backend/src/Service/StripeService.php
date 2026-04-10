<?php

namespace App\Service;

use App\Entity\Payment;
use App\Entity\User;
use App\Enum\PaymentStatus;
use App\Repository\PaymentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Stripe\Exception\SignatureVerificationException;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\Webhook;

class StripeService
{
    public function __construct(
        private string $stripeSecretKey,
        private string $stripeWebhookSecret,
        private EntityManagerInterface $em,
        private PaymentRepository $paymentRepository,
    ) {
        Stripe::setApiKey($this->stripeSecretKey);
    }

    /**
     * Crée un PaymentIntent Stripe et enregistre un Payment en base.
     *
     * @param int    $amountCents Montant en centimes (ex: 5000 = 50 €)
     * @param string $currency    Code devise ISO 4217 (ex: 'eur')
     */
    public function createPaymentIntent(User $payer, User $mentor, int $amountCents, string $currency = 'eur'): PaymentIntent
    {
        $intent = PaymentIntent::create([
            'amount'   => $amountCents,
            'currency' => $currency,
            'metadata' => [
                'payer_id'  => $payer->getId(),
                'mentor_id' => $mentor->getId(),
            ],
        ]);

        $payment = new Payment();
        $payment->setPayer($payer)
            ->setMentor($mentor)
            ->setAmount($amountCents)
            ->setCurrency($currency)
            ->setStripePaymentIntentId($intent->id);

        $this->em->persist($payment);
        $this->em->flush();

        return $intent;
    }

    /**
     * Valide la signature du webhook et retourne l'événement Stripe.
     *
     * @throws SignatureVerificationException
     */
    public function constructWebhookEvent(string $payload, string $sigHeader): \Stripe\Event
    {
        return Webhook::constructEvent($payload, $sigHeader, $this->stripeWebhookSecret);
    }

    /**
     * Met à jour le statut d'un Payment en fonction de l'événement Stripe.
     */
    public function handleEvent(\Stripe\Event $event): void
    {
        $intentId = $event->data->object->id ?? null;

        if (!$intentId) {
            return;
        }

        $payment = $this->paymentRepository->findByStripeIntentId($intentId);

        if (!$payment) {
            return;
        }

        $status = match ($event->type) {
            'payment_intent.succeeded'               => PaymentStatus::SUCCEEDED,
            'payment_intent.payment_failed'          => PaymentStatus::FAILED,
            'payment_intent.canceled'                => PaymentStatus::CANCELED,
            default                                  => null,
        };

        if ($status !== null) {
            $payment->setStatus($status);
            $this->em->flush();
        }
    }
}
