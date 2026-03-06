<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity()]
#[ORM\Table(
    uniqueConstraints: [new ORM\UniqueConstraint(name: 'unique_item_url', columns: ['url'])]
)]
class TechWatchItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\ManyToOne(targetEntity: TechWatchSource::class, inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false)]
    private TechWatchSource $source;

    #[ORM\Column(type: 'string', length: 500)]
    private string $title;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: 'string', length: 500)]
    private string $url;

    #[ORM\Column(type: 'string', length: 1000, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $publishedAt = null;

    #[ORM\Column(type: 'datetime')]
    private \DateTimeInterface $fetchedAt;

    public function __construct()
    {
        $this->fetchedAt = new \DateTime();
    }

    public function getId(): int { return $this->id; }

    public function getSource(): TechWatchSource { return $this->source; }
    public function setSource(TechWatchSource $source): self { $this->source = $source; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): self { $this->title = $title; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }

    public function getUrl(): string { return $this->url; }
    public function setUrl(string $url): self { $this->url = $url; return $this; }

    public function getImageUrl(): ?string { return $this->imageUrl; }
    public function setImageUrl(?string $imageUrl): self { $this->imageUrl = $imageUrl; return $this; }

    public function getPublishedAt(): ?\DateTimeInterface { return $this->publishedAt; }
    public function setPublishedAt(?\DateTimeInterface $publishedAt): self { $this->publishedAt = $publishedAt; return $this; }

    public function getFetchedAt(): \DateTimeInterface { return $this->fetchedAt; }
}
