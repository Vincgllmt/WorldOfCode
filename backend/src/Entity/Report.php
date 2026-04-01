<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\ReportRepository;
use App\Enum\ReportStatus;

#[ORM\Entity(repositoryClass: ReportRepository::class)]
#[ORM\Table(name: 'reports')]
class Report
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne(targetEntity: Post::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Post $post = null;

    #[ORM\Column(type: 'string', length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\Column(type: 'string', enumType: ReportStatus::class, options: ['default' => 'PENDING'])]
    private ReportStatus $status = ReportStatus::PENDING;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $claimedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTime $claimedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $resolvedBy = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTime $resolvedAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $resolutionNote = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getPost(): ?Post
    {
        return $this->post;
    }

    public function setPost(?Post $post): self
    {
        $this->post = $post;
        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): self
    {
        $this->reason = $reason;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function getStatus(): ReportStatus
    {
        return $this->status;
    }

    public function setStatus(ReportStatus $status): self
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

    public function getClaimedAt(): ?\DateTime
    {
        return $this->claimedAt;
    }

    public function setClaimedAt(?\DateTime $claimedAt): self
    {
        $this->claimedAt = $claimedAt;
        return $this;
    }

    public function getResolvedBy(): ?User
    {
        return $this->resolvedBy;
    }

    public function setResolvedBy(?User $resolvedBy): self
    {
        $this->resolvedBy = $resolvedBy;
        return $this;
    }

    public function getResolvedAt(): ?\DateTime
    {
        return $this->resolvedAt;
    }

    public function setResolvedAt(?\DateTime $resolvedAt): self
    {
        $this->resolvedAt = $resolvedAt;
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
}
