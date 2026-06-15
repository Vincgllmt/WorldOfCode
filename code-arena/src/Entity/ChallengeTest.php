<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'challenge_test')]
class ChallengeTest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Challenge::class, inversedBy: 'tests')]
    #[ORM\JoinColumn(name: 'challenge_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Challenge $challenge;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $stdin = null;

    #[ORM\Column(name: 'expected_output', type: 'text')]
    private string $expectedOutput;

    #[ORM\Column(name: 'is_public')]
    private bool $isPublic = false;

    #[ORM\Column]
    private int $weight = 1;

    #[ORM\Column]
    private int $position = 0;

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

    public function getStdin(): ?string
    {
        return $this->stdin;
    }

    public function setStdin(?string $stdin): self
    {
        $this->stdin = $stdin;

        return $this;
    }

    public function getExpectedOutput(): string
    {
        return $this->expectedOutput;
    }

    public function setExpectedOutput(string $expectedOutput): self
    {
        $this->expectedOutput = $expectedOutput;

        return $this;
    }

    public function isPublic(): bool
    {
        return $this->isPublic;
    }

    public function setIsPublic(bool $isPublic): self
    {
        $this->isPublic = $isPublic;

        return $this;
    }

    public function getWeight(): int
    {
        return $this->weight;
    }

    public function setWeight(int $weight): self
    {
        $this->weight = $weight;

        return $this;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): self
    {
        $this->position = $position;

        return $this;
    }
}
