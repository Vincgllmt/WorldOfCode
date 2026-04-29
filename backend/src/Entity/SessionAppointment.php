<?php

namespace App\Entity;

use App\Enum\SessionFormat;
use App\Repository\SessionAppointmentRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SessionAppointmentRepository::class)]
#[ORM\HasLifecycleCallbacks]
class SessionAppointment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: MentoringSession::class, inversedBy: 'appointments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MentoringSession $session;

    #[ORM\Column(name: 'scheduled_at', type: 'datetime')]
    private \DateTime $scheduledAt;

    #[ORM\Column(type: 'string', enumType: SessionFormat::class)]
    private SessionFormat $format;

    #[ORM\Column(type: 'string', length: 20)]
    private string $status = 'pending';

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getSession(): MentoringSession { return $this->session; }
    public function setSession(MentoringSession $session): self { $this->session = $session; return $this; }

    public function getScheduledAt(): \DateTime { return $this->scheduledAt; }
    public function setScheduledAt(\DateTime $scheduledAt): self { $this->scheduledAt = $scheduledAt; return $this; }

    public function getFormat(): SessionFormat { return $this->format; }
    public function setFormat(SessionFormat $format): self { $this->format = $format; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }

    public function getCreatedAt(): \DateTime { return $this->createdAt; }
}
