<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'challenge')]
class Challenge
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100, unique: true)]
    private string $slug;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(type: 'text')]
    private string $statement;

    #[ORM\Column(length: 20)]
    private string $difficulty;

    /** @var string[] */
    #[ORM\Column(type: 'json')]
    private array $languages = [];

    #[ORM\Column(name: 'max_score')]
    private int $maxScore = 100;

    // URL de couverture optionnelle, affichée sur la carte du défi.
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $image = null;

    // Referee du jeu : code exécuté dans Piston qui juge la sortie joueur et produit le replay.
    #[ORM\Column(name: 'referee_code', type: 'text', nullable: true)]
    private ?string $refereeCode = null;

    #[ORM\Column(name: 'referee_language', length: 20, nullable: true)]
    private ?string $refereeLanguage = null;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    #[ORM\Column(name: 'updated_at', type: 'datetime')]
    private \DateTime $updatedAt;

    /** @var Collection<int, ChallengeTest> */
    #[ORM\OneToMany(targetEntity: ChallengeTest::class, mappedBy: 'challenge')]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $tests;

    /** @var Collection<int, Badge> */
    #[ORM\OneToMany(targetEntity: Badge::class, mappedBy: 'challenge')]
    private Collection $badges;

    /** @var Collection<int, ChallengeSolution> */
    #[ORM\OneToMany(targetEntity: ChallengeSolution::class, mappedBy: 'challenge')]
    #[ORM\OrderBy(['language' => 'ASC'])]
    private Collection $solutions;

    public function __construct()
    {
        $this->tests = new ArrayCollection();
        $this->badges = new ArrayCollection();
        $this->solutions = new ArrayCollection();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): self
    {
        $this->slug = $slug;

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

    public function getStatement(): string
    {
        return $this->statement;
    }

    public function setStatement(string $statement): self
    {
        $this->statement = $statement;

        return $this;
    }

    public function getDifficulty(): string
    {
        return $this->difficulty;
    }

    public function setDifficulty(string $difficulty): self
    {
        $this->difficulty = $difficulty;

        return $this;
    }

    /** @return string[] */
    public function getLanguages(): array
    {
        return $this->languages;
    }

    /** @param string[] $languages */
    public function setLanguages(array $languages): self
    {
        $this->languages = $languages;

        return $this;
    }

    public function getMaxScore(): int
    {
        return $this->maxScore;
    }

    public function setMaxScore(int $maxScore): self
    {
        $this->maxScore = $maxScore;

        return $this;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): self
    {
        $this->image = $image;

        return $this;
    }

    public function getRefereeCode(): ?string
    {
        return $this->refereeCode;
    }

    public function setRefereeCode(?string $refereeCode): self
    {
        $this->refereeCode = $refereeCode;

        return $this;
    }

    public function getRefereeLanguage(): ?string
    {
        return $this->refereeLanguage;
    }

    public function setRefereeLanguage(?string $refereeLanguage): self
    {
        $this->refereeLanguage = $refereeLanguage;

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

    public function setUpdatedAt(\DateTime $updatedAt): self
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }

    /** @return Collection<int, ChallengeTest> */
    public function getTests(): Collection
    {
        return $this->tests;
    }

    /** @return Collection<int, Badge> */
    public function getBadges(): Collection
    {
        return $this->badges;
    }

    /** @return Collection<int, ChallengeSolution> */
    public function getSolutions(): Collection
    {
        return $this->solutions;
    }
}
