<?php

namespace App\Entity\Messaging;

use App\Entity\User;
use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity]
#[ORM\Table(
    name: "msg_messages",
    indexes: [
        new ORM\Index(name: "idx_msg_conv_created", columns: ["conversation_id", "created_at"])
    ]
)]
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
}
