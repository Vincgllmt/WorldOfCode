<?php

namespace App\Tests\Service;

use App\Service\StripeConnectService;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Red Dead Redemption 2 — Tests unitaires du StripeConnectService
 *
 * ArthurMorgan    = mentor qui s'onboard (cowboy honnête qui configure ses virements)
 * DutchVanDerLinde = mentor avec un plan mais sans compte Stripe
 *
 * Note : les méthodes faisant appel à l'API Stripe (createConnectedAccount,
 * generateAccountLink, isTransfersEnabled) sont couvertes par les tests d'intégration.
 * Ce fichier teste exclusivement la logique métier pure.
 */
class StripeConnectServiceTest extends TestCase
{
    private function makeService(
        float $platformFeeRate = 0.12,
        float $stripeFeeRate = 0.015,
        int $stripeFeeFixedCents = 25,
    ): StripeConnectService {
        return new StripeConnectService(
            stripeSecretKey: 'sk_test_rdr2_fake_key',
            stripeReturnUrl: 'http://localhost:3000/mentor/onboarding/complete',
            stripeRefreshUrl: 'http://localhost:3000/mentor/onboarding',
            platformFeeRate: $platformFeeRate,
            stripeFeeRate: $stripeFeeRate,
            stripeFeeFixedCents: $stripeFeeFixedCents,
        );
    }

    // ======================================================================
    //  calculateApplicationFee() — logique de calcul
    // ======================================================================

    public function testCalculateApplicationFeeIncludesBothPlatformFeeAndEstimatedStripeFee(): void
    {
        // Sur 50 € (5000 centimes) :
        //   commission plateforme 12 %  → 600 cts
        //   frais Stripe estimés (1.5 % + 0.25 €) → 75 + 25 = 100 cts
        //   total attendu → 700 cts
        $this->assertSame(700, $this->makeService()->calculateApplicationFee(5000));
    }

    public function testCalculateApplicationFeeScalesCorrectlyWithLargerAmount(): void
    {
        // Sur 100 € (10000 centimes) :
        //   commission plateforme 12 % → 1200 cts
        //   frais Stripe estimés       → 150 + 25 = 175 cts
        //   total attendu              → 1375 cts
        $this->assertSame(1375, $this->makeService()->calculateApplicationFee(10000));
    }

    public function testCalculateApplicationFeeAlwaysIncludesFixedStripeComponent(): void
    {
        // Même sur un micro-paiement (1 €), la partie fixe (0.25 €) est toujours présente.
        // Sur 100 cts : platform = round(12) = 12, stripe = round(1.5 + 25) = 27 → total = 39
        $this->assertSame(39, $this->makeService()->calculateApplicationFee(100));
    }

    public function testCalculateApplicationFeeReturnsOnlyFixedFeeOnZeroAmount(): void
    {
        // Montant nul → pas de commission en % mais la partie fixe reste.
        $this->assertSame(25, $this->makeService()->calculateApplicationFee(0));
    }

    public function testCalculateApplicationFeeWithHigherPlatformFeeRate(): void
    {
        // Avec 20 % de commission et sans frais Stripe estimés.
        // Sur 5000 cts : platform = 1000, stripe = 0 → total = 1000
        $service = $this->makeService(platformFeeRate: 0.20, stripeFeeRate: 0.0, stripeFeeFixedCents: 0);
        $this->assertSame(1000, $service->calculateApplicationFee(5000));
    }

    public function testCalculateApplicationFeeWithZeroPlatformFeeRatePassesOnlyStripeFee(): void
    {
        // La plateforme ne prend rien : elle couvre juste les frais Stripe (1.5 % + 0.25 €).
        // Sur 5000 cts : platform = 0, stripe = 75 + 25 = 100 → total = 100
        $service = $this->makeService(platformFeeRate: 0.0);
        $this->assertSame(100, $service->calculateApplicationFee(5000));
    }

    public function testCalculateApplicationFeeRoundsToNearestCent(): void
    {
        // Sur un montant impair, le résultat doit rester un entier (pas de centimes fractionnaires).
        $fee = $this->makeService()->calculateApplicationFee(3333);
        $this->assertIsInt($fee);
        $this->assertGreaterThan(0, $fee);
    }

    public function testFeeIsAlwaysLowerThanChargeAmount(): void
    {
        // L'application_fee_amount ne peut pas dépasser le montant total.
        $amount = 5000;
        $fee    = $this->makeService()->calculateApplicationFee($amount);
        $this->assertLessThan($amount, $fee);
    }
}
