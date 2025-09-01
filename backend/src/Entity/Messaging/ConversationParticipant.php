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
    #[ORM\ManyToOne(targetEntity: Conversation::class)]
    #[ORM\JoinColumn(name: "conversation_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    public Conversation $conversation;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "user_id", referencedColumnName: "id", nullable: false, onDelete: "CASCADE")]
    public User $user;

    #[ORM\Column(type: "string", length: 16, options: ["default" => "member"])]
    public string $role = 'member'; // 'member' | 'admin'

    #[ORM\Column(name: "joined_at", type: "datetime_immutable")]
    public DateTimeImmutable $joinedAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->joinedAt ??= new DateTimeImmutable();
    }
}
