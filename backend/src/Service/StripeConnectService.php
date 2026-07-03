<?php

namespace App\Service;

use App\Entity\User;
use Stripe\StripeClient;

/**
 * Gère les comptes connectés Stripe (Accounts v2, configuration recipient).
 *
 * Flux : Junior paie WOC → destination charge → transfert automatique au mentor
 * La plateforme paie les frais Stripe et conserve l'application_fee_amount.
 *
 * IMPORTANT : Les taux Stripe varient selon la région et le type de carte.
 * Vérifier les taux actuels sur https://stripe.com/pricing avant la mise en prod.
 */
class StripeConnectService
{
    private StripeClient $stripe;

    public function __construct(
        private string $stripeSecretKey,
        private string $stripeReturnUrl,
        private string $stripeRefreshUrl,
        /**
         * Taux de commission plateforme (ex: 0.12 pour 12 %).
         * Doit couvrir la commission + les frais Stripe pour ne pas perdre de marge.
         */
        private float $platformFeeRate,
        /**
         * Taux de frais Stripe estimé pour votre région (cf. stripe.com/pricing).
         * Valeur par défaut : 1.5 % + 0.25 € (Europe).
         */
        private float $stripeFeeRate,
        private int $stripeFeeFixedCents,
    ) {
        $this->stripe = new StripeClient($stripeSecretKey);
    }

    /**
     * Crée un compte connecté Stripe pour un mentor (Accounts v2, recipient).
     * Retourne l'ID du compte Stripe (acct_xxx).
     */
    public function createConnectedAccount(User $mentor): string
    {
        $account = $this->stripe->v2->core->accounts->create([
            'display_name' => $mentor->getUsername(),
            'defaults' => [
                'responsibilities' => [
                    'fees_collector'   => 'application',
                    'losses_collector' => 'application',
                ],
            ],
            'configuration' => [
                'recipient' => [
                    'capabilities' => [
                        'stripe_balance' => [
                            'stripe_transfers' => ['requested' => true],
                        ],
                    ],
                ],
            ],
        ]);

        return $account->id;
    }

    /**
     * Génère un lien d'onboarding Stripe pour un compte connecté.
     * Redirige le mentor vers le formulaire KYC hébergé par Stripe.
     */
    public function generateAccountLink(string $stripeAccountId): string
    {
        $link = $this->stripe->accountLinks->create([
            'account'            => $stripeAccountId,
            'refresh_url'        => $this->stripeRefreshUrl,
            'return_url'         => $this->stripeReturnUrl,
            'type'               => 'account_onboarding',
            'collection_options' => ['fields' => 'eventually_due'],
        ]);

        return $link->url;
    }

    /**
     * Vérifie si le compte connecté peut recevoir des virements (stripe_transfers actif).
     */
    public function isTransfersEnabled(string $stripeAccountId): bool
    {
        $account = $this->stripe->v2->core->accounts->retrieve($stripeAccountId);

        return ($account->configuration->recipient->capabilities->stripe_balance->stripe_transfers->status ?? '') === 'active';
    }

    /**
     * Calcule l'application_fee_amount (Option A : inclut les frais Stripe estimés).
     *
     * La plateforme paie les frais Stripe sur les destination charges. Pour préserver
     * la marge, on inclut les frais estimés dans l'application_fee_amount.
     *
     *   fee = (montant × platformFeeRate) + (montant × stripeFeeRate + stripeFeeFixed)
     *
     * Le mentor reçoit : montant - application_fee_amount
     */
    public function calculateApplicationFee(int $amountCents): int
    {
        $platformFee = (int) round($amountCents * $this->platformFeeRate);
        $stripeFee   = (int) round($amountCents * $this->stripeFeeRate + $this->stripeFeeFixedCents);

        return $platformFee + $stripeFee;
    }
}
