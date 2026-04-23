<?php

namespace App\Entity;

use App\Repository\LoginHistoryRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LoginHistoryRepository::class)]
#[ORM\HasLifecycleCallbacks]
class LoginHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    /** SHA-256(ip + sel) — jamais l'IP brute */
    #[ORM\Column(type: 'string', length: 64)]
    private string $ipHash;

    /** Code ISO 3166-1 alpha-2, ex: "FR", "DE", null si non résolu */
    #[ORM\Column(type: 'string', length: 2, nullable: true)]
    private ?string $countryCode = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $loggedAt;

    #[ORM\PrePersist]
    public function onPersist(): void
    {
        $this->loggedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): User { return $this->user; }
    public function setUser(User $user): self { $this->user = $user; return $this; }

    public function getIpHash(): string { return $this->ipHash; }
    public function setIpHash(string $ipHash): self { $this->ipHash = $ipHash; return $this; }

    public function getCountryCode(): ?string { return $this->countryCode; }
    public function setCountryCode(?string $countryCode): self { $this->countryCode = $countryCode; return $this; }

    public function getLoggedAt(): \DateTimeImmutable { return $this->loggedAt; }
}
