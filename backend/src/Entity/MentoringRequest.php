<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\MentoringRequestRepository;
use App\Enum\MentoringRequestType;
use App\Enum\MentoringRequestStatus;

#[ORM\Entity(repositoryClass: MentoringRequestRepository::class)]
#[ORM\HasLifecycleCallbacks]
class MentoringRequest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $junior;

    #[ORM\ManyToOne(targetEntity: MentorProfile::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?MentorProfile $targetMentor = null;

    #[ORM\Column(type: 'string', enumType: MentoringRequestType::class)]
    private MentoringRequestType $type;

    #[ORM\Column(type: 'string', enumType: MentoringRequestStatus::class)]
    private MentoringRequestStatus $status = MentoringRequestStatus::PENDING;

    #[ORM\Column(type: 'string', length: 255)]
    private string $title;

    #[ORM\Column(type: 'string', length: 100)]
    private string $techStack;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $blockedSince = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $alreadyTried = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $expectedBehavior = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $observedBehavior = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $codeSnippet = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true)]
    private ?string $codeLanguage = null;

    #[ORM\Column(type: 'text')]
    private string $description;

    #[ORM\Column(type: 'boolean')]
    private bool $isPublic = true;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $compatibilityScore = null;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetime')]
    private \DateTime $updatedAt;

    #[ORM\Column(name: 'expires_at', type: 'datetime', nullable: true)]
    private ?\DateTime $expiresAt = null;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = $this->updatedAt = new \DateTime();
        if ($this->compatibilityScore === null) {
            $this->compatibilityScore = random_int(60, 99);
        }
    }

    #[ORM\PreUpdate]
    public function onUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getJunior(): User
    {
        return $this->junior;
    }

    public function setJunior(User $junior): self
    {
        $this->junior = $junior;
        return $this;
    }

    public function getTargetMentor(): ?MentorProfile
    {
        return $this->targetMentor;
    }

    public function setTargetMentor(?MentorProfile $targetMentor): self
    {
        $this->targetMentor = $targetMentor;
        return $this;
    }

    public function getType(): MentoringRequestType
    {
        return $this->type;
    }

    public function setType(MentoringRequestType $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getStatus(): MentoringRequestStatus
    {
        return $this->status;
    }

    public function setStatus(MentoringRequestStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getTechStack(): string
    {
        return $this->techStack;
    }

    public function setTechStack(string $techStack): self
    {
        $this->techStack = $techStack;
        return $this;
    }

    public function getBlockedSince(): ?string
    {
        return $this->blockedSince;
    }

    public function setBlockedSince(?string $blockedSince): self
    {
        $this->blockedSince = $blockedSince;
        return $this;
    }

    public function getAlreadyTried(): ?string
    {
        return $this->alreadyTried;
    }

    public function setAlreadyTried(?string $alreadyTried): self
    {
        $this->alreadyTried = $alreadyTried;
        return $this;
    }

    public function getExpectedBehavior(): ?string
    {
        return $this->expectedBehavior;
    }

    public function setExpectedBehavior(?string $expectedBehavior): self
    {
        $this->expectedBehavior = $expectedBehavior;
        return $this;
    }

    public function getObservedBehavior(): ?string
    {
        return $this->observedBehavior;
    }

    public function setObservedBehavior(?string $observedBehavior): self
    {
        $this->observedBehavior = $observedBehavior;
        return $this;
    }

    public function getCodeSnippet(): ?string
    {
        return $this->codeSnippet;
    }

    public function setCodeSnippet(?string $codeSnippet): self
    {
        $this->codeSnippet = $codeSnippet;
        return $this;
    }

    public function getCodeLanguage(): ?string
    {
        return $this->codeLanguage;
    }

    public function setCodeLanguage(?string $codeLanguage): self
    {
        $this->codeLanguage = $codeLanguage;
        return $this;
    }

    public function getDescription(): string
    {
        return $this->description;
    }

    public function setDescription(string $description): self
    {
        $this->description = $description;
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

    public function getCompatibilityScore(): ?int
    {
        return $this->compatibilityScore;
    }

    public function setCompatibilityScore(?int $compatibilityScore): self
    {
        $this->compatibilityScore = $compatibilityScore;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTime
    {
        return $this->updatedAt;
    }

    public function getExpiresAt(): ?\DateTime
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(?\DateTime $expiresAt): self
    {
        $this->expiresAt = $expiresAt;
        return $this;
    }
}
