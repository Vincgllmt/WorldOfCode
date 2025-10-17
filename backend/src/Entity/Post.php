<?php

namespace App\Entity;

use App\Repository\PostRepository;
use Doctrine\ORM\Mapping as ORM;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: PostRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Post
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(type: "text")]
    private string $content;

    #[ORM\Column(name: "created_at", type: "datetime")]
    private DateTime $createdAt;

    #[ORM\Column(name: "updated_at", type: "datetime", nullable: true)]
    private ?DateTime $updatedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: "posts")]
    #[ORM\JoinColumn(nullable: false)]
    private User $author;

    #[ORM\ManyToOne(targetEntity: TechGroup::class, inversedBy: "posts")]
    #[ORM\JoinColumn(nullable: false)]
    private ?TechGroup $techGroup = null;

    #[ORM\OneToMany(targetEntity: Comment::class, mappedBy: "post", orphanRemoval: true)]
    private Collection $comments;

    #[ORM\ManyToOne(targetEntity: Post::class)]
    #[ORM\JoinColumn(name: "shared_from_id", referencedColumnName: "id", nullable: true, onDelete: "SET NULL")]
    private ?Post $sharedFrom = null;


    #[ORM\OneToMany(targetEntity: Like::class, mappedBy: "post", orphanRemoval: true)]
    private Collection $likes;

    #[ORM\OneToMany(mappedBy: "sharedFrom", targetEntity: Post::class)]
    private Collection $sharedPosts;

    public function __construct()
    {
        $this->comments = new ArrayCollection();

        $this->likes = new ArrayCollection();

        $this->sharedPosts = new ArrayCollection();
    }

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt = new DateTime();
    }

    #[ORM\PreUpdate]
    public function onUpdate(): void
    {
        $this->updatedAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): self
    {
        $this->content = $content;
        return $this;
    }

    public function getCreatedAt(): ?DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?DateTime
    {
        return $this->updatedAt;
    }


    public function getAuthor(): User
    {
        return $this->author;
    }


    public function getSharedFrom(): ?Post
    {
        return $this->sharedFrom;
    }

    public function setSharedFrom(?Post $post): self
    {
        $this->sharedFrom = $post;
        return $this;
    }


    public function setAuthor(User $author): self
    {
        $this->author = $author;
        return $this;
    }

    public function getTechGroup(): TechGroup

    {
        return $this->techGroup;
    }

    public function setTechGroup(?TechGroup $techGroup): self
    {
        $this->techGroup = $techGroup;
        return $this;
    }


    public function getComments(): Collection
    {
        return $this->comments;
    }

    public function getLikes(): Collection
    {
        return $this->likes;
    }

    public function getLikesCount(): int
    {
        return $this->likes->count();
    }
    public function getSharedPosts(): Collection
    {
        return $this->sharedPosts;
    }
}
