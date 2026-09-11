<?php

namespace App\Entity;

use App\Enum\PaymentStatus;
use App\Repository\PaymentRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PaymentRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Payment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $payer;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    private User $mentor;

    /** Montant en centimes (ex: 5000 = 50,00 €) */
    #[ORM\Column(type: 'integer')]
    private int $amount;

    #[ORM\Column(length: 3)]
    private string $currency = 'eur';

    #[ORM\Column(type: 'string', enumType: PaymentStatus::class)]
    private PaymentStatus $status = PaymentStatus::PENDING;

    #[ORM\Column(length: 255, unique: true)]
    private string $stripePaymentIntentId;

    /** Session de mentorat à l'origine du paiement (nullable : un paiement peut exister hors session). */
    #[ORM\ManyToOne(targetEntity: MentoringSession::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?MentoringSession $session = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\Column(type: 'datetime')]
    private \DateTime $updatedAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function onUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getPayer(): User { return $this->payer; }
    public function setPayer(User $payer): self { $this->payer = $payer; return $this; }

    public function getMentor(): User { return $this->mentor; }
    public function setMentor(User $mentor): self { $this->mentor = $mentor; return $this; }

    public function getAmount(): int { return $this->amount; }
    public function setAmount(int $amount): self { $this->amount = $amount; return $this; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): self { $this->currency = $currency; return $this; }

    public function getStatus(): PaymentStatus { return $this->status; }
    public function setStatus(PaymentStatus $status): self { $this->status = $status; return $this; }

    public function getStripePaymentIntentId(): string { return $this->stripePaymentIntentId; }
    public function setStripePaymentIntentId(string $id): self { $this->stripePaymentIntentId = $id; return $this; }

    public function getSession(): ?MentoringSession { return $this->session; }
    public function setSession(?MentoringSession $session): self { $this->session = $session; return $this; }

    public function getCreatedAt(): \DateTime { return $this->createdAt; }
    public function getUpdatedAt(): \DateTime { return $this->updatedAt; }
}
