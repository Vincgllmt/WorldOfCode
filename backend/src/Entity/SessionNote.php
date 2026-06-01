<?php

namespace App\Entity;

use App\Repository\SessionNoteRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SessionNoteRepository::class)]
#[ORM\HasLifecycleCallbacks]
class SessionNote
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: MentoringSession::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private MentoringSession $session;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $author;

    #[ORM\Column(type: 'text')]
    private string $content;

    // 'note' or 'link'
    #[ORM\Column(type: 'string', length: 20)]
    private string $type = 'note';

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

    public function getAuthor(): User { return $this->author; }
    public function setAuthor(User $author): self { $this->author = $author; return $this; }

    public function getContent(): string { return $this->content; }
    public function setContent(string $content): self { $this->content = $content; return $this; }

    public function getType(): string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }

    public function getCreatedAt(): \DateTime { return $this->createdAt; }
}
