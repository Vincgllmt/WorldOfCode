<?php

namespace App\Entity\Messaging;

use App\Entity\User;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity]
#[ORM\Table(name: "msg_conversation_participants")]
#[ORM\HasLifecycleCallbacks]
class ConversationParticipant
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Conversation::class, inversedBy: "participants")]
    #[ORM\JoinColumn(name: "conversation_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    private Conversation $conversation;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "user_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    private User $user;

    #[ORM\Column(type: "string", length: 16, options: ["default" => "member"])]
    private string $role = 'member'; // 'member' | 'admin'

    #[ORM\Column(name: "joined_at", type: "datetime_immutable")]
    private DateTimeImmutable $joinedAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->joinedAt ??= new DateTimeImmutable();
    }

    // -------------------
    // Getters / Setters
    // -------------------

    public function getConversation(): Conversation
    {
        return $this->conversation;
    }

    public function setConversation(Conversation $conversation): self
    {
        $this->conversation = $conversation;
        return $this;
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

    public function getRole(): string
    {
        return $this->role;
    }

    public function setRole(string $role): self
    {
        $this->role = $role;
        return $this;
    }

    public function getJoinedAt(): DateTimeImmutable
    {
        return $this->joinedAt;
    }

    public function setJoinedAt(DateTimeImmutable $joinedAt): self
    {
        $this->joinedAt = $joinedAt;
        return $this;
    }
}
