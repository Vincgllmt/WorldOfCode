<?php

namespace App\Entity;

use App\Enum\SuggestionStatus;
use App\Repository\GroupSuggestionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GroupSuggestionRepository::class)]
#[ORM\Table(name: 'group_suggestion')]
class GroupSuggestion
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $suggestedBy;

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $rssFeedUrl = null;

    #[ORM\Column(type: 'string', length: 50, enumType: SuggestionStatus::class)]
    private SuggestionStatus $status = SuggestionStatus::PENDING;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $claimedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $claimedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $approvedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $approvedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $rejectedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $rejectedAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $resolutionNote = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->status    = SuggestionStatus::PENDING;
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSuggestedBy(): User
    {
        return $this->suggestedBy;
    }

    public function setSuggestedBy(User $suggestedBy): self
    {
        $this->suggestedBy = $suggestedBy;
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

    public function getRssFeedUrl(): ?string
    {
        return $this->rssFeedUrl;
    }

    public function setRssFeedUrl(?string $rssFeedUrl): self
    {
        $this->rssFeedUrl = $rssFeedUrl;
        return $this;
    }

    public function getStatus(): SuggestionStatus
    {
        return $this->status;
    }

    public function setStatus(SuggestionStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getClaimedBy(): ?User
    {
        return $this->claimedBy;
    }

    public function setClaimedBy(?User $claimedBy): self
    {
        $this->claimedBy = $claimedBy;
        return $this;
    }

    public function getClaimedAt(): ?\DateTimeInterface
    {
        return $this->claimedAt;
    }

    public function setClaimedAt(?\DateTimeInterface $claimedAt): self
    {
        $this->claimedAt = $claimedAt;
        return $this;
    }

    public function getApprovedBy(): ?User
    {
        return $this->approvedBy;
    }

    public function setApprovedBy(?User $approvedBy): self
    {
        $this->approvedBy = $approvedBy;
        return $this;
    }

    public function getApprovedAt(): ?\DateTimeInterface
    {
        return $this->approvedAt;
    }

    public function setApprovedAt(?\DateTimeInterface $approvedAt): self
    {
        $this->approvedAt = $approvedAt;
        return $this;
    }

    public function getRejectedBy(): ?User
    {
        return $this->rejectedBy;
    }

    public function setRejectedBy(?User $rejectedBy): self
    {
        $this->rejectedBy = $rejectedBy;
        return $this;
    }

    public function getRejectedAt(): ?\DateTimeInterface
    {
        return $this->rejectedAt;
    }

    public function setRejectedAt(?\DateTimeInterface $rejectedAt): self
    {
        $this->rejectedAt = $rejectedAt;
        return $this;
    }

    public function getResolutionNote(): ?string
    {
        return $this->resolutionNote;
    }

    public function setResolutionNote(?string $resolutionNote): self
    {
        $this->resolutionNote = $resolutionNote;
        return $this;
    }

    public function getCreatedAt(): \DateTimeInterface
    {
        return $this->createdAt;
    }
}
