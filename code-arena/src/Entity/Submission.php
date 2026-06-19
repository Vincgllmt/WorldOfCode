<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'submission')]
class Submission
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Challenge::class)]
    #[ORM\JoinColumn(name: 'challenge_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Challenge $challenge;

    // Référence scalaire vers user.id (l'entité User vit dans le backend, non mappée ici).
    #[ORM\Column(name: 'user_id')]
    private int $userId;

    #[ORM\Column(length: 20)]
    private string $language;

    #[ORM\Column(type: 'text')]
    private string $code;

    #[ORM\Column(length: 20)]
    private string $status = 'pending';

    #[ORM\Column]
    private int $score = 0;

    #[ORM\Column(name: 'tests_passed')]
    private int $testsPassed = 0;

    #[ORM\Column(name: 'tests_total')]
    private int $testsTotal = 0;

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

    public function getUserId(): int
    {
        return $this->userId;
    }

    public function setUserId(int $userId): self
    {
        $this->userId = $userId;

        return $this;
    }

    public function getLanguage(): string
    {
        return $this->language;
    }

    public function setLanguage(string $language): self
    {
        $this->language = $language;

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

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;

        return $this;
    }

    public function getScore(): int
    {
        return $this->score;
    }

    public function setScore(int $score): self
    {
        $this->score = $score;

        return $this;
    }

    public function getTestsPassed(): int
    {
        return $this->testsPassed;
    }

    public function setTestsPassed(int $testsPassed): self
    {
        $this->testsPassed = $testsPassed;

        return $this;
    }

    public function getTestsTotal(): int
    {
        return $this->testsTotal;
    }

    public function setTestsTotal(int $testsTotal): self
    {
        $this->testsTotal = $testsTotal;

        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }
}
