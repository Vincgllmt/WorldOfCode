<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Enum\NotificationType;
use App\Repository\NotificationRepository;

#[ORM\Entity(repositoryClass: NotificationRepository::class)]
#[ORM\Table(name: 'notification')]
#[ORM\Index(columns: ['recipient_id', 'is_read', 'created_at'], name: 'idx_notif_recipient_read_date')]
class Notification
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: "CASCADE")]
    private User $recipient;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: "CASCADE")]
    private User $sender;

    #[ORM\Column(type: 'string', enumType: NotificationType::class)]
    private NotificationType $type;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $relatedEntityId = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $message;

    #[ORM\Column(name: 'is_read', type: 'boolean')]
    private bool $isRead = false;

    #[ORM\Column(name: 'created_at', type: 'datetime')]
    private \DateTime $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    // --- Getters/Setters ---
    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRecipient(): User
    {
        return $this->recipient;
    }
    public function setRecipient(User $user): self
    {
        $this->recipient = $user;
        return $this;
    }

    public function getSender(): User
    {
        return $this->sender;
    }
    public function setSender(User $user): self
    {
        $this->sender = $user;
        return $this;
    }

    public function getType(): NotificationType
    {
        return $this->type;
    }
    public function setType(NotificationType $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getRelatedEntityId(): ?int
    {
        return $this->relatedEntityId;
    }
    public function setRelatedEntityId(?int $id): self
    {
        $this->relatedEntityId = $id;
        return $this;
    }

    public function getMessage(): string
    {
        return $this->message;
    }
    public function setMessage(string $message): self
    {
        $this->message = $message;
        return $this;
    }

    public function getIsRead(): bool
    {
        return $this->isRead;
    }
    public function setIsRead(bool $isRead): self
    {
        $this->isRead = $isRead;
        return $this;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }
}
