<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity()]
class TechWatchSource
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\ManyToOne(targetEntity: TechGroup::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private TechGroup $techGroup;

    #[ORM\Column(type: 'string', length: 500)]
    private string $feedUrl;

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $lastFetchedAt = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $createdAt;

    #[ORM\OneToMany(targetEntity: TechWatchItem::class, mappedBy: 'source', orphanRemoval: true)]
    private Collection $items;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->items = new ArrayCollection();
    }

    public function getId(): int { return $this->id; }

    public function getTechGroup(): TechGroup { return $this->techGroup; }
    public function setTechGroup(TechGroup $techGroup): self { $this->techGroup = $techGroup; return $this; }

    public function getFeedUrl(): string { return $this->feedUrl; }
    public function setFeedUrl(string $feedUrl): self { $this->feedUrl = $feedUrl; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getLastFetchedAt(): ?\DateTimeInterface { return $this->lastFetchedAt; }
    public function setLastFetchedAt(?\DateTimeInterface $lastFetchedAt): self { $this->lastFetchedAt = $lastFetchedAt; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }

    /** @return Collection<int, TechWatchItem> */
    public function getItems(): Collection { return $this->items; }
}
