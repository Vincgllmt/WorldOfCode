<?php

namespace App\Service;

use App\Entity\MentoringSession;
use App\Entity\Payment;
use App\Entity\User;
use App\Enum\PaymentStatus;
use App\Repository\MentorProfileRepository;
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
        private MentorProfileRepository $mentorProfileRepository,
    ) {
        Stripe::setApiKey($this->stripeSecretKey);
    }

    /**
     * Crée un PaymentIntent Stripe (destination charge) et enregistre un Payment en base.
     *
     * Si $destinationAccountId est fourni, c'est une destination charge : WOC collecte
     * le paiement et transfère automatiquement au compte connecté du mentor, moins
     * l'application_fee_amount que la plateforme conserve.
     *
     * @param int    $amountCents         Montant total en centimes (ex: 5000 = 50 €)
     * @param int    $applicationFeeCents Commission WOC en centimes (null = sans Connect)
     * @param string $destinationAccountId ID du compte Stripe connecté du mentor (acct_xxx)
     * @param MentoringSession $session   Session de mentorat à l'origine du don (null = paiement hors session)
     */
    public function createPaymentIntent(
        User $payer,
        User $mentor,
        int $amountCents,
        string $currency = 'eur',
        ?string $destinationAccountId = null,
        ?int $applicationFeeCents = null,
        ?MentoringSession $session = null,
    ): PaymentIntent {
        $metadata = [
            'payer_id'  => $payer->getId(),
            'mentor_id' => $mentor->getId(),
        ];
        if ($session !== null) {
            $metadata['session_id'] = $session->getId();
        }

        $params = [
            'amount'   => $amountCents,
            'currency' => $currency,
            'metadata' => $metadata,
            // Moyens de paiement activés sur le compte, sans redirection hors-site
            // (le PaymentElement du front confirme avec redirect: 'if_required').
            'automatic_payment_methods' => ['enabled' => true, 'allow_redirects' => 'never'],
        ];

        if ($destinationAccountId !== null && $applicationFeeCents !== null) {
            $params['application_fee_amount'] = $applicationFeeCents;
            $params['transfer_data']          = ['destination' => $destinationAccountId];
        }

        $intent = PaymentIntent::create($params);

        $payment = new Payment();
        $payment->setPayer($payer)
            ->setMentor($mentor)
            ->setAmount($amountCents)
            ->setCurrency($currency)
            ->setStripePaymentIntentId($intent->id)
            ->setSession($session);

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
     * Dispatche les événements Stripe entrants.
     */
    public function handleEvent(\Stripe\Event $event): void
    {
        match ($event->type) {
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'payment_intent.canceled'  => $this->handlePaymentIntent($event),
            'account.updated'          => $this->handleAccountUpdated($event),
            default                    => null,
        };
    }

    private function handlePaymentIntent(\Stripe\Event $event): void
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
            'payment_intent.succeeded'      => PaymentStatus::SUCCEEDED,
            'payment_intent.payment_failed' => PaymentStatus::FAILED,
            'payment_intent.canceled'       => PaymentStatus::CANCELED,
            default                         => null,
        };

        if ($status !== null) {
            $payment->setStatus($status);
            $this->em->flush();
        }
    }

    private function handleAccountUpdated(\Stripe\Event $event): void
    {
        $stripeAccountId = $event->data->object->id ?? null;
        if (!$stripeAccountId) {
            return;
        }

        $profile = $this->mentorProfileRepository->findByStripeAccountId($stripeAccountId);
        if (!$profile) {
            return;
        }

        // La capability « transfers » active = le compte peut recevoir les virements
        // des destination charges. payouts_enabled sert de filet (KYC complet).
        $object          = $event->data->object;
        $transfersActive = ($object->capabilities?->transfers ?? null) === 'active';
        $payoutsEnabled  = (bool) ($object->payouts_enabled ?? false);
        $profile->setStripeTransfersEnabled($transfersActive || $payoutsEnabled);
        $this->em->flush();
    }
}
