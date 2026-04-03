<?php

namespace App\Entity;

use App\Enum\FeedbackStatus;
use App\Repository\FeedbackRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FeedbackRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Feedback
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: 'smallint')]
    private int $overallSatisfaction;

    #[ORM\Column(type: 'smallint')]
    private int $easeOfUse;

    #[ORM\Column(type: 'smallint')]
    private int $contentQuality;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $messagingRating = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $groupsRating = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $mentoringRating = null;

    #[ORM\Column(type: 'smallint')]
    private int $npsScore;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $comment = null;

    #[ORM\Column(type: 'string', enumType: FeedbackStatus::class)]
    private FeedbackStatus $status = FeedbackStatus::NEW;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = new \DateTime();
    }

    // --- Getters / Setters ---

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

    public function getOverallSatisfaction(): int
    {
        return $this->overallSatisfaction;
    }

    public function setOverallSatisfaction(int $overallSatisfaction): self
    {
        $this->overallSatisfaction = $overallSatisfaction;
        return $this;
    }

    public function getEaseOfUse(): int
    {
        return $this->easeOfUse;
    }

    public function setEaseOfUse(int $easeOfUse): self
    {
        $this->easeOfUse = $easeOfUse;
        return $this;
    }

    public function getContentQuality(): int
    {
        return $this->contentQuality;
    }

    public function setContentQuality(int $contentQuality): self
    {
        $this->contentQuality = $contentQuality;
        return $this;
    }

    public function getMessagingRating(): ?int
    {
        return $this->messagingRating;
    }

    public function setMessagingRating(?int $messagingRating): self
    {
        $this->messagingRating = $messagingRating;
        return $this;
    }

    public function getGroupsRating(): ?int
    {
        return $this->groupsRating;
    }

    public function setGroupsRating(?int $groupsRating): self
    {
        $this->groupsRating = $groupsRating;
        return $this;
    }

    public function getMentoringRating(): ?int
    {
        return $this->mentoringRating;
    }

    public function setMentoringRating(?int $mentoringRating): self
    {
        $this->mentoringRating = $mentoringRating;
        return $this;
    }

    public function getNpsScore(): int
    {
        return $this->npsScore;
    }

    public function setNpsScore(int $npsScore): self
    {
        $this->npsScore = $npsScore;
        return $this;
    }

    public function getComment(): ?string
    {
        return $this->comment;
    }

    public function setComment(?string $comment): self
    {
        $this->comment = $comment;
        return $this;
    }

    public function getStatus(): FeedbackStatus
    {
        return $this->status;
    }

    public function setStatus(FeedbackStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }
}
