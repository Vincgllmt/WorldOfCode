<?php

namespace App\Entity\Messaging;

use App\Entity\User;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity]
#[ORM\Table(name: "msg_messages")]
#[ORM\Index(name: "idx_msg_conv_created", columns: ["conversation_id", "created_at"])]
#[ORM\HasLifecycleCallbacks]
class Message
{
    #[ORM\Id]
    #[ORM\Column(type: "string", length: 36)]
    public string $id;

    #[ORM\ManyToOne(targetEntity: Conversation::class)]
    #[ORM\JoinColumn(name: "conversation_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    public Conversation $conversation;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "sender_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    public User $sender;

    #[ORM\Column(type: "text")]
    public string $body;

    #[ORM\Column(type: "string", length: 16, options: ["default" => "text"])]
    public string $type = 'text'; // 'text' | 'image' | 'file' | ...

    #[ORM\Column(name: "created_at", type: "datetime_immutable")]
    public DateTimeImmutable $createdAt;

    #[ORM\Column(name: "edited_at", type: "datetime_immutable", nullable: true)]
    public ?DateTimeImmutable $editedAt = null;

    #[ORM\Column(name: "deleted_at", type: "datetime_immutable", nullable: true)]
    public ?DateTimeImmutable $deletedAt = null;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt ??= new DateTimeImmutable();
    }

    // --- Getters ---
    public function getId(): string
    {
        return $this->id;
    }

    public function getConversation(): Conversation
    {
        return $this->conversation;
    }

    public function getSender(): User
    {
        return $this->sender;
    }

    public function getBody(): string
    {
        return $this->body;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getEditedAt(): ?DateTimeImmutable
    {
        return $this->editedAt;
    }

    public function getDeletedAt(): ?DateTimeImmutable
    {
        return $this->deletedAt;
    }

    // --- Setters ---
    public function setId(string $id): self
    {
        $this->id = $id;
        return $this;
    }

    public function setConversation(Conversation $conversation): self
    {
        $this->conversation = $conversation;
        return $this;
    }

    public function setSender(User $sender): self
    {
        $this->sender = $sender;
        return $this;
    }

    public function setBody(string $body): self
    {
        $this->body = $body;
        return $this;
    }

    public function setType(string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function setEditedAt(?DateTimeImmutable $editedAt): self
    {
        $this->editedAt = $editedAt;
        return $this;
    }

    public function setDeletedAt(?DateTimeImmutable $deletedAt): self
    {
        $this->deletedAt = $deletedAt;
        return $this;
    }
}
