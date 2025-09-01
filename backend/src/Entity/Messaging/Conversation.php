<?php

namespace App\Entity\Messaging;

use Doctrine\ORM\Mapping as ORM;
use DateTimeImmutable;

#[ORM\Entity]
#[ORM\Table(name: "msg_conversations")]
#[ORM\HasLifecycleCallbacks]
class Conversation
{

    #[ORM\Id]
    #[ORM\Column(type: "string", length: 36)]
    public string $id;

    // 'direct' | 'group'
    #[ORM\Column(type: "string", length: 16)]
    public string $type;

    #[ORM\Column(type: "string", length: 255, nullable: true)]
    public ?string $title = null;

    #[ORM\Column(name: "created_at", type: "datetime_immutable")]
    public DateTimeImmutable $createdAt;

    #[ORM\PrePersist]
    public function onCreate(): void
    {
        $this->createdAt ??= new DateTimeImmutable();
    }
}
