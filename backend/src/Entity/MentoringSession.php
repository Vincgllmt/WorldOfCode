<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\MentoringSessionRepository;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: MentoringSessionRepository::class)]
#[ORM\HasLifecycleCallbacks]
class MentoringSession
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: MentorProfile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MentorProfile $mentor;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $junior;

    #[ORM\ManyToOne(targetEntity: MentoringRequest::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?MentoringRequest $request = null;

    #[ORM\Column(type: 'string', enumType: MentoringSessionStatus::class)]
    private MentoringSessionStatus $status = MentoringSessionStatus::SCHEDULED;

    #[ORM\Column(name: 'scheduled_at', type: 'datetime', nullable: true)]
    private ?\DateTime $scheduledAt = null;

    #[ORM\Column(name: 'started_at', type: 'datetime', nullable: true)]
    private ?\DateTime $startedAt = null;

    #[ORM\Column(name: 'completed_at', type: 'datetime', nullable: true)]
    private ?\DateTime $completedAt = null;

    #[ORM\Column(type: 'string', enumType: SessionFormat::class)]
    private SessionFormat $format = SessionFormat::TEXT;

    #[ORM\Column(name: 'conversation_id', type: 'string', length: 255, nullable: true)]
    private ?string $conversationId = null;

    #[ORM\OneToMany(targetEntity: MentoringRating::class, mappedBy: 'session')]
    private Collection $ratings;

    #[ORM\OneToMany(targetEntity: SessionAppointment::class, mappedBy: 'session', cascade: ['persist', 'remove'])]
    #[ORM\OrderBy(['scheduledAt' => 'ASC'])]
    private Collection $appointments;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetime')]
    private \DateTime $updatedAt;

    public function __construct()
    {
        $this->ratings = new ArrayCollection();
        $this->appointments = new ArrayCollection();
    }

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = $this->updatedAt = new \DateTime();
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

    public function getMentor(): MentorProfile
    {
        return $this->mentor;
    }

    public function setMentor(MentorProfile $mentor): self
    {
        $this->mentor = $mentor;
        return $this;
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

    public function getRequest(): ?MentoringRequest
    {
        return $this->request;
    }

    public function setRequest(?MentoringRequest $request): self
    {
        $this->request = $request;
        return $this;
    }

    public function getStatus(): MentoringSessionStatus
    {
        return $this->status;
    }

    public function setStatus(MentoringSessionStatus $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getScheduledAt(): ?\DateTime
    {
        return $this->scheduledAt;
    }

    public function setScheduledAt(?\DateTime $scheduledAt): self
    {
        $this->scheduledAt = $scheduledAt;
        return $this;
    }

    public function getStartedAt(): ?\DateTime
    {
        return $this->startedAt;
    }

    public function setStartedAt(?\DateTime $startedAt): self
    {
        $this->startedAt = $startedAt;
        return $this;
    }

    public function getCompletedAt(): ?\DateTime
    {
        return $this->completedAt;
    }

    public function setCompletedAt(?\DateTime $completedAt): self
    {
        $this->completedAt = $completedAt;
        return $this;
    }

    public function getFormat(): SessionFormat
    {
        return $this->format;
    }

    public function setFormat(SessionFormat $format): self
    {
        $this->format = $format;
        return $this;
    }

    public function getConversationId(): ?string
    {
        return $this->conversationId;
    }

    public function setConversationId(?string $conversationId): self
    {
        $this->conversationId = $conversationId;
        return $this;
    }

    public function getRatings(): Collection
    {
        return $this->ratings;
    }

    public function getAppointments(): Collection
    {
        return $this->appointments;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTime
    {
        return $this->updatedAt;
    }
}
