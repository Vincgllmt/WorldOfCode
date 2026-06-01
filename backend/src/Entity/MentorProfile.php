<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\MentorProfileRepository;
use App\Enum\TeachingStyle;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: MentorProfileRepository::class)]
#[ORM\HasLifecycleCallbacks]
class MentorProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: 'boolean')]
    private bool $isAvailable = false;

    #[ORM\Column(type: 'string', enumType: TeachingStyle::class, nullable: true)]
    private ?TeachingStyle $teachingStyle = null;

    #[ORM\Column(type: 'integer')]
    private int $maxActiveMentees = 3;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $mentorBio = null;

    #[ORM\ManyToMany(targetEntity: Skill::class)]
    #[ORM\JoinTable(name: 'mentor_profile_specialties')]
    private Collection $specialties;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $averageRating = null;

    #[ORM\Column(type: 'integer')]
    private int $totalSessions = 0;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $reliabilityRate = null;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetime')]
    private \DateTime $updatedAt;

    public function __construct()
    {
        $this->specialties = new ArrayCollection();
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

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function isAvailable(): bool
    {
        return $this->isAvailable;
    }

    public function setIsAvailable(bool $isAvailable): self
    {
        $this->isAvailable = $isAvailable;
        return $this;
    }

    public function getTeachingStyle(): ?TeachingStyle
    {
        return $this->teachingStyle;
    }

    public function setTeachingStyle(?TeachingStyle $teachingStyle): self
    {
        $this->teachingStyle = $teachingStyle;
        return $this;
    }

    public function getMaxActiveMentees(): int
    {
        return $this->maxActiveMentees;
    }

    public function setMaxActiveMentees(int $maxActiveMentees): self
    {
        $this->maxActiveMentees = $maxActiveMentees;
        return $this;
    }

    public function getMentorBio(): ?string
    {
        return $this->mentorBio;
    }

    public function setMentorBio(?string $mentorBio): self
    {
        $this->mentorBio = $mentorBio;
        return $this;
    }

    public function getSpecialties(): Collection
    {
        return $this->specialties;
    }

    public function addSpecialty(Skill $skill): self
    {
        if (!$this->specialties->contains($skill)) {
            $this->specialties->add($skill);
        }
        return $this;
    }

    public function removeSpecialty(Skill $skill): self
    {
        $this->specialties->removeElement($skill);
        return $this;
    }

    public function getAverageRating(): ?float
    {
        return $this->averageRating;
    }

    public function setAverageRating(?float $averageRating): self
    {
        $this->averageRating = $averageRating;
        return $this;
    }

    public function getTotalSessions(): int
    {
        return $this->totalSessions;
    }

    public function setTotalSessions(int $totalSessions): self
    {
        $this->totalSessions = $totalSessions;
        return $this;
    }

    public function getReliabilityRate(): ?float
    {
        return $this->reliabilityRate;
    }

    public function setReliabilityRate(?float $reliabilityRate): self
    {
        $this->reliabilityRate = $reliabilityRate;
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
}
