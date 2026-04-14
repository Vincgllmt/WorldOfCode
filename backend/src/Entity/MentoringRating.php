<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\MentoringRatingRepository;

#[ORM\Entity(repositoryClass: MentoringRatingRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_session_rater', columns: ['session_id', 'rater_id'])]
#[ORM\HasLifecycleCallbacks]
class MentoringRating
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: MentoringSession::class, inversedBy: 'ratings')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MentoringSession $session;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $rater;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $ratee;

    #[ORM\Column(type: 'smallint')]
    private int $score;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $comment = null;

    #[ORM\Column(name: 'submitted_at', type: 'datetime', nullable: true)]
    private ?\DateTime $submittedAt = null;

    #[ORM\Column(name: 'is_visible', type: 'boolean')]
    private bool $isVisible = false;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSession(): MentoringSession
    {
        return $this->session;
    }

    public function setSession(MentoringSession $session): self
    {
        $this->session = $session;
        return $this;
    }

    public function getRater(): User
    {
        return $this->rater;
    }

    public function setRater(User $rater): self
    {
        $this->rater = $rater;
        return $this;
    }

    public function getRatee(): User
    {
        return $this->ratee;
    }

    public function setRatee(User $ratee): self
    {
        $this->ratee = $ratee;
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

    public function getComment(): ?string
    {
        return $this->comment;
    }

    public function setComment(?string $comment): self
    {
        $this->comment = $comment;
        return $this;
    }

    public function getSubmittedAt(): ?\DateTime
    {
        return $this->submittedAt;
    }

    public function setSubmittedAt(?\DateTime $submittedAt): self
    {
        $this->submittedAt = $submittedAt;
        return $this;
    }

    public function isVisible(): bool
    {
        return $this->isVisible;
    }

    public function setIsVisible(bool $isVisible): self
    {
        $this->isVisible = $isVisible;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }
}
