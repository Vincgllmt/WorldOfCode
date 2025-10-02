<?php

namespace App\Entity\Messaging;

use App\Entity\User;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: "msg_message_reads")]
class MessageRead
{
    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: Message::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: "CASCADE")]
    private Message $message;

    #[ORM\Id]
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: "CASCADE")]
    private User $user;

    #[ORM\Column(type: "datetime_immutable")]
    private \DateTimeImmutable $readAt;

    public function __construct(Message $message, User $user)
    {
        $this->message = $message;
        $this->user = $user;
        $this->readAt = new \DateTimeImmutable();
    }

    public function getMessage(): Message
    {
        return $this->message;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getReadAt(): \DateTimeImmutable
    {
        return $this->readAt;
    }
}
