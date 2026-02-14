<?php

namespace App\Entity\Messaging;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\HasLifecycleCallbacks]
#[ORM\Entity]
#[ORM\Table(name: "msg_conversations")]
class Conversation
{
    #[ORM\Id]
    #[ORM\Column(type: "string", length: 36)]
    private string $id;

    // 'direct' | 'group'
    #[ORM\Column(type: "string", length: 16)]
    private string $type;

    #[ORM\Column(type: "string", length: 255, nullable: true)]
    private ?string $title = null;

    #[ORM\Column(name: "created_at", type: "datetime_immutable")]
    private DateTimeImmutable $createdAt;

    #[ORM\Column(name: "last_message_at", type: "datetime_immutable", nullable: true)]
    private ?DateTimeImmutable $lastMessageAt = null;

    #[ORM\OneToMany(
        mappedBy: "conversation",
        targetEntity: ConversationParticipant::class,
        cascade: ["persist", "remove"],
        orphanRemoval: true
    )]
    private Collection $participants;

    #[ORM\OneToMany(
        mappedBy: "conversation",
        targetEntity: Message::class,
        cascade: ["persist", "remove"],
        orphanRemoval: true
    )]
    private Collection $messages;

    public function __construct()
    {
        $this->participants = new ArrayCollection();
        $this->messages = new ArrayCollection();
    }

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt ??= new DateTimeImmutable();
    }

    // -------------------
    // Getters / Setters
    // -------------------

    public function getId(): string
    {
        return $this->id;
    }

    public function setId(string $id): self
    {
        $this->id = $id;
        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(?string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastMessageAt(): ?DateTimeImmutable
    {
        return $this->lastMessageAt;
    }

    public function setLastMessageAt(?DateTimeImmutable $lastMessageAt): self
    {
        $this->lastMessageAt = $lastMessageAt;
        return $this;
    }

    /**
     * @return Collection<int, ConversationParticipant>
     */
    public function getParticipants(): Collection
    {
        return $this->participants;
    }
    public function addParticipant(ConversationParticipant $participant): self
    {
        if (!$this->participants->contains($participant)) {
            $this->participants->add($participant);
            $participant->setConversation($this);
        }
        return $this;
    }

    public function removeParticipant(ConversationParticipant $participant): self
    {
        if ($this->participants->removeElement($participant)) {
            if ($participant->getConversation() === $this) {
                $participant->setConversation($this);
            }
        }
        return $this;
    }


    /**
     * @return Collection<int, Message>
     */
    public function getMessages(): Collection
    {
        return $this->messages;
    }

    public function addMessage(Message $message): self
    {
        if (!$this->messages->contains($message)) {
            $this->messages[] = $message;
        }
        return $this;
    }

    public function removeMessage(Message $message): self
    {
        $this->messages->removeElement($message);
        return $this;
    }
}
