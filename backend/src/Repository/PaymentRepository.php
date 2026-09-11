<?php

namespace App\Repository;

use App\Entity\MentoringSession;
use App\Entity\Payment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class PaymentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Payment::class);
    }

    public function findByStripeIntentId(string $intentId): ?Payment
    {
        return $this->findOneBy(['stripePaymentIntentId' => $intentId]);
    }

    /** Dernier paiement enregistré pour une session de mentorat, quel que soit son statut. */
    public function findLatestForSession(MentoringSession $session): ?Payment
    {
        return $this->findOneBy(['session' => $session], ['createdAt' => 'DESC']);
    }
}
