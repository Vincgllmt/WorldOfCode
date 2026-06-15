<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'user_badge')]
#[ORM\UniqueConstraint(name: 'UNIQ_user_badge_user_badge', columns: ['user_id', 'badge_id'])]
class UserBadge
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    // Référence scalaire vers user.id (entité User non mappée côté Code Arena).
    #[ORM\Column(name: 'user_id')]
    private int $userId;

    #[ORM\ManyToOne(targetEntity: Badge::class)]
    #[ORM\JoinColumn(name: 'badge_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Badge $badge;

    #[ORM\Column(name: 'awarded_at', type: 'datetime')]
    private \DateTime $awardedAt;

    public function __construct()
    {
        $this->awardedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUserId(): int
    {
        return $this->userId;
    }

    public function setUserId(int $userId): self
    {
        $this->userId = $userId;

        return $this;
    }

    public function getBadge(): Badge
    {
        return $this->badge;
    }

    public function setBadge(Badge $badge): self
    {
        $this->badge = $badge;

        return $this;
    }

    public function getAwardedAt(): \DateTime
    {
        return $this->awardedAt;
    }
}
