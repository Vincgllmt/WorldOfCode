<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'badge')]
#[ORM\UniqueConstraint(name: 'UNIQ_badge_challenge_code', columns: ['challenge_id', 'code'])]
class Badge
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Challenge::class, inversedBy: 'badges')]
    #[ORM\JoinColumn(name: 'challenge_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Challenge $challenge;

    // Règle d'attribution : 'first_solve', 'perfect', ...
    #[ORM\Column(length: 50)]
    private string $code;

    #[ORM\Column(length: 100)]
    private string $name;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $icon = null;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getChallenge(): Challenge
    {
        return $this->challenge;
    }

    public function setChallenge(Challenge $challenge): self
    {
        $this->challenge = $challenge;

        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = $code;

        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function setIcon(?string $icon): self
    {
        $this->icon = $icon;

        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }
}
