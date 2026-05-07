<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\MentoringPinRepository;

#[ORM\Entity(repositoryClass: MentoringPinRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_mentor_request', columns: ['mentor_id', 'request_id'])]
class MentoringPin
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: MentorProfile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MentorProfile $mentor;

    #[ORM\ManyToOne(targetEntity: MentoringRequest::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MentoringRequest $request;

    #[ORM\Column(name: 'pinned_at', type: 'datetime')]
    private \DateTime $pinnedAt;

    #[ORM\Column(name: 'expires_at', type: 'datetime')]
    private \DateTime $expiresAt;

    #[ORM\Column(type: 'boolean')]
    private bool $isActive = true;

    public function __construct()
    {
        $this->pinnedAt = new \DateTime();
        $this->expiresAt = (new \DateTime())->modify('+2 hours');
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

    public function getRequest(): MentoringRequest
    {
        return $this->request;
    }

    public function setRequest(MentoringRequest $request): self
    {
        $this->request = $request;
        return $this;
    }

    public function getPinnedAt(): \DateTime
    {
        return $this->pinnedAt;
    }

    public function getExpiresAt(): \DateTime
    {
        return $this->expiresAt;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }
}
